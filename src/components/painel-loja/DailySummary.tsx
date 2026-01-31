import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStorePanelData } from "@/hooks/useStorePanelData";
import { CheckCircle2, AlertCircle, TrendingUp, Target, UserCheck, ShoppingBag, Calendar, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function DailySummary() {
    const { dailyStats, loading } = useStorePanelData();

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    const attendanceRate = dailyStats.totalAppointments > 0
        ? Math.round((dailyStats.confirmedVisits / dailyStats.totalAppointments) * 100)
        : 0;

    const conversionRate = dailyStats.confirmedVisits > 0
        ? Math.round((dailyStats.totalSales / dailyStats.confirmedVisits) * 100)
        : 0;

    // Ensure dailyGoal is valid to avoid division by zero or NaN
    const goal = dailyStats.dailyGoal || 1;
    const goalProgress = Math.min(100, Math.round((dailyStats.confirmedVisits / goal) * 100));

    return (
        <div className="space-y-4">
            {/* Goal Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background border-indigo-100 dark:border-indigo-900/50">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-indigo-600" />
                            <span className="font-medium text-sm text-indigo-900 dark:text-indigo-100">Meta Diária</span>
                        </div>
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                            {dailyStats.confirmedVisits} / {dailyStats.dailyGoal}
                        </span>
                    </div>
                    <Progress value={goalProgress} className="h-2 bg-indigo-100" />
                    <p className="text-xs text-muted-foreground text-center">
                        {goalProgress >= 100 ? "Meta batida! 🎉" : `${Math.max(0, dailyStats.dailyGoal - dailyStats.confirmedVisits)} visitas para bater a meta`}
                    </p>
                </CardContent>
            </Card>

            {/* Rates Row */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taxa de Comparecimento</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{attendanceRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {dailyStats.confirmedVisits} visitas de {dailyStats.totalAppointments} agendamentos
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                        <Trophy className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{conversionRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {dailyStats.totalSales} vendas de {dailyStats.confirmedVisits} visitas
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Agendados</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dailyStats.totalAppointments}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comparecimentos</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dailyStats.confirmedVisits}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">No-shows</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dailyStats.totalNoShows}</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-900">Vendas</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{dailyStats.totalSales || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Attendant Performance */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Performance por Atendente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {Object.entries(dailyStats.attendantPerformance || {}).length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">Nenhuma visita confirmada hoje</p>
                        ) : (
                            Object.entries(dailyStats.attendantPerformance)
                                .sort(([, a], [, b]) => b.visits - a.visits)
                                .map(([attendant, stats]) => (
                                    <div key={attendant} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{attendant}</span>
                                        <div className="flex gap-2">
                                            <span className="font-medium bg-secondary px-2 py-0.5 rounded text-xs">
                                                {stats.visits} visitas
                                            </span>
                                            {stats.sales > 0 && (
                                                <span className="font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs">
                                                    {stats.sales} vendas
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-orange-50/50 border-orange-100">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-orange-800">Follow-ups Pendentes</p>
                        <p className="text-2xl font-bold text-orange-900">{dailyStats.pendingFollowUps}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-orange-200" />
                </CardContent>
            </Card>
        </div>
    );
}
