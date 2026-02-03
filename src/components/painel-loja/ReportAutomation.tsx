import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import { CalendarIcon, FileBarChart, Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { settingsService } from "@/lib/settingsService";
import { sendToWebhook } from "@/lib/webhook";
import { useToast } from "@/hooks/use-toast";

interface ReportStats {
    totalAppointments: number;
    confirmedVisits: number;
    totalSales: number;
    byAttendant: {
        [key: string]: {
            appointments: number;
            confirmed: number; // Comparecimentos
            sales: number;
        }
    };
}

export function ReportAutomation() {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Manual Trigger State
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    // Automation Config State
    const [dailyEnabled, setDailyEnabled] = useState(false);
    const [dailyTime, setDailyTime] = useState("08:00");
    const [weeklyEnabled, setWeeklyEnabled] = useState(false);
    const [weeklyDay, setWeeklyDay] = useState("1"); // 1 = Monday
    const [weeklyTime, setWeeklyTime] = useState("08:00");

    useEffect(() => {
        if (open) {
            loadSettings();
        }
    }, [open]);

    const loadSettings = async () => {
        try {
            const dailyConfigStr = await settingsService.getSetting('report_auto_daily', '{}');
            const weeklyConfigStr = await settingsService.getSetting('report_auto_weekly', '{}');

            const dailyConfig = JSON.parse(dailyConfigStr);
            const weeklyConfig = JSON.parse(weeklyConfigStr);

            if (dailyConfig.enabled !== undefined) setDailyEnabled(dailyConfig.enabled);
            if (dailyConfig.time) setDailyTime(dailyConfig.time);

            if (weeklyConfig.enabled !== undefined) setWeeklyEnabled(weeklyConfig.enabled);
            if (weeklyConfig.day) setWeeklyDay(weeklyConfig.day);
            if (weeklyConfig.time) setWeeklyTime(weeklyConfig.time);
        } catch (error) {
            console.error("Error loading report settings", error);
        }
    };

    const handleSaveConfig = async () => {
        setLoading(true);
        try {
            await settingsService.saveSetting('report_auto_daily', JSON.stringify({
                enabled: dailyEnabled,
                time: dailyTime
            }));

            await settingsService.saveSetting('report_auto_weekly', JSON.stringify({
                enabled: weeklyEnabled,
                day: weeklyDay,
                time: weeklyTime
            }));

            toast({
                title: "Configurações salvas",
                description: "A automação de relatórios foi atualizada."
            });
            setOpen(false);
        } catch (error) {
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar as configurações.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // --- Automation Logic ---
    useEffect(() => {
        // Load settings and start interval
        const interval = setInterval(checkAutomation, 60000); // Check every minute
        // Initial check after short delay to ensure settings loaded
        setTimeout(checkAutomation, 5000);

        return () => clearInterval(interval);
    }, [dailyEnabled, dailyTime, weeklyEnabled, weeklyDay, weeklyTime]);

    const checkAutomation = async () => {
        const now = new Date();
        const currentGenericTime = format(now, 'HH:mm');
        const currentDay = now.getDay().toString(); // 0-6
        const todayStr = format(now, 'yyyy-MM-dd');

        // Check Daily Report
        if (dailyEnabled && dailyTime === currentGenericTime) {
            const lastRun = await settingsService.getSetting('last_run_daily', '');
            if (lastRun !== todayStr) {
                console.log("Triggering Daily Report...");
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                try {
                    const stats = await fetchStatsForRange(yesterday, yesterday);
                    await sendToWebhook({
                        type: 'daily_report',
                        reportDate: format(yesterday, 'yyyy-MM-dd'),
                        triggerTime: now.toISOString(),
                        stats
                    });
                    await settingsService.saveSetting('last_run_daily', todayStr);
                    toast({ title: "Relatório Diário enviado", description: "Enviado automaticamente." });
                } catch (e) {
                    console.error("Daily Auto Error", e);
                }
            }
        }

        // Check Weekly Report
        if (weeklyEnabled && weeklyDay === currentDay && weeklyTime === currentGenericTime) {
            const lastRun = await settingsService.getSetting('last_run_weekly', '');
            if (lastRun !== todayStr) {
                console.log("Triggering Weekly Report...");
                // Last 7 days including yesterday? Or including today?
                // Usually "Past Week". Let's do last 7 days ending Yesterday
                const endWeek = new Date();
                endWeek.setDate(endWeek.getDate() - 1);
                const startWeek = new Date();
                startWeek.setDate(startWeek.getDate() - 7); // 7 days window

                try {
                    const stats = await fetchStatsForRange(startWeek, endWeek);
                    await sendToWebhook({
                        type: 'weekly_report',
                        reportDate: `${format(startWeek, 'yyyy-MM-dd')} to ${format(endWeek, 'yyyy-MM-dd')}`,
                        triggerTime: now.toISOString(),
                        stats
                    });
                    await settingsService.saveSetting('last_run_weekly', todayStr);
                    toast({ title: "Relatório Semanal enviado", description: "Enviado automaticamente." });
                } catch (e) {
                    console.error("Weekly Auto Error", e);
                }
            }
        }
    };

    const fetchStatsForRange = async (startDate: Date, endDate: Date): Promise<ReportStats> => {
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        const startOfDay = `${startStr}T00:00:00`;
        const endOfDay = `${endStr}T23:59:59`;

        // 1. Fetch Roster (Active Attendants in last 60 days to ensure we track 0s)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data: rosterData } = await supabase
            .from('contacts')
            .select('Atendente')
            .gte('data_agendamento', sixtyDaysAgo.toISOString())
            .neq('Atendente', null);

        // Cast to any[] to avoid strict type errors
        const roster = (rosterData as any[]) || [];
        const rosterSet = new Set<string>();

        roster.forEach(c => {
            if (c.Atendente) rosterSet.add(c.Atendente);
        });
        const allAttendants = Array.from(rosterSet).sort();

        // 2. Fetch Data (Contacts for the range)
        const { data: contactsData, error: contactsError } = await supabase
            .from('contacts')
            .select('Atendente, status_visita, tags, source, IG')
            .gte('data_agendamento', startOfDay)
            .lte('data_agendamento', endOfDay);

        if (contactsError) throw contactsError;

        // 3. Initialize Stats Structure
        const stats: ReportStats = {
            totalAppointments: 0,
            confirmedVisits: 0,
            totalSales: 0,
            byAttendant: {}
        };

        // Initialize all attendants with 0
        allAttendants.forEach(name => {
            stats.byAttendant[name] = { appointments: 0, confirmed: 0, sales: 0 };
        });

        const contacts = contactsData as any[] || [];

        // 4. Process Metrics
        contacts.forEach(c => {
            // Resolve Attendant Name
            const attendant = c.Atendente || c.source || c.IG || 'Sem Atendente';

            // Ensure entry exists
            if (!stats.byAttendant[attendant]) {
                stats.byAttendant[attendant] = { appointments: 0, confirmed: 0, sales: 0 };
            }

            // --- Metrics ---

            // A. Appointments
            if (c.status_visita !== 'cancelado') {
                stats.byAttendant[attendant].appointments++;
                stats.totalAppointments++;
            }

            // B. Confirmed Visits
            const isConfirmed = c.status_visita === 'confirmado' || c.tags?.includes('compareceu');
            if (isConfirmed) {
                stats.byAttendant[attendant].confirmed++;
                stats.confirmedVisits++;
            }

            // C. Sales
            if (c.tags?.includes('venda_realizada')) {
                stats.byAttendant[attendant].sales++;
                stats.totalSales++;
            }
        });

        return stats;
    };

    const handleManualTrigger = async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            const stats = await fetchStatsForRange(selectedDate, selectedDate);

            await sendToWebhook({
                type: 'manual_report',
                reportDate: format(selectedDate, 'yyyy-MM-dd'),
                triggerTime: new Date().toISOString(),
                stats: stats
            });

            toast({
                title: "Relatório enviado!",
                description: `Dados do dia ${format(selectedDate, 'dd/MM/yyyy')} enviados para o webhook.`
            });
            setOpen(false);
        } catch (error) {
            console.error("Error generating report", error);
            let errorMessage = "Erro desconhecido";

            if (error instanceof Error) {
                errorMessage = error.message;
            } else {
                errorMessage = String(error);
            }

            toast({
                title: "Erro ao gerar relatório",
                description: `Detalhes: ${errorMessage}`,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full justify-start p-3 h-auto border-primary/20 hover:bg-primary/5"
                >
                    <div className="flex items-center gap-3 w-full">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <FileBarChart className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-medium text-foreground text-sm">Automação de Relatórios</p>
                            <p className="text-xs text-muted-foreground">Configurar envios e disparos</p>
                        </div>
                    </div>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Automação de Relatórios</DialogTitle>
                    <DialogDescription>
                        Configure o envio automático ou dispare manualmente.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Disparo Manual</TabsTrigger>
                        <TabsTrigger value="auto">Configuração</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4 py-4">
                        <div className="flex flex-col space-y-2">
                            <Label>Selecione a Data do Relatório</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !selectedDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground">
                                O relatório conterá todos os agendamentos e vendas registrados nesta data.
                            </p>
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleManualTrigger}
                            disabled={!selectedDate || loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Enviar Relatório Agora
                        </Button>
                    </TabsContent>

                    <TabsContent value="auto" className="space-y-6 py-4">
                        {/* Daily Report Config */}
                        <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Relatório Diário</Label>
                                <Switch checked={dailyEnabled} onCheckedChange={setDailyEnabled} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Envia um balanço do dia ANTERIOR todos os dias.
                            </p>
                            {dailyEnabled && (
                                <div className="flex items-center gap-2">
                                    <Label>Horário de envio:</Label>
                                    <TimePicker
                                        value={dailyTime}
                                        onChange={setDailyTime}
                                        className="w-32"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Weekly Report Config */}
                        <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Relatório Semanal</Label>
                                <Switch checked={weeklyEnabled} onCheckedChange={setWeeklyEnabled} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Envia um balanço acumulado da semana.
                            </p>
                            {weeklyEnabled && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Dia da semana</Label>
                                        <Select value={weeklyDay} onValueChange={setWeeklyDay}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Segunda-feira</SelectItem>
                                                <SelectItem value="2">Terça-feira</SelectItem>
                                                <SelectItem value="3">Quarta-feira</SelectItem>
                                                <SelectItem value="4">Quinta-feira</SelectItem>
                                                <SelectItem value="5">Sexta-feira</SelectItem>
                                                <SelectItem value="6">Sábado</SelectItem>
                                                <SelectItem value="0">Domingo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Horário</Label>
                                        <TimePicker
                                            value={weeklyTime}
                                            onChange={setWeeklyTime}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button className="w-full" onClick={handleSaveConfig} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Configurações
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
