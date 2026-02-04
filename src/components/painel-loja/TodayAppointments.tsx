import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, Phone, ShoppingBag, RotateCcw, Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useStorePanelData } from "@/hooks/useStorePanelData";
import { formatPhoneForWhatsApp, cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientCard } from "./ClientCard";
import { StorePanelData } from "@/hooks/useStorePanelData";

export function TodayAppointments({ todayAppointments, loading, markAsVisited, markAsNoShow, updateContact, markAsPurchased, selectedDate, setSelectedDate }: StorePanelData) {

    const handlePrevDay = () => {
        if (selectedDate) {
            setSelectedDate(subDays(selectedDate, 1));
        }
    };

    const handleNextDay = () => {
        if (selectedDate) {
            setSelectedDate(addDays(selectedDate, 1));
        }
    };

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

                    <div className="flex items-center border rounded-md shadow-sm bg-background">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-none hover:bg-muted border-r"
                            onClick={handlePrevDay}
                            disabled={!selectedDate}
                            title="Dia anterior"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"ghost"}
                                    className={cn(
                                        "h-9 min-w-[200px] justify-center text-center font-normal rounded-none hover:bg-muted px-4",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                                    <span className="truncate">
                                        {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center">
                                <CalendarComponent
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(d) => d && setSelectedDate(d)} // Ensure not undefined
                                    locale={ptBR}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-none hover:bg-muted border-l"
                            onClick={handleNextDay}
                            disabled={!selectedDate}
                            title="Próximo dia"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
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
                    todayAppointments.map((appointment) => (
                        <ClientCard
                            key={appointment.id}
                            contact={appointment}
                            onUpdate={updateContact}
                            onMarkAsVisited={markAsVisited}
                            onMarkAsNoShow={markAsNoShow}
                            onMarkAsPurchased={markAsPurchased}
                        />
                    ))
                )}
            </CardContent>
        </Card >
    );
}
