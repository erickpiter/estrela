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
import { CalendarIcon, FileBarChart, Loader2, Send, AlertCircle, CheckCircle2, XCircle, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { settingsService } from "@/lib/settingsService";
import { sendToWebhook } from "@/lib/webhook";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

interface LogEntry {
    id: string;
    timestamp: string;
    type: string;
    status: 'success' | 'error';
    message: string;
    attempts: number;
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

    // Logs State
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [lastError, setLastError] = useState<LogEntry | null>(null);

    useEffect(() => {
        if (open) {
            loadSettings();
            loadLogs();
        }
    }, [open]);

    // Check for errors on mount to notify user
    useEffect(() => {
        loadLogs().then(loadedLogs => {
            if (loadedLogs && loadedLogs.length > 0) {
                const last = loadedLogs[0];
                // If last log was error and happened in last 24h
                const logTime = new Date(last.timestamp).getTime();
                const now = new Date().getTime();
                if (last.status === 'error' && (now - logTime) < 24 * 60 * 60 * 1000) {
                    setLastError(last);
                }
            }
        });
    }, []);

    const loadLogs = async () => {
        setLoading(true); // Reusing existing loading state, or creating a new local one if simpler
        try {
            const logsStr = await settingsService.getSetting('automation_logs', '[]');
            let loadedLogs: LogEntry[] = [];
            try {
                loadedLogs = JSON.parse(logsStr);
                if (!Array.isArray(loadedLogs)) loadedLogs = [];
            } catch {
                loadedLogs = [];
            }
            setLogs(loadedLogs);
            return loadedLogs;
        } catch (e) {
            console.error("Error loading logs", e);
            toast({
                title: "Erro ao carregar histórico",
                description: "Não foi possível buscar os logs.",
                variant: "destructive"
            });
            return [];
        } finally {
            setLoading(false);
        }
    };

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
    // Note: The main automation logic is now handled by the Backend Worker.
    // Client-side logic here is kept for Manual Trigger and as a fallback if needed,
    // but the Worker has the robust implementation.

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
        <>
            {lastError && (
                <div className="mb-2 px-1">
                    <Alert variant="destructive" className="relative">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Falha na Automação</AlertTitle>
                        <AlertDescription>
                            A última tentativa de envio falhou: {lastError.message}.
                            <br />
                            <span className="text-xs opacity-80">
                                {format(new Date(lastError.timestamp), "dd/MM 'às' HH:mm")}
                            </span>
                        </AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 text-destructive-foreground"
                            onClick={() => setLastError(null)}
                        >
                            <XCircle className="w-4 h-4" />
                        </Button>
                    </Alert>
                </div>
            )}

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
                                <p className="text-xs text-muted-foreground">Configurar envios e registros</p>
                            </div>
                            {lastError && <AlertCircle className="w-4 h-4 text-destructive" />}
                        </div>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Automação de Relatórios</DialogTitle>
                        <DialogDescription>
                            Configure o envio automático, dispare manualmente ou veja o histórico.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="manual" className="w-full flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="manual">Disparo Manual</TabsTrigger>
                            <TabsTrigger value="auto">Configuração</TabsTrigger>
                            <TabsTrigger value="logs" className="flex items-center gap-2">
                                <History className="w-3 h-3" />
                                Histórico
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto min-h-0">
                            <TabsContent value="manual" className="space-y-4 py-4 m-0 h-full">
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

                            <TabsContent value="auto" className="space-y-6 py-4 m-0 h-full">
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

                            <TabsContent value="logs" className="py-4 m-0 h-full flex flex-col">
                                <ScrollArea className="flex-1 pr-4">
                                    {logs.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            Nenhum registro encontrado ainda.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {logs.map((log) => (
                                                <div key={log.id} className="border rounded-lg p-3 text-sm flex gap-3 items-start">
                                                    <div className="mt-0.5">
                                                        {log.status === 'success' ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 text-red-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-semibold capitalize">{log.type.replace('_', ' ')}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {format(new Date(log.timestamp), "dd/MM/yy HH:mm")}
                                                            </span>
                                                        </div>
                                                        <p className="text-muted-foreground">{log.message}</p>
                                                        {log.attempts > 1 && (
                                                            <p className="text-xs text-muted-foreground mt-1 bg-muted inline-block px-1.5 py-0.5 rounded">
                                                                {log.attempts} tentativas
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                                <Button variant="outline" size="sm" className="w-full mt-4" onClick={loadLogs} disabled={loading}>
                                    {loading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Loader2 className="w-3 h-3 mr-2" />}
                                    Atualizar Lista
                                </Button>
                            </TabsContent>
                        </div>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    );
}
