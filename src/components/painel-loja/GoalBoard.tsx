import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Trophy, Users, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface GoalStats {
    totalAppointments: number;
    confirmedVisits: number;
    totalSales: number;
    conversionRate: number;
    attendantPerformance: {
        [key: string]: {
            scheduled: number;
            confirmed: number;
            sales: number;
            rate: number;
        }
    };
    uniqueAttendants: string[];
}

interface GoalBoardProps {
    dailyGoal?: number;
}

export function GoalBoard({ dailyGoal = 20 }: GoalBoardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<GoalStats>({
        totalAppointments: 0,
        confirmedVisits: 0,
        totalSales: 0,
        conversionRate: 0,
        attendantPerformance: {},
        uniqueAttendants: []
    });

    // Date Range State
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    });

    // State for selected attendant filter
    const [selectedAttendant, setSelectedAttendant] = useState<string>("all");

    useEffect(() => {
        if (isOpen) {
            loadGoalStats();
        }
    }, [isOpen, date, selectedAttendant]);

    const loadGoalStats = async () => {
        if (!date?.from) return;

        setLoading(true);
        try {
            // Adjust dates for full day range
            const startDate = new Date(date.from);
            startDate.setHours(0, 0, 0, 0);

            const endDate = date.to ? new Date(date.to) : new Date(date.from);
            endDate.setHours(23, 59, 59, 999);

            let query = supabase
                .from('contacts')
                .select('Atendente, status_visita, checkin_at, tags, data_agendamento, source, IG')
                .gte('data_agendamento', startDate.toISOString())
                .lte('data_agendamento', endDate.toISOString());

            // Apply attendant filter if selected
            if (selectedAttendant !== "all") {
                query = query.or(`Atendente.eq.${selectedAttendant},source.eq.${selectedAttendant},IG.eq.${selectedAttendant}`);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Explicitly cast data to expected type to fix 'never' inference
            const contacts = data as any[];

            const attendantPerf: GoalStats['attendantPerformance'] = {};
            const uniqueAttendantsSet = new Set<string>(); // To collect unique attendants
            let totalSched = 0;
            let totalConf = 0;

            contacts?.forEach(contact => {
                const attendant = contact.Atendente || contact.source || contact.IG || 'Sem Atendente';
                uniqueAttendantsSet.add(attendant); // Add to set

                // Initialize if not exists
                if (!attendantPerf[attendant]) {
                    attendantPerf[attendant] = { scheduled: 0, confirmed: 0, sales: 0, rate: 0 };
                }

                // Check functionality: valid schedule
                if (contact.status_visita !== 'cancelado') {
                    attendantPerf[attendant].scheduled++;
                    totalSched++;
                }

                // Check confirmed
                const isConfirmed = contact.status_visita === 'confirmado' || contact.tags?.includes('compareceu');

                if (isConfirmed) {
                    attendantPerf[attendant].confirmed++;
                    totalConf++;
                }

                // Check sales
                if (contact.tags?.includes('venda_realizada')) {
                    attendantPerf[attendant].sales++;
                }
            });

            // Calculate Total Sales
            const totalSales = Object.values(attendantPerf).reduce((acc, curr) => acc + curr.sales, 0);

            // Calculate Rates
            Object.keys(attendantPerf).forEach(key => {
                const perf = attendantPerf[key];
                perf.rate = perf.scheduled > 0 ? (perf.confirmed / perf.scheduled) * 100 : 0;
            });

            setStats({
                totalAppointments: totalSched,
                confirmedVisits: totalConf,
                totalSales: totalSales,
                conversionRate: totalSched > 0 ? (totalConf / totalSched) * 100 : 0,
                attendantPerformance: attendantPerf,
                uniqueAttendants: Array.from(uniqueAttendantsSet).sort()
            });

        } catch (error) {
            console.error("Error loading goal stats", error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Calculate Period Goal metrics
    const getPeriodMetrics = () => {
        if (!date?.from) return { target: 0, progress: 0, percentage: 0 };

        const start = date.from;
        const end = date.to || date.from;

        // Calculate days difference (inclusive)
        const days = differenceInDays(end, start) + 1;
        const target = days * dailyGoal;

        // Cap progress at 100% for the bar visual, but keep percentage real
        const percentage = target > 0 ? (stats.confirmedVisits / target) * 100 : 0;
        const progressValue = Math.min(percentage, 100);

        return { target, progress: progressValue, percentage };
    };

    const periodMetrics = getPeriodMetrics();

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full justify-start p-3 h-auto border-primary/20 hover:bg-primary/5 group"
                >
                    <div className="flex items-center gap-3 w-full">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                            <Target className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-medium text-foreground text-sm">Quadro de Metas</p>
                            <p className="text-xs text-muted-foreground">Acompanhamento de performance</p>
                        </div>
                    </div>
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Quadro de Metas e Performance
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Filters Section */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        {/* Date Range Picker with Presets */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full sm:w-[300px] justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                                                {format(date.to, "dd/MM/yyyy", { locale: ptBR })}
                                            </>
                                        ) : (
                                            format(date.from, "dd/MM/yyyy", { locale: ptBR })
                                        )
                                    ) : (
                                        <span>Selecione um período</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <div className="flex">
                                    <div className="flex flex-col gap-2 p-3 border-r">
                                        <div className="text-sm font-medium mb-1 px-2">Usados recentemente</div>
                                        <Button
                                            variant="ghost"
                                            className="justify-start font-normal text-xs"
                                            onClick={() => setDate({
                                                from: new Date(),
                                                to: new Date()
                                            })}
                                        >
                                            Hoje
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start font-normal text-xs"
                                            onClick={() => setDate({
                                                from: subDays(new Date(), 1),
                                                to: subDays(new Date(), 1)
                                            })}
                                        >
                                            Ontem
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start font-normal text-xs"
                                            onClick={() => setDate({
                                                from: startOfMonth(new Date()),
                                                to: endOfMonth(new Date())
                                            })}
                                        >
                                            Este mês
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start font-normal text-xs"
                                            onClick={() => setDate({
                                                from: subDays(new Date(), 7),
                                                to: new Date()
                                            })}
                                        >
                                            Últimos 7 dias
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start font-normal text-xs"
                                            onClick={() => setDate({
                                                from: subDays(new Date(), 30),
                                                to: new Date()
                                            })}
                                        >
                                            Últimos 30 dias
                                        </Button>
                                    </div>
                                    <div className="p-3">
                                        <CalendarComponent
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={2}
                                            locale={ptBR}
                                        />
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Attendant Filter */}
                        <Select value={selectedAttendant} onValueChange={setSelectedAttendant}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filtrar por Atendente" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Atendentes</SelectItem>
                                {stats.uniqueAttendants.map((attendant) => (
                                    <SelectItem key={attendant} value={attendant}>
                                        {attendant}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* NEW: Goal Summary Banner */}
                    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-xl border border-primary/10">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-3">
                            <div>
                                <h3 className="text-lg font-semibold text-primary">Meta do Período</h3>
                                <p className="text-sm text-muted-foreground">
                                    Baseado na meta diária de <strong>{dailyGoal} visitas</strong>
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold flex items-baseline gap-2 justify-end">
                                    <span className="text-green-600">{stats.confirmedVisits}</span>
                                    <span className="text-muted-foreground text-sm font-normal">de</span>
                                    <span>{periodMetrics.target}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {periodMetrics.percentage.toFixed(1)}% alcançado
                                </p>
                            </div>
                        </div>
                        <Progress value={periodMetrics.progress} className="h-3 bg-primary/10" />
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-primary/5 border-primary/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Agendado
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5 text-primary" />
                                    {loading ? "..." : stats.totalAppointments}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-green-50 border-green-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Comparecimentos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-700 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    {loading ? "..." : stats.confirmedVisits}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-50 border-blue-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Taxa de Comparecimento
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-700 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    {loading ? "..." : `${stats.conversionRate.toFixed(1)}%`}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-emerald-50 border-emerald-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Vendas Realizadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-emerald-700 flex items-center gap-2">
                                    <Trophy className="w-5 h-5" />
                                    {loading ? "..." : stats.totalSales}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Attendant Leaderboard */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Ranking por Atendente
                        </h3>

                        <div className="grid gap-3">
                            {loading ? (
                                <p className="text-center py-4 text-muted-foreground">Carregando dados...</p>
                            ) : Object.keys(stats.attendantPerformance).length === 0 ? (
                                <p className="text-center py-4 text-muted-foreground">Nenhum dado encontrado para o período.</p>
                            ) : (
                                Object.entries(stats.attendantPerformance)
                                    .sort(([, a], [, b]) => b.confirmed - a.confirmed) // Or sort by sales? b.sales - a.sales
                                    .map(([name, perf], index) => (
                                        <div key={name} className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                            <div className="flex-shrink-0 font-bold text-lg text-muted-foreground w-6 text-center">
                                                #{index + 1}
                                            </div>

                                            <Avatar className="h-10 w-10 border">
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                    {getInitials(name)}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="font-medium truncate">{name}</p>
                                                    <p className="font-bold text-green-600">{perf.confirmed} visitas</p>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs text-muted-foreground">
                                                        <span>{perf.scheduled} agendados</span>
                                                        <div className="flex gap-2">
                                                            {perf.sales > 0 && <span className="font-bold text-emerald-600">{perf.sales} vendas</span>}
                                                            <span>{perf.rate.toFixed(1)}% comp.</span>
                                                        </div>
                                                    </div>
                                                    <Progress value={perf.rate} className="h-2" />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
