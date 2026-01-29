import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStorePanelData } from "@/hooks/useStorePanelData";
import { CheckCircle2, AlertCircle, TrendingUp, Target, UserCheck } from "lucide-react";
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

            {/* Attendance Rate */}
            <Card className="bg-card w-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Comparecimento</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{attendanceRate}%</div>
                    <p className="text-xs text-muted-foreground">
                        {dailyStats.confirmedVisits} de {dailyStats.totalAppointments} agendados
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
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
                                .sort(([, a], [, b]) => b - a)
                                .map(([attendant, count]) => (
                                    <div key={attendant} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{attendant}</span>
                                        <span className="font-medium bg-secondary px-2 py-0.5 rounded text-xs">
                                            {count} visitas
                                        </span>
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
