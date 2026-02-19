
import { useDeliveries } from "@/hooks/useDeliveries";
import { DeliveryCard } from "./DeliveryCard";
import { NewDeliveryForm } from "./NewDeliveryForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, PackageX, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/types";

type Delivery = Database['public']['Tables']['sales_estrela']['Row'];

export function DeliveriesBoard() {
    const { deliveries, loading, updateDeliveryStatus, updateDelivery, refreshDeliveries } = useDeliveries();

    if (loading && deliveries.length === 0) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    }

    const pending = deliveries.filter(d => d.delivery_status === 'pending');
    const ready = deliveries.filter(d => d.delivery_status === 'ready');
    const shipping = deliveries.filter(d => d.delivery_status === 'shipping');
    const delivered = deliveries.filter(d => d.delivery_status === 'delivered');

    const defaultTab = pending.length > 0 ? "pending" :
        ready.length > 0 ? "ready" :
            shipping.length > 0 ? "shipping" : "delivered";

    const groupDeliveries = (list: Delivery[]) => {
        const groups: { [key: string]: Delivery[] } = {};

        list.forEach(d => {
            const date = d.scheduled_date ? d.scheduled_date : "Sem Data";
            const period = d.delivery_period ? d.delivery_period : "Sem Turno";
            const key = `${date}:::${period}`;

            if (!groups[key]) groups[key] = [];
            groups[key].push(d);
        });

        // Sort keys: Dates ascending, then Periods (Manhã before Tarde)
        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as { [key: string]: Delivery[] });
    };

    const GroupedListWrapper = ({ list }: { list: Delivery[] }) => {
        if (list.length === 0) return (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-60">
                <PackageX className="w-12 h-12 mb-2" />
                <p>Nenhuma entrega encontrada</p>
            </div>
        );

        const grouped = groupDeliveries(list);

        return (
            <ScrollArea className="h-[calc(100vh-250px)] w-full rounded-md border p-4 bg-muted/20 mt-4">
                <div className="space-y-8">
                    {Object.entries(grouped).map(([key, items]) => {
                        const [dateStr, period] = key.split(':::');
                        let dateLabel = dateStr;
                        if (dateStr !== "Sem Data") {
                            const dateObj = new Date(dateStr + 'T12:00:00'); // Force proper timezone/day
                            const today = new Date();
                            const tomorrow = new Date();
                            tomorrow.setDate(today.getDate() + 1);

                            if (dateObj.toDateString() === today.toDateString()) dateLabel = "Hoje";
                            else if (dateObj.toDateString() === tomorrow.toDateString()) dateLabel = "Amanhã";
                            else dateLabel = format(dateObj, "dd 'de' MMMM", { locale: ptBR });
                        }

                        return (
                            <div key={key} className="space-y-3">
                                <div className="flex items-center gap-2 border-b pb-2 border-slate-200">
                                    <h3 className="text-lg font-semibold text-slate-700 capitalize">
                                        {dateLabel} <span className="text-slate-400 mx-1">•</span> {period}
                                    </h3>
                                    <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                        {items.length}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {items.map(d => (
                                        <DeliveryCard key={d.id} delivery={d} onUpdateStatus={updateDeliveryStatus} onUpdateDelivery={updateDelivery} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        );
    };

    const ListWrapper = ({ children }: { children: React.ReactNode }) => (
        <ScrollArea className="h-[calc(100vh-250px)] w-full rounded-md border p-4 bg-muted/20 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children}
            </div>
        </ScrollArea>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gestão de Entregas</h2>
                    <p className="text-muted-foreground">Gerencie o fluxo de saída e entrega de produtos.</p>
                </div>
                <NewDeliveryForm onSuccess={refreshDeliveries} />
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-1 lg:w-[600px]">
                    <TabsTrigger value="pending" className="relative">
                        Pendentes
                        {pending.length > 0 && <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">{pending.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="ready">
                        Prontos
                        {ready.length > 0 && <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-blue-100 text-blue-800">{ready.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="shipping">
                        Em Rota
                        {shipping.length > 0 && <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-purple-100 text-purple-800">{shipping.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="delivered">Entregues</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-0">
                    <ListWrapper>
                        {pending.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center h-40 text-muted-foreground opacity-60">
                                <PackageX className="w-12 h-12 mb-2" />
                                <p>Nenhuma entrega pendente</p>
                            </div>
                        ) : (
                            pending.map(d => (
                                <DeliveryCard key={d.id} delivery={d} onUpdateStatus={updateDeliveryStatus} onUpdateDelivery={updateDelivery} />
                            ))
                        )}
                    </ListWrapper>
                </TabsContent>

                <TabsContent value="ready" className="mt-0">
                    <GroupedListWrapper list={ready} />
                </TabsContent>

                <TabsContent value="shipping" className="mt-0">
                    <GroupedListWrapper list={shipping} />
                </TabsContent>

                <TabsContent value="delivered" className="mt-0">
                    <ListWrapper>
                        {delivered.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center h-40 text-muted-foreground opacity-60">
                                <p>Nenhuma entrega finalizada ainda</p>
                            </div>
                        ) : (
                            delivered.map(d => (
                                <DeliveryCard key={d.id} delivery={d} onUpdateStatus={updateDeliveryStatus} onUpdateDelivery={updateDelivery} />
                            ))
                        )}
                    </ListWrapper>
                </TabsContent>
            </Tabs>
        </div>
    );
}
