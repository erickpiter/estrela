import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { sendToWebhook } from "@/lib/webhook";
import { settingsService } from "@/lib/settingsService";
import { startOfDay, endOfDay } from "date-fns";

// Force Contact to be any to bypass broken Supabase types
type Contact = any;

export interface DailyStats {
    totalAppointments: number;
    confirmedVisits: number;
    totalNoShows: number;
    totalSales: number;
    pendingFollowUps: number;
    sentFollowUps: number;
    dailyGoal: number;
    attendantPerformance: { [key: string]: { visits: number; sales: number } };
}

interface StorePanelContextData {
    loading: boolean;
    todayAppointments: Contact[];
    pendingNoShows: Contact[];
    dailyStats: DailyStats;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    markAsVisited: (contactId: number, options?: { source?: string }) => Promise<void>;
    markAsNoShow: (contactId: number, options?: { source?: string }) => Promise<void>;
    sendFollowUp: (contactId: number) => Promise<void>;
    rescheduleAppointment: (contactId: number) => Promise<void>;
    markFollowUpAsReturned: (contactId: number) => Promise<void>;
    markAsPurchased: (contactId: number) => Promise<void>;
    updateContact: (contactId: number, updates: any) => Promise<void>;
    loadTodayAppointments: (dateOverride?: Date) => Promise<void>;
}

const StorePanelContext = createContext<StorePanelContextData | undefined>(undefined);

