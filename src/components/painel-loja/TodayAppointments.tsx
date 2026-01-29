import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, Phone, ShoppingBag, RotateCcw, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { useStorePanelData } from "@/hooks/useStorePanelData";
import { formatPhoneForWhatsApp, cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TodayAppointments() {
    const { todayAppointments, loading, markAsVisited, markAsNoShow, selectedDate, setSelectedDate } = useStorePanelData();
    // const [date, setDate] = useState<Date | undefined>(new Date());

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getInitials = (name?: string) => {
        if (!name) return "?";
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleWhatsApp = (phone: string) => {
        const cleanPhone = formatPhoneForWhatsApp(phone);
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    return (
        <Card className="h-fit border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-medium">
                        <Calendar className="w-5 h-5 text-foreground" />
                        Agendados de Hoje
                    </CardTitle>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent
                                mode="single"
                                selected={selectedDate}
                                onSelect={(d) => d && setSelectedDate(d)} // Ensure not undefined
                                locale={ptBR}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground/20"></div>
                    </div>
                ) : todayAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum agendamento para hoje</p>
                    </div>
                ) : (
                    todayAppointments.map((appointment) => {
                        const isConfirmed = appointment.status_visita === 'confirmado' || appointment.tags?.includes('compareceu');

                        return (
                            <div key={appointment.id} className="relative border border-border/50 rounded-xl p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors">
                                {/* Header with Avatar and Info */}
                                <div className="flex items-start gap-3">
                                    <Avatar className="w-10 h-10">
                                        <AvatarFallback className="bg-muted text-foreground font-medium">
                                            {getInitials(appointment.display_name || undefined)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium truncate text-foreground">
                                                {appointment.display_name || "Nome não informado"}
                                            </h4>
                                            {appointment.tags && appointment.tags !== 'compareceu' && (
                                                <Badge variant="secondary" className="text-xs bg-muted text-foreground border-border">
                                                    {appointment.tags}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(appointment.data_agendamento || '')}
                                                {appointment.Atendente && (
                                                    <span className="text-xs ml-2 bg-muted px-2 py-0.5 rounded border">
                                                        Agendado por: {appointment.Atendente}
                                                    </span>
                                                )}
                                            </div>
                                            {(appointment.IG || appointment.phone_e164) && (
                                                <div className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                                                    onClick={() => {
                                                        if (appointment.IG) window.open(`https://instagram.com/${appointment.IG.replace('@', '')}`, '_blank');
                                                        else handleWhatsApp(appointment.phone_e164 || '');
                                                    }}>
                                                    {appointment.IG ? (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                                                            {appointment.IG}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Phone className="w-3 h-3" />
                                                            {appointment.phone_e164}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Interest and Trade-in Info */}
                                {(appointment.interesse || appointment.aparelho_de_troca) && (
                                    <div className="space-y-1 text-sm">
                                        {appointment.interesse && (
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag className="w-3 h-3 text-foreground" />
                                                <span className="text-foreground"><strong>Interesse:</strong> {appointment.interesse}</span>
                                            </div>
                                        )}
                                        {appointment.aparelho_de_troca && (
                                            <div className="flex items-center gap-2">
                                                <RotateCcw className="w-3 h-3 text-foreground" />
                                                <span className="text-foreground"><strong>Troca:</strong> {appointment.aparelho_de_troca}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Confirmed Badge - Top Right */}
                                {isConfirmed && (
                                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold border border-green-200 shadow-sm animate-in fade-in zoom-in duration-300">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        COMPARECEU
                                    </div>
                                )}

                                {/* Action Buttons */}
                                {!isConfirmed ? (
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            size="sm"
                                            onClick={() => markAsVisited(appointment.id)}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                        >
                                            Confirmar Presença
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => markAsNoShow(appointment.id)}
                                            className="border-red-200 text-red-700 hover:bg-red-50"
                                        >
                                            Não Compareceu
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="pt-1">
                                        <p className="text-xs text-center text-muted-foreground">
                                            Atendimento finalizado em {appointment.checkin_at ? formatTime(appointment.checkin_at) : 'horário não registrado'}.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card >
    );
}
