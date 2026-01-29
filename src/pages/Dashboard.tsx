import { useState, useEffect } from "react";
import { TodayAppointments } from "@/components/painel-loja/TodayAppointments";
import { PendingNoShows } from "@/components/painel-loja/PendingNoShows";
import { DailySummary } from "@/components/painel-loja/DailySummary";
import { QuickActions } from "@/components/painel-loja/QuickActions";
import { PainelLojaAuthPage } from "@/components/auth/PainelLojaAuthPage";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PainelLojaPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const authStatus = localStorage.getItem('painelLojaAuth');
        setIsAuthenticated(authStatus === 'true');
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('painelLojaAuth');
        setIsAuthenticated(false);
    };

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

                {/* Main grid layout - 3 columns on desktop, stacked on mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Wrapper - 2/3 width */}
                    <div className="lg:col-span-2 space-y-6">
                        <TodayAppointments />
                        <PendingNoShows />
                    </div>

                    {/* Right Wrapper - 1/3 width */}
                    <div className="space-y-6">
                        <DailySummary />
                        <QuickActions />
                    </div>
                </div>
            </main>
        </div>
    );
}
