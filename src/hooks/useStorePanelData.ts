import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types";
import { sendToWebhook } from "@/lib/webhook";
import { settingsService } from "@/lib/settingsService";
import { startOfDay, endOfDay, format } from "date-fns";

type Contact = Database['public']['Tables']['contacts']['Row'];

export interface DailyStats {
    totalAppointments: number;
    confirmedVisits: number;
    totalNoShows: number;
    pendingFollowUps: number;
    sentFollowUps: number;
    dailyGoal: number;
    attendantPerformance: { [key: string]: number };
}

export function useStorePanelData() {
    const [loading, setLoading] = useState(true);
    const [todayAppointments, setTodayAppointments] = useState<Contact[]>([]);
    const [pendingNoShows, setPendingNoShows] = useState<Contact[]>([]);
    const [dailyStats, setDailyStats] = useState<DailyStats>({
        totalAppointments: 0,
        confirmedVisits: 0,
        totalNoShows: 0,
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

            const { data, error } = await supabase
                .from('contacts')
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
            const { data, error } = await supabase
                .from('contacts')
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
            // Selecting more fields to ensure we have data for logic
            const { data: appointmentsData, error: appointmentsError } = await supabase
                .from('contacts')
                .select('*') // Getting all fields avoids missing columns issues
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
                return ['follow_up_01', 'perdido'].some(t => tags.includes(t));
            }).length || 0;

            // Calculate Attendant Performance
            const attendantPerformance: { [key: string]: number } = {};
            appointmentsArray.forEach(c => {
                const status = c.status_visita?.toLowerCase() || '';
                const tags = c.tags?.toLowerCase() || '';
                const isConfirmed = status === 'confirmado' || tags.includes('compareceu');

                if (isConfirmed) {
                    const attendantName = c.Atendente || c.source || c.IG || 'Sem Atendente';
                    attendantPerformance[attendantName] = (attendantPerformance[attendantName] || 0) + 1;
                }
            });

            // Load follow-ups stats (Global pending, not just for today)
            const { count: pendingFollowUpsCount, error: followUpsError } = await supabase
                .from('contacts')
                .select('tags', { count: 'exact', head: true })
                .in('tags', ['follow_up_01', 'follow_up_02', 'follow_up_03', 'follow_up_04']);

            if (followUpsError) throw followUpsError;

            setDailyStats(prev => ({
                ...prev,
                totalAppointments,
                confirmedVisits,
                totalNoShows,
                pendingFollowUps: pendingFollowUpsCount || 0,
                attendantPerformance
            }));
        } catch (error) {
            console.error('Error loading daily stats:', error);
        }
    };

    const markAsVisited = async (contactId: number) => {
        try {
            // Fetch fresh contact data to ensure we have name/attendant for webhook
            const { data: contact, error: fetchError } = await supabase
                .from('contacts')
                .select('*')
                .eq('id', contactId)
                .single();

            if (fetchError || !contact) {
                console.error("Contact not found for webhook:", contactId);
                // Fallback to local state if fetch fails (unlikely)
            }

            const nowISO = new Date().toISOString();

            const { error } = await supabase
                .from('contacts')
                .update({
                    tags: 'compareceu',
                    status_visita: 'confirmado',
                    checkin_at: nowISO,
                    ultimo_contato: nowISO
                } as any)
                .eq('id', contactId);

            if (error) throw error;

            // Send Webhook with FRESH data
            const webhookPayload = {
                type: 'presence_confirmed',
                contactId,
                clientName: contact?.display_name || "Cliente", // Default if null
                attendant: contact?.Atendente || "Não atribuído",
                phone: contact?.phone_e164,
                checkInTime: nowISO
            };

            console.log("[Webhook] Sending payload:", webhookPayload);
            await sendToWebhook(webhookPayload);

            toast({
                title: "Presença confirmada!",
                description: "Cliente marcado como compareceu.",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            // Refresh data
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

    const markAsNoShow = async (contactId: number) => {
        try {
            // Fetch fresh data
            const { data: contact } = await supabase
                .from('contacts')
                .select('*')
                .eq('id', contactId)
                .single();

            // TODO: In future, get reason from UI
            const reason = 'Sem contato';
            const nowISO = new Date().toISOString();

            const { error } = await supabase
                .from('contacts')
                .update({
                    tags: 'follow_up_01',
                    status_visita: 'no_show',
                    motivo_no_show: reason,
                    ultimo_contato: nowISO
                } as any)
                .eq('id', contactId);

            if (error) throw error;

            // Send Webhook
            await sendToWebhook({
                type: 'no_show_registered',
                contactId,
                clientName: contact?.display_name,
                attendant: contact?.Atendente,
                phone: contact?.phone_e164,
                reason,
                action: 'move_to_pending'
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

            const { error } = await supabase
                .from('contacts')
                .update({
                    tags: newTag,
                    ultimo_contato: new Date().toISOString()
                } as any)
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
            const { data: contact } = await supabase.from('contacts').select('*').eq('id', contactId).single();
            if (!contact) return;

            const nowISO = new Date().toISOString();

            const { error } = await supabase
                .from('contacts')
                .update({
                    tags: 'compareceu',
                    status_visita: 'confirmado',
                    checkin_at: nowISO,
                    ultimo_contato: nowISO,
                    data_agendamento: nowISO
                } as any)
                .eq('id', contactId);

            if (error) throw error;

            await sendToWebhook({
                type: 'return_registered',
                contactId,
                clientName: contact.display_name,
                attendant: contact.Atendente,
                phone: contact.phone_e164,
                checkInTime: nowISO,
                originalDate: contact.data_agendamento
            });

            toast({
                title: "Retorno registrado!",
                description: "Cliente marcado como compareceu.",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            loadPendingNoShows();
            loadTodayAppointments();
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

    const rescheduleAppointment = async (_contactId: number) => {
        toast({
            title: "Funcionalidade em desenvolvimento",
            description: "O reagendamento será implementado em breve"
        });
    };

    useEffect(() => {
        const fetchRemoteSettings = async () => {
            const goal = await settingsService.getSetting('mini_painel_daily_goal', import.meta.env.VITE_DAILY_VISIT_GOAL || "20");
            setDailyStats(prev => ({
                ...prev,
                dailyGoal: parseInt(goal)
            }));
        };
        fetchRemoteSettings();
    }, []);

    return {
        loading,
        todayAppointments,
        pendingNoShows,
        dailyStats,
        markAsVisited,
        markAsNoShow,
        sendFollowUp,
        rescheduleAppointment,
        markFollowUpAsReturned,
        selectedDate,
        setSelectedDate,
        loadTodayAppointments
    };
}
