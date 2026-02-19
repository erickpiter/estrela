import { supabase } from './supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportStats {
    totalAppointments: number;
    confirmedVisits: number;
    totalSales: number;
    byAttendant: {
        [key: string]: {
            appointments: number;
            confirmed: number;
            sales: number;
        }
    };
}

interface LogEntry {
    id: string;
    timestamp: string;
    type: string;
    status: 'success' | 'error';
    message: string;
    attempts: number;
}

export const reportService = {
    async getSetting(key: string, defaultValue: string, throwOnError = false): Promise<string> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('value')
                .eq('key', key)
                .single();

            if (error) throw error;

            if (data && (data as any).value) {
                return String((data as any).value);
            }
        } catch (error) {
            console.error(`Error fetching setting ${key}:`, error);
            if (throwOnError) throw error;
        }
        return defaultValue;
    },

    async saveSetting(key: string, value: string): Promise<void> {
        await supabase
            .from('settings')
            .upsert({
                key,
                value,
                updated_at: new Date().toISOString()
            } as any);
    },

    async logExecution(type: string, status: 'success' | 'error', message: string, attempts: number) {
        try {
            const logsStr = await this.getSetting('automation_logs', '[]');
            let logs: LogEntry[] = [];
            try {
                logs = JSON.parse(logsStr);
                if (!Array.isArray(logs)) logs = [];
            } catch {
                logs = [];
            }

            const newLog: LogEntry = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                type,
                status,
                message,
                attempts
            };

            // Prepend and keep last 50
            logs.unshift(newLog);
            logs = logs.slice(0, 50);

            await this.saveSetting('automation_logs', JSON.stringify(logs));
        } catch (error) {
            console.error('Failed to save execution log:', error);
        }
    },

    async sendToWebhook(data: any, maxRetries = 3) {
        const webhookUrl = await this.getSetting('mini_painel_webhook_url', process.env.VITE_N8N_WEBHOOK_URL || "");

        if (!webhookUrl || webhookUrl.includes('your-endpoint-here')) {
            const msg = 'Webhook URL not configured';
            console.warn(msg);
            await this.logExecution(data.type, 'error', msg, 0);
            return;
        }

        let attempt = 0;
        let success = false;
        let lastError: any;

        while (attempt < maxRetries && !success) {
            attempt++;
            try {
                console.log(`Sending webhook to ${webhookUrl}... (Attempt ${attempt}/${maxRetries})`);
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        timestamp: new Date().toISOString(),
                        retryCount: attempt - 1,
                        ...data
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Webhook failed: ${response.statusText} (${response.status})`);
                }

                console.log('Webhook sent successfully!');
                success = true;
                await this.logExecution(data.type, 'success', `Enviado com sucesso na tentativa ${attempt}`, attempt);

            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                lastError = error;

                if (attempt < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s...
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        if (!success) {
            const errorMsg = lastError instanceof Error ? lastError.message : String(lastError);
            console.error('All retry attempts failed.');
            await this.logExecution(data.type, 'error', `Falha após ${maxRetries} tentativas: ${errorMsg}`, maxRetries);
            throw lastError;
        }
    },

    async fetchStatsForRange(startDate: Date, endDate: Date): Promise<ReportStats> {
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        const startOfDayStr = `${startStr}T00:00:00`;
        const endOfDayStr = `${endStr}T23:59:59`;

        console.log(`Fetching stats from ${startOfDayStr} to ${endOfDayStr}...`);

        // 1. Fetch Roster
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data: rosterData } = await supabase
            .from('contacts')
            .select('Atendente')
            .gte('data_agendamento', sixtyDaysAgo.toISOString())
            .neq('Atendente', null);

        const roster = (rosterData as any[]) || [];
        const rosterSet = new Set<string>();
        roster.forEach(c => { if (c.Atendente) rosterSet.add(c.Atendente); });
        const allAttendants = Array.from(rosterSet).sort();

        // 2. Fetch Data
        const { data: contactsData, error: contactsError } = await supabase
            .from('contacts')
            .select('Atendente, status_visita, tags, source, IG')
            .gte('data_agendamento', startOfDayStr)
            .lte('data_agendamento', endOfDayStr);

        if (contactsError) throw contactsError;

        // 3. Process
        const stats: ReportStats = {
            totalAppointments: 0,
            confirmedVisits: 0,
            totalSales: 0,
            byAttendant: {}
        };

        allAttendants.forEach(name => {
            stats.byAttendant[name] = { appointments: 0, confirmed: 0, sales: 0 };
        });

        const contacts = contactsData as any[] || [];

        contacts.forEach(c => {
            const attendant = c.Atendente || c.source || c.IG || 'Sem Atendente';

            if (!stats.byAttendant[attendant]) {
                stats.byAttendant[attendant] = { appointments: 0, confirmed: 0, sales: 0 };
            }

            if (c.status_visita !== 'cancelado') {
                stats.byAttendant[attendant].appointments++;
                stats.totalAppointments++;
            }

            const isConfirmed = c.status_visita === 'confirmado' || (c.tags && c.tags.includes('compareceu'));
            if (isConfirmed) {
                stats.byAttendant[attendant].confirmed++;
                stats.confirmedVisits++;
            }

            if (c.tags && c.tags.includes('venda_realizada')) {
                stats.byAttendant[attendant].sales++;
                stats.totalSales++;
            }
        });

        return stats;
    }
};
