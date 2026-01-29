import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, User } from "lucide-react";
import { toast } from "sonner";

interface PainelLojaAuthPageProps {
    onAuthenticated: () => void;
}

export function PainelLojaAuthPage({ onAuthenticated }: PainelLojaAuthPageProps) {
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simple credential check - in production, this should be more secure
        if (credentials.username === 'loja' && credentials.password === 'loja123') {
            localStorage.setItem('painelLojaAuth', 'true');
            toast.success('Acesso autorizado');
            onAuthenticated();
        } else {
            toast.error('Credenciais inválidas');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-border/50 shadow-sm">
                <CardHeader className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-semibold text-foreground">
                        Painel da Loja
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Acesso restrito - Insira suas credenciais
                    </p>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Usuário"
                                    value={credentials.username}
                                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                                    className="pl-10 border-border/50 focus:border-primary/50"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder="Senha"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                                    className="pl-10 border-border/50 focus:border-primary/50"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Verificando...' : 'Acessar Painel'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