export function StorePanelProvider({ children }: { children: ReactNode }) {
    const [loading, setLoading] = useState(true);
    // Explicitly type state as any[] to avoid 'never[]' inference
    const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
    const [pendingNoShows, setPendingNoShows] = useState<any[]>([]);
    const [dailyStats, setDailyStats] = useState<DailyStats>({
        totalAppointments: 0,
        confirmedVisits: 0,
        totalNoShows: 0,
        totalSales: 0,
        pendingFollowUps: 0,
        sentFollowUps: 0,
        dailyGoal: parseInt(localStorage.getItem('mini_painel_daily_goal') || import.meta.env.VITE_DAILY_VISIT_GOAL || "20"),
        attendantPerformance: {}
    });

    const { toast } = useToast();

    // State for selected date
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const getQueryDateRange = (date: Date) => {
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        return { start, end };
    };

    const loadTodayAppointments = async (dateOverride?: Date) => {
        try {
            const targetDate = dateOverride || selectedDate;
            const { start, end } = getQueryDateRange(targetDate);

            console.log(`[Loading Appointments] Range: ${start} - ${end}`);

            // Cast to any to bypass 'never' type inference
            const { data, error } = await (supabase.from('contacts') as any)
                .select('*')
                .gte('data_agendamento', start)
                .lte('data_agendamento', end)
                .neq('status_visita', 'no_show')
                .not('tags', 'ilike', 'follow_up%')
                .order('data_agendamento', { ascending: true });

            if (error) throw error;
            setTodayAppointments(data || []);
        } catch (error) {
            console.error('Error loading appointments:', error);
            toast({ title: "Erro ao carregar agendamentos", variant: "destructive" });
        }
    };

    const loadPendingNoShows = async () => {
        try {
            const { data, error } = await (supabase.from('contacts') as any)
                .select('*')
                .in('tags', ['follow_up_01', 'follow_up_02', 'follow_up_03', 'follow_up_04'])
                .order('data_agendamento', { ascending: false });

            if (error) throw error;
            setPendingNoShows(data || []);
        } catch (error) {
            console.error('Error loading pending no-shows:', error);
        }
    };

    const loadDailyStats = async () => {
        try {
            const { start, end } = getQueryDateRange(selectedDate);
            console.log(`[Loading Stats] Range: ${start} - ${end}`);

            // Load appointments stats (Scheduled for today)
            const { data: appointmentsData, error: appointmentsError } = await (supabase.from('contacts') as any)
                .select('*')
                .gte('data_agendamento', start)
                .lte('data_agendamento', end);

            if (appointmentsError) throw appointmentsError;

            const appointmentsArray = (appointmentsData || []) as any[];
            console.log(`[Stats Debug] Loaded ${appointmentsArray.length} appointments for stats.`);

            const totalAppointments = appointmentsArray.filter(c =>
                c.status_visita !== 'cancelado' &&
                c.tags !== 'cancelado'
            ).length || 0;

            const confirmedVisits = appointmentsArray.filter(c => {
                const status = c.status_visita?.toLowerCase() || '';
                const tags = c.tags?.toLowerCase() || '';
                return status === 'confirmado' || tags.includes('compareceu');
            }).length || 0;

            const totalNoShows = appointmentsArray.filter(c => {
                const tags = c.tags?.toLowerCase() || '';
                const status = c.status_visita?.toLowerCase() || '';
                return ['follow_up_01', 'perdido'].some(t => tags.includes(t)) || status === 'no_show' || status === 'no-show';
            }).length || 0;

            const totalSales = appointmentsArray.filter(c => {
                const tags = c.tags?.toLowerCase() || '';
                return tags.includes('venda_realizada');
            }).length || 0;

            // Calculate Attendant Performance
            const attendantPerformance: { [key: string]: { visits: number; sales: number } } = {};
            appointmentsArray.forEach(c => {
                const status = c.status_visita?.toLowerCase() || '';
                const tags = c.tags?.toLowerCase() || '';
                const isConfirmed = status === 'confirmado' || tags.includes('compareceu');
                const isSale = tags.includes('venda_realizada');

                if (isConfirmed) {
                    const attendantName = c.Atendente || c.source || c.IG || 'Sem Atendente';
                    if (!attendantPerformance[attendantName]) {
                        attendantPerformance[attendantName] = { visits: 0, sales: 0 };
                    }
                    attendantPerformance[attendantName].visits += 1;
                    if (isSale) {
                        attendantPerformance[attendantName].sales += 1;
                    }
                }
            });

            // Load follow-ups stats (Global pending)
            const { count: pendingFollowUpsCount, error: followUpsError } = await (supabase.from('contacts') as any)
                .select('tags', { count: 'exact', head: true })
                .in('tags', ['follow_up_01', 'follow_up_02', 'follow_up_03', 'follow_up_04']);

            if (followUpsError) throw followUpsError;

            setDailyStats(prev => ({
                ...prev,
                totalAppointments,
                confirmedVisits,
                totalNoShows,
                totalSales,
                pendingFollowUps: pendingFollowUpsCount || 0,
                attendantPerformance
            }));
        } catch (error) {
            console.error('Error loading daily stats:', error);
        }
    };

    const markAsVisited = async (contactId: number, options?: { source?: string }) => {
        try {
            const { data: contact, error: fetchError } = await (supabase.from('contacts') as any)
                .select('*')
                .eq('id', contactId)
                .single();

            if (fetchError || !contact) {
                console.error("Contact not found for webhook:", contactId);
            }

            const nowISO = new Date().toISOString();

            const { error } = await (supabase.from('contacts') as any)
                .update({
                    tags: 'compareceu',
                    status_visita: 'confirmado',
                    checkin_at: nowISO,
                    ultimo_contato: nowISO
                })
                .eq('id', contactId);

            if (error) throw error;

            const webhookPayload = {
                type: 'presence_confirmed',
                contactId,
                clientName: contact?.display_name || "Cliente",
                attendant: contact?.Atendente || "Não atribuído",
                phone: contact?.phone_e164,
                ig: contact?.IG,
                checkInTime: nowISO,
                source: options?.source || 'button'
            };

            await sendToWebhook(webhookPayload);

            toast({
                title: "Presença confirmada!",
                description: "Cliente marcado como compareceu.",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            loadTodayAppointments();
            loadDailyStats();
        } catch (error) {
            console.error('Error marking as visited:', error);
            toast({
                title: "Erro ao confirmar presença",
                description: "Tente novamente.",
                variant: "destructive"
            });
        }
    };

    const markAsNoShow = async (contactId: number, options?: { source?: string }) => {
        try {
            const { data: contact } = await (supabase.from('contacts') as any)
                .select('*')
                .eq('id', contactId)
                .single();

            const reason = 'Sem contato';
            const nowISO = new Date().toISOString();

            const { error } = await (supabase.from('contacts') as any)
                .update({
                    tags: 'follow_up_01',
                    status_visita: 'no_show',
                    motivo_no_show: reason,
                    ultimo_contato: nowISO
                })
                .eq('id', contactId);

            if (error) throw error;

            await sendToWebhook({
                type: 'no_show_registered',
                contactId,
                clientName: contact?.display_name,
                attendant: contact?.Atendente,
                phone: contact?.phone_e164,
                ig: contact?.IG,
                reason,
                action: 'move_to_pending',
                source: options?.source || 'button'
            });

            toast({
                title: "No-show registrado",
                description: `Cliente movido para lista de follow-up`
            });

            loadTodayAppointments();
            loadPendingNoShows();
            loadDailyStats();
        } catch (error) {
            toast({
                title: "Erro ao registrar no-show",
                description: "Ocorreu um erro. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    const sendFollowUp = async (contactId: number) => {
        try {
            const contact = pendingNoShows.find(c => c.id === contactId);
            if (!contact) return;

            let newTag: any = 'follow_up_02';
            if (contact.tags === 'follow_up_01') newTag = 'follow_up_02';
            else if (contact.tags === 'follow_up_02') newTag = 'follow_up_03';
            else if (contact.tags === 'follow_up_03') newTag = 'follow_up_04';
            else if (contact.tags === 'follow_up_04') newTag = 'perdido';

            const { error } = await (supabase.from('contacts') as any)
                .update({
                    tags: newTag,
                    ultimo_contato: new Date().toISOString()
                })
                .eq('id', contactId);

            if (error) throw error;

            await sendToWebhook({
                type: 'follow_up_triggered',
                contactId,
                previousTag: contact.tags,
                newTag: newTag,
                clientName: contact.display_name,
                attendant: contact.Atendente,
                phone: contact.phone_e164,
                ig: contact.IG,
                contact: contact.IG ? `@${contact.IG.replace('@', '')}` : contact.phone_e164,
                status: (contact.status_visita === 'confirmado' || contact.tags?.includes('compareceu')) ? "Compareceu" : "Não compareceu"
            });

            toast({
                title: "Follow-up enviado",
                description: `Cliente atualizado para ${newTag}`
            });

            loadPendingNoShows();
            loadDailyStats();
        } catch (error) {
            toast({
                title: "Erro ao enviar follow-up",
                description: "Ocorreu um erro. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    const markFollowUpAsReturned = async (contactId: number) => {
        try {
            const { data: contact } = await (supabase.from('contacts') as any).select('*').eq('id', contactId).single();
            if (!contact) return;

            const nowISO = new Date().toISOString();

            const { error } = await (supabase.from('contacts') as any)
                .update({
                    tags: 'compareceu',
                    status_visita: 'confirmado',
                    checkin_at: nowISO,
                    ultimo_contato: nowISO,
                    data_agendamento: nowISO
                })
                .eq('id', contactId);

            if (error) throw error;

            await sendToWebhook({
                type: 'return_registered',
                contactId,
                clientName: contact.display_name,
                attendant: contact.Atendente,
                phone: contact.phone_e164,
                ig: contact.IG,
                checkInTime: nowISO,
                originalDate: contact.data_agendamento
            });

            toast({
                title: "Retorno registrado!",
                description: "Cliente marcado como compareceu.",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            setSelectedDate(new Date());

            loadPendingNoShows();
            loadTodayAppointments(new Date());
            loadDailyStats();
        } catch (error) {
            console.error('Error marking return:', error);
            toast({
                title: "Erro ao registrar retorno",
                description: "Tente novamente.",
                variant: "destructive"
            });
        }
    };

    const markAsPurchased = async (contactId: number) => {
        try {
            const { data: contact } = await (supabase.from('contacts') as any).select('*').eq('id', contactId).single();
            if (!contact) return;

            const currentTags = contact.tags || '';
            if (currentTags.includes('venda_realizada')) {
                toast({ title: "Venda já registrada para este cliente." });
                return;
            }

            const newTags = currentTags ? `${currentTags}, venda_realizada` : 'venda_realizada';

            const { error } = await (supabase.from('contacts') as any)
                .update({ tags: newTags })
                .eq('id', contactId);

            if (error) throw error;

            await sendToWebhook({
                type: 'sale_registered',
                contactId,
                clientName: contact.display_name,
                attendant: contact.Atendente,
                phone: contact.phone_e164,
                ig: contact.IG,
                value: 0,
                date: new Date().toISOString()
            });

            toast({
                title: "Venda registrada! 💰",
                description: "Parabéns pela venda!",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            loadTodayAppointments();
            loadDailyStats();
        } catch (error) {
            console.error('Error marking purchase:', error);
            toast({ title: "Erro ao registrar venda", variant: "destructive" });
        }
    };

    const updateContact = async (contactId: number, updates: any) => {
        try {
            const { error } = await (supabase.from('contacts') as any)
                .update(updates)
                .eq('id', contactId);

            if (error) throw error;

            toast({
                title: "Contato atualizado",
                description: "As informações foram salvas com sucesso.",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            // Optimistic update or refresh
            loadTodayAppointments(); // Refresh list to show changes
            loadDailyStats(); // Refresh stats in case status/sales changed
        } catch (error) {
            console.error('Error updating contact:', error);
            toast({
                title: "Erro ao atualizar",
                description: "Não foi possível salvar as alterações. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    const rescheduleAppointment = async (_contactId: number) => {
        toast({
            title: "Funcionalidade em desenvolvimento",
            description: "O reagendamento será implementado em breve"
        });
    };

    // Effect to load data when date changes
    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            await Promise.all([
                loadTodayAppointments(),
                loadPendingNoShows(),
                loadDailyStats()
            ]);
            setLoading(false);
        };

        loadAllData();

        const contactsSubscription = supabase
            .channel('contacts_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
                loadTodayAppointments();
                loadPendingNoShows();
                loadDailyStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(contactsSubscription);
        };
    }, [selectedDate]);

    // Auto No-Show Detection
    useEffect(() => {
        const checkAndAutoMarkNoShows = async () => {
            if (loading || todayAppointments.length === 0) return;

            const now = new Date();
            const TOLERANCE_MINUTES = 30;

            const overdueAppointments = todayAppointments.filter(appointment => {
                if (appointment.status_visita === 'confirmado' ||
                    appointment.status_visita === 'no_show' ||
                    appointment.status_visita === 'cancelado' ||
                    appointment.tags === 'compareceu' ||
                    appointment.tags?.startsWith('follow_up_')) {
                    return false;
                }

                if (!appointment.data_agendamento) return false;
                const appointmentTime = new Date(appointment.data_agendamento);
                const diffMs = now.getTime() - appointmentTime.getTime();
                return (diffMs / (1000 * 60)) > TOLERANCE_MINUTES;
            });

            if (overdueAppointments.length === 0) return;

            console.log(`[Auto-NoShow] Found ${overdueAppointments.length} overdue appointments. Processing...`);

            for (const apt of overdueAppointments) {
                await markAsNoShow(apt.id);
            }
        };

        checkAndAutoMarkNoShows();
        const intervalId = setInterval(checkAndAutoMarkNoShows, 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [todayAppointments, loading]);

    // Fetch settings and auto-refresh
    useEffect(() => {
        const fetchRemoteSettings = async () => {
            const goal = await settingsService.getSetting('mini_painel_daily_goal', import.meta.env.VITE_DAILY_VISIT_GOAL || "20");
            setDailyStats(prev => ({
                ...prev,
                dailyGoal: parseInt(goal)
            }));
        };
        fetchRemoteSettings();

        // Auto-refresh every 5 minutes
        const refreshInterval = setInterval(() => {
            console.log("Auto-refreshing data...");
            loadTodayAppointments();
            loadPendingNoShows();
            loadDailyStats();
        }, 5 * 60 * 1000);

        return () => clearInterval(refreshInterval);
    }, [selectedDate]);

    const providerValue = {
        loading,
        todayAppointments,
        pendingNoShows,
        dailyStats,
        selectedDate,
        setSelectedDate,
        markAsVisited,
        markAsNoShow,
        sendFollowUp,
        rescheduleAppointment,
        markFollowUpAsReturned,
        markAsPurchased,
        updateContact,
        loadTodayAppointments
    };

    const ContextProvider = StorePanelContext.Provider;

    return (
        <ContextProvider value={providerValue}>
            {children}
        </ContextProvider>
    );
}

export function useStorePanelData() {
    const context = useContext(StorePanelContext);
    if (context === undefined) {
        throw new Error('useStorePanelData must be used within a StorePanelProvider');
    }
    return context;
}
