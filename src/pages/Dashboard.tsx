import { useState, useEffect } from "react";
import { TodayAppointments } from "@/components/painel-loja/TodayAppointments";
import { PendingNoShows } from "@/components/painel-loja/PendingNoShows";
import { DailySummary } from "@/components/painel-loja/DailySummary";
import { QuickActions } from "@/components/painel-loja/QuickActions";
import { DeliveriesBoard } from "@/components/painel-loja/Deliveries/DeliveriesBoard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PainelLojaAuthPage } from "@/components/auth/PainelLojaAuthPage";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStorePanelData } from "@/hooks/useStorePanelData";
import { useDeliveries } from "@/hooks/useDeliveries";

export function PainelLojaPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const storeData = useStorePanelData(); // Shared State Instance
    const { deliveries } = useDeliveries(); // Fetch deliveries for badge count

    useEffect(() => {
        const authStatus = localStorage.getItem('painelLojaAuth');
        setIsAuthenticated(authStatus === 'true');
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('painelLojaAuth');
        setIsAuthenticated(false);
    };

    const pendingDeliveriesCount = deliveries.filter(d => d.delivery_status === 'pending').length;

    if (!isAuthenticated) {
        return <PainelLojaAuthPage onAuthenticated={() => setIsAuthenticated(true)} />;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">
                                Painel da Loja
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Controle de presença e agendamentos
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleLogout}
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sair
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-8">

                <Tabs defaultValue="overview" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList className="grid w-[400px] grid-cols-2">
                            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                            <TabsTrigger value="deliveries" className="flex items-center gap-2">
                                Entregas
                                {pendingDeliveriesCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center min-w-[1.25rem]">
                                        {pendingDeliveriesCount}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="overview" className="mt-0 space-y-6">
                        {/* Main grid layout - 3 columns on desktop, stacked on mobile */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Wrapper - 2/3 width */}
                            <div className="lg:col-span-2 space-y-6">
                                <TodayAppointments {...storeData} />
                                <PendingNoShows {...storeData} />
                            </div>

                            {/* Right Wrapper - 1/3 width */}
                            <div className="space-y-6">
                                <DailySummary {...storeData} />
                                <QuickActions />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="deliveries" className="mt-0">
                        <DeliveriesBoard />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
