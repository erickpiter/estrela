import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Calendar as CalendarIcon } from "lucide-react";
import { useStorePanelData } from "@/hooks/useStorePanelData";
import { cn } from "@/lib/utils";
import { ClientCard } from "./ClientCard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TodayAppointments() {
    const { todayAppointments, loading, markAsVisited, markAsNoShow, selectedDate, setSelectedDate, markAsPurchased, updateContact } = useStorePanelData();
    // const [date, setDate] = useState<Date | undefined>(new Date());

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
