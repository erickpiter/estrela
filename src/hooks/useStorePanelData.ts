import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types";
import { sendToWebhook } from "@/lib/webhook";
import { settingsService } from "@/lib/settingsService";

type Contact = Database['public']['Tables']['contacts']['Row'];

export interface DailyStats {
    totalAppointments: number;
    confirmedVisits: number;
    totalNoShows: number;
    pendingFollowUps: number;
    sentFollowUps: number;
    dailyGoal: number;
    totalSales: number;
    attendantPerformance: { [key: string]: { visits: number; sales: number } };
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
        totalSales: 0,
        attendantPerformance: {}
    });

    const { toast } = useToast();

    // State for selected date
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const loadTodayAppointments = async (dateOverride?: Date) => {
        try {
            const targetDate = dateOverride || selectedDate;
            // Use 'en-CA' for YYYY-MM-DD format which works well with DB ISO comparison
            const formattedDate = targetDate.toLocaleDateString('en-CA');

            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .gte('data_agendamento', `${formattedDate}T00:00:00`)
                .lt('data_agendamento', `${formattedDate}T23:59:59`)
                // Exclude those that are ALREADY no-show to avoid duplication in Lists if users treat them as separate queues
                // User explicitly "Continua" saying duplication exists.
                // Status 'no_show' check might miss legacy data or cases where status wasn't updated but tag was.
                // So we also explicitly exclude anyone with follow_up tags.
                .neq('status_visita', 'no_show')
                .not('tags', 'ilike', 'follow_up%')
                .order('data_agendamento', { ascending: true });

            if (error) throw error;
            setTodayAppointments(data || []);
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    };

    const loadPendingNoShows = async () => {
        try {
            const now = new Date();
            const isToday = selectedDate.toDateString() === now.toDateString();

            let query = supabase
                .from('contacts')
                .select('*')
                .in('tags', ['follow_up_01', 'follow_up_02', 'follow_up_03', 'follow_up_04']);

            if (isToday) {
                // Logic for TODAY: Show accumulated from last 5 days
                const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
                query = query.gte('data_agendamento', fiveDaysAgo);
                // And we generally want them ordered by urgency or date? keeping existing order
                query = query.order('data_agendamento', { ascending: false });
            } else {
                // Logic for PAST/FUTURE Date: Show ONLY from that specific day
                const targetDateStr = selectedDate.toLocaleDateString('en-CA');
                const startOfDay = `${targetDateStr}T00:00:00`;
                const endOfDay = `${targetDateStr}T23:59:59`;

                query = query
                    .gte('data_agendamento', startOfDay)
                    .lt('data_agendamento', endOfDay)
                    .order('data_agendamento', { ascending: true });
            }

            const { data, error } = await query;

            if (error) throw error;
            setPendingNoShows(data || []);
        } catch (error) {
            console.error('Error loading pending no-shows:', error);
        }
    };

    const loadDailyStats = async () => {
        try {
            const formattedDate = selectedDate.toLocaleDateString('en-CA');

            // Load appointments stats (Scheduled for today)
            const { data: appointmentsData, error: appointmentsError } = await supabase
                .from('contacts')
                .select('tags, Atendente, status_visita, checkin_at, source, IG')
                .gte('data_agendamento', `${formattedDate}T00:00:00`)
                .lt('data_agendamento', `${formattedDate}T23:59:59`);

            if (appointmentsError) throw appointmentsError;

            // Explicitly cast to any[]
            const appointmentsArray = (appointmentsData || []) as any[];

            const totalAppointments = appointmentsArray.filter(c =>
                c.status_visita !== 'cancelado' &&
                c.tags !== 'cancelado'
            ).length || 0;

            const confirmedVisits = appointmentsArray.filter(c =>
                c.status_visita === 'confirmado' ||
                c.tags?.includes('compareceu')
            ).length || 0;

            // Load deliveries stats
            // Querying 'scheduled_date' (DATE column) with simple equality to YYYY-MM-DD string
            const { data: deliveriesData, error: deliveriesError } = await supabase
                .from('sales_estrela')
                .select('*')
                .eq('delivery_status', 'delivered')
                .eq('scheduled_date', formattedDate);

            if (deliveriesError) throw deliveriesError;

            const deliveriesArray = (deliveriesData || []) as any[];
            console.log('DEBUG: Daily Stats Deliveries', { date: formattedDate, count: deliveriesArray.length, data: deliveriesArray });

            // Calculate Total Sales using tags (Appointments) + Deliveries
            const appointmentSales = appointmentsArray.filter(c =>
                c.tags?.includes('venda_realizada')
            ).length || 0;

            const deliverySales = deliveriesArray.length;
            const totalSales = appointmentSales + deliverySales;

            // Calculate Attendant Performance
            const attendantPerformance: { [key: string]: { visits: number; sales: number } } = {};

            // Process Appointments
            appointmentsArray.forEach(c => {
                const attendantName = c.Atendente || c.source || c.IG || 'Sem Atendente';
                if (!attendantPerformance[attendantName]) {
                    attendantPerformance[attendantName] = { visits: 0, sales: 0 };
                }

                const isConfirmed = c.status_visita === 'confirmado' || c.tags?.includes('compareceu');
                if (isConfirmed) {
                    attendantPerformance[attendantName].visits++;
                }

                if (c.tags?.includes('venda_realizada')) {
                    attendantPerformance[attendantName].sales++;
                }
            });

            // Process Deliveries
            deliveriesArray.forEach(d => {
                const attendantName = d.salesperson_name || 'Sem Atendente';
                if (!attendantPerformance[attendantName]) {
                    attendantPerformance[attendantName] = { visits: 0, sales: 0 };
                }
                // Deliveries count as sales
                attendantPerformance[attendantName].sales++;
                // Optionally count as 'visit' (confirmed interaction)? 
                // For now, keeping it strictly as sales to avoid skewing "appointment" metrics unless requested.
            });

            // Load follow-ups stats
            const { data: followUpsData, error: followUpsError } = await supabase
                .from('contacts')
                .select('tags')
                .in('tags', ['follow_up_01', 'follow_up_02', 'follow_up_03', 'follow_up_04']);

            if (followUpsError) throw followUpsError;

            const pendingFollowUps = followUpsData?.length || 0;

            setDailyStats(prev => ({
                ...prev,
                totalAppointments: totalAppointments,
                confirmedVisits: confirmedVisits,
                totalNoShows: appointmentsArray.filter(c => ['follow_up_01', 'perdido'].includes(c.tags || '')).length || 0,
                pendingFollowUps,
                totalSales,
                attendantPerformance
            }));
        } catch (error) {
            console.error('Error loading daily stats:', error);
        }
    };

    const markAsVisited = async (contactId: number) => {
        try {
            // Optimistic update
            const contact = todayAppointments.find(c => c.id === contactId);

            const { error } = await supabase
                .from('contacts')
                // @ts-ignore: Supabase type mismatch
                .update({
                    tags: 'compareceu', // Keep for backward compatibility
                    status_visita: 'confirmado',
                    checkin_at: new Date().toISOString(),
                    ultimo_contato: new Date().toISOString()
                } as any)
                .eq('id', contactId);

            if (error) throw error;

            // Send Webhook
            await sendToWebhook({
                type: 'presence_confirmed',
                contactId,
                clientName: contact?.display_name,
                attendant: contact?.Atendente,
                phone: contact?.phone_e164,
                ig: contact?.IG,
                checkInTime: new Date().toISOString()
            });

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
            const contact = todayAppointments.find(c => c.id === contactId);
            if (!contact) return;

            // TODO: In future, get reason from UI
            const reason = 'Sem contato';

            const { error } = await supabase
                .from('contacts')
                // @ts-ignore: Supabase type mismatch
                .update({
                    tags: 'follow_up_01', // Keep for compatibility
                    status_visita: 'no_show',
                    motivo_no_show: reason,
                    ultimo_contato: new Date().toISOString()
                } as any)
                .eq('id', contactId);

            if (error) throw error;

            // Send Webhook - Trigger No-Show Automation
            await sendToWebhook({
                type: 'no_show_registered',
                contactId,
                clientName: contact?.display_name,
                attendant: contact?.Atendente,
                phone: contact?.phone_e164,
                ig: contact?.IG,
                reason,
                action: 'move_to_pending'
            });

            toast({
                title: "No-show registrado",
                description: `Cliente movido para lista de follow-up`
            });

            // Refresh data
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
                // @ts-ignore: Supabase type mismatch
                .update({
                    tags: newTag,
                    ultimo_contato: new Date().toISOString()
                    // pending: update status_visita if needed (e.g. to 'cancelado' if lost)
                } as any)
                .eq('id', contactId);

            if (error) throw error;

            // Send Webhook - Trigger Follow Up Message
            await sendToWebhook({
                type: 'follow_up_triggered',
                contactId,
                previousTag: contact.tags,
                newTag: newTag,
                clientName: contact.display_name,
                attendant: contact.Atendente,
                phone: contact.phone_e164, // Keeping original for backward compatibility if needed
                ig: contact.IG,

                // Requested fields
                contact: contact.IG ? `@${contact.IG.replace('@', '')}` : contact.phone_e164,
                status: (contact.status_visita === 'confirmado' || contact.tags?.includes('compareceu')) ? "Compareceu" : "Não compareceu"
            });

            toast({
                title: "Follow-up enviado",
                description: `Cliente atualizado para ${newTag}`
            });

            // Refresh data
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
            const contact = pendingNoShows.find(c => c.id === contactId);
            if (!contact) return;

            const now = new Date(); // Local/Client time object
            const nowISO = now.toISOString();

            const { error } = await supabase
                .from('contacts')
                // @ts-ignore: Supabase type mismatch
                .update({
                    tags: 'compareceu',
                    status_visita: 'confirmado',
                    checkin_at: nowISO,
                    ultimo_contato: nowISO,
                    // Optionally update data_agendamento to count for today's stats easily
                    // If we don't, we need to adjust loadDailyStats logic.
                    // For simplicity and "it's happening today", let's update it.
                    data_agendamento: nowISO
                } as any)
                .eq('id', contactId);

            if (error) throw error;

            // Send Webhook
            await sendToWebhook({
                type: 'return_registered', // Distinct type for logic
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

            // Refresh data
            loadPendingNoShows();
            loadTodayAppointments(); // Should appear here now as confirmed
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
                loadTodayAppointments(), // Uses selectedDate state
                loadPendingNoShows(),
                loadDailyStats() // Note: DailyStats usually follows date too? User didn't ask, but likely expects it.
                // For now sticking to user request: "Agendados de Hoje" list updating.
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

        const deliveriesSubscription = supabase
            .channel('sales_estrela_dashboard_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_estrela' }, () => {
                loadDailyStats(); // Refresh stats when deliveries change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(contactsSubscription);
            supabase.removeChannel(deliveriesSubscription);
        };
    }, [selectedDate]); // Add selectedDate dependency

    // Auto No-Show Detection
    useEffect(() => {
        const checkAndAutoMarkNoShows = async () => {
            if (loading || todayAppointments.length === 0) return;

            const now = new Date();
            const TOLERANCE_MINUTES = 30;

            const overdueAppointments = todayAppointments.filter(appointment => {
                // Skip if already handled
                if (appointment.status_visita === 'confirmado' ||
                    appointment.status_visita === 'no_show' ||
                    appointment.status_visita === 'cancelado' ||
                    appointment.tags === 'compareceu' ||
                    appointment.tags?.startsWith('follow_up_')) {
                    return false;
                }

                if (!appointment.data_agendamento) return false;

                // Parse appointment time (assuming data_agendamento is ISO string)
                const appointmentTime = new Date(appointment.data_agendamento);

                // Calculate difference in minutes
                const diffMs = now.getTime() - appointmentTime.getTime();
                const diffMinutes = diffMs / (1000 * 60);

                // Check if overdue by tolerance
                return diffMinutes > TOLERANCE_MINUTES;
            });

            if (overdueAppointments.length === 0) return;

            console.log(`[Auto-NoShow] Found ${overdueAppointments.length} overdue appointments. Processing...`);

            // Process sequentially to be safe with async/await loop
            for (const apt of overdueAppointments) {
                await markAsNoShow(apt.id);
            }
        };

        // Run immediately on load/change, then schedule interval
        checkAndAutoMarkNoShows();

        const intervalId = setInterval(checkAndAutoMarkNoShows, 5 * 60 * 1000); // Check every 5 minutes

        return () => clearInterval(intervalId);
    }, [todayAppointments, loading]); // Re-run if list changes to catch updates

    // Keeping function as requested by user, even if unused in UI for now
    const rescheduleAppointment = async (_contactId: number) => {
        toast({
            title: "Funcionalidade em desenvolvimento",
            description: "O reagendamento será implementado em breve"
        });
    };

    const updateContact = async (contactId: number, updates: any) => {
        console.log('Updating contact:', contactId, updates);
        try {
            const { error } = await supabase
                .from('contacts')
                // @ts-ignore
                .update(updates as any)
                .eq('id', contactId);

            if (error) throw error;

            toast({
                title: "Contato atualizado",
                description: "As informações foram salvas com sucesso."
            });

            loadTodayAppointments();
        } catch (error: any) {
            console.error('Error updating contact:', error);
            toast({
                title: "Erro ao atualizar",
                description: error.message || "Não foi possível salvar as alterações.",
                variant: "destructive"
            });
        }
    };

    const markAsPurchased = async (contactId: number) => {
        try {
            const contact = todayAppointments.find(c => c.id === contactId);
            if (!contact) return;

            // Append tag if not present
            const currentTags = contact.tags || '';
            if (currentTags.includes('venda_realizada')) return;

            const newTags = currentTags ? `${currentTags},venda_realizada` : 'venda_realizada';

            const { error } = await supabase
                .from('contacts')
                // @ts-ignore
                .update({ tags: newTags })
                .eq('id', contactId);

            if (error) throw error;

            toast({
                title: "Venda registrada!",
                description: "Venda contabilizada para as metas do dia.",
                className: "bg-emerald-50 border-emerald-200 text-emerald-800"
            });

            loadTodayAppointments();
            loadDailyStats();
        } catch (error) {
            console.error('Error marking as purchased:', error);
            toast({
                title: "Erro ao registrar venda",
                description: "Tente novamente.",
                variant: "destructive"
            });
        }
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
        updateContact,
        markAsPurchased,
        selectedDate,
        setSelectedDate,
        loadTodayAppointments
    };
}

export type StorePanelData = ReturnType<typeof useStorePanelData>;
