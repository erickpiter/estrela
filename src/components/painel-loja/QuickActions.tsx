import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { settingsService } from "@/lib/settingsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoalBoard } from "./GoalBoard";
import { ReportAutomation } from "./ReportAutomation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Zap,
    Settings,
    Users
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

export function QuickActions() {
    const { toast } = useToast();
    const [showSettings, setShowSettings] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState("");
    const [dailyGoal, setDailyGoal] = useState("20");

    useEffect(() => {
        const loadSettings = async () => {
            const webhook = await settingsService.getSetting('mini_painel_webhook_url', import.meta.env.VITE_N8N_WEBHOOK_URL || "");
            setWebhookUrl(webhook);

            const goal = await settingsService.getSetting('mini_painel_daily_goal', import.meta.env.VITE_DAILY_VISIT_GOAL || "20");
            setDailyGoal(goal);
        };
        loadSettings();
    }, []);

    const handleSaveSettings = async () => {
        try {
            if (webhookUrl) await settingsService.saveSetting('mini_painel_webhook_url', webhookUrl);
            if (dailyGoal) await settingsService.saveSetting('mini_painel_daily_goal', dailyGoal);

            toast({
                title: "Configurações salvas",
                description: "Preferências atualizadas com sucesso."
            });

            // Reload to propagate changes across the app components that read from localStorage/DB on mount
            setTimeout(() => window.location.reload(), 500);

        } catch (error) {
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar as configurações.",
                variant: "destructive"
            });
        }
        setShowSettings(false);
    };

    return (
        <>
            <Card className="border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Zap className="w-5 h-5 text-primary" />
                        Ações Rápidas
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-2">
                    {/* <div className="grid grid-cols-2 gap-3 mb-4">
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-primary/50 hover:bg-primary/5">
                    <UserPlus className="w-6 h-6 text-primary" />
                    Agendar Cliente
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-green-500/50 hover:bg-green-500/5">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                    Broadcast WhatsApp
                </Button>
            </div> */}

                    <div className="space-y-2">
                        <GoalBoard dailyGoal={parseInt(dailyGoal) || 20} />

                        <Button
                            variant="outline"
                            className="w-full justify-start p-3 h-auto border-primary/20 hover:bg-primary/5"
                            onClick={() => setShowSettings(true)}
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Settings className="w-4 h-4" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-medium text-foreground text-sm">Configurações do Painel</p>
                                    <p className="text-xs text-muted-foreground">Personalizar interface</p>
                                </div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full justify-start p-3 h-auto border-primary/20 hover:bg-primary/5"
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-medium text-foreground text-sm">Lista de Clientes</p>
                                    <p className="text-xs text-muted-foreground">Gerenciar base</p>
                                </div>
                            </div>
                        </Button>
                        <ReportAutomation />
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configurações do Painel</DialogTitle>
                        <DialogDescription>
                            Personalize as integrações e aparência.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="webhook">URL do Webhook (N8N)</Label>
                            <Input
                                id="webhook"
                                placeholder="https://n8n.seudominio.com/webhook/..."
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Este webhook receberá eventos de presença e no-shows.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dailyGoal">Meta Diária de Visitas</Label>
                            <Input
                                id="dailyGoal"
                                type="number"
                                placeholder="Ex: 20"
                                value={dailyGoal}
                                onChange={(e) => setDailyGoal(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Meta alvo de visitas confirmadas para o dia.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSettings(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSettings}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
