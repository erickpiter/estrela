import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertCircle, Phone, Calendar } from "lucide-react";
import { StorePanelData } from "@/hooks/useStorePanelData";
import { formatPhoneForWhatsApp } from "@/lib/utils";

export function PendingNoShows({ pendingNoShows, loading, sendFollowUp, markFollowUpAsReturned }: StorePanelData) {

    const getInitials = (name?: string) => {
        if (!name) return "?";
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleWhatsApp = (phone: string) => {
        const cleanPhone = formatPhoneForWhatsApp(phone);
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const getFollowUpBadgeColor = (tag: string) => {
        switch (tag) {
            case 'follow_up_01': return 'bg-yellow-100 text-yellow-800';
            case 'follow_up_02': return 'bg-orange-100 text-orange-800';
            case 'follow_up_03': return 'bg-red-100 text-red-800';
            case 'follow_up_04': return 'bg-red-200 text-red-900';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <Card className="h-fit border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    No-shows Pendentes
                    {pendingNoShows.length > 0 && (
                        <Badge variant="destructive" className="ml-2">
                            {pendingNoShows.length}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : pendingNoShows.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum no-show pendente</p>
                        <p className="text-sm">Todos os follow-ups estão em dia!</p>
                    </div>
                ) : (
                    pendingNoShows.map((contact) => (
                        <div key={contact.id} className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/50 transition-colors border-orange-200">
                            {/* Header with Avatar and Info */}
                            <div className="flex items-start gap-3">
                                <Avatar className="w-10 h-10">
                                    <AvatarFallback className="bg-orange-50 text-orange-700 font-medium">
                                        {getInitials(contact.display_name || undefined)}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium truncate">
                                            {contact.display_name || "Nome não informado"}
                                        </h4>
                                        <Badge className={getFollowUpBadgeColor(contact.tags || '')}>
                                            {(contact.tags || '').replace('_', ' ').toUpperCase()}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Agendado: {formatDate(contact.data_agendamento || '')}
                                        </div>
                                        {contact.Atendente && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100">
                                                    Agendado por: {contact.Atendente}
                                                </span>
                                            </div>
                                        )}
                                        {(contact.IG || contact.phone_e164) && (
                                            <div className="flex items-center gap-1 cursor-pointer hover:text-primary"
                                                onClick={() => {
                                                    if (contact.IG) window.open(`https://instagram.com/${contact.IG.replace('@', '')}`, '_blank');
                                                    else handleWhatsApp(contact.phone_e164 || '');
                                                }}>
                                                {contact.IG ? (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                                                        {contact.IG}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Phone className="w-3 h-3" />
                                                        {contact.phone_e164}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Interest Info */}
                            {contact.interesse && (
                                <div className="text-sm">
                                    <span><strong>Interesse:</strong> {contact.interesse}</span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <Button
                                    size="sm"
                                    onClick={() => sendFollowUp(contact.id)}
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                                >
                                    Disparar Follow-up
                                </Button>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markFollowUpAsReturned(contact.id)}
                                    className="border-green-200 text-green-700 hover:bg-green-50"
                                >
                                    Retorno
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
