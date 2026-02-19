
import { useState } from "react";
import { Database } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, User, DollarSign, Package, Truck, CheckCircle, XCircle, Clock, Instagram, Headphones, Shield, Smartphone, Pencil, Save, Navigation, ExternalLink, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Delivery = Database['public']['Tables']['sales_estrela']['Row'];

interface DeliveryCardProps {
    delivery: Delivery;
    onUpdateStatus: (id: number, newStatus: Delivery['delivery_status']) => void;
    onUpdateDelivery: (id: number, updates: Partial<Delivery>) => void;
}

export function DeliveryCard({ delivery, onUpdateStatus, onUpdateDelivery }: DeliveryCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        customer_name: delivery.customer_name || "",
        customer_phone: delivery.customer_phone || "",
        customer_instagram: delivery.customer_instagram || "",
        product_name: delivery.product_name || "",
        product_category: delivery.product_category || "iphone",
        delivery_address: delivery.delivery_address || "",
        delivery_reference_point: delivery.delivery_reference_point || "",
        total_value: delivery.total_value?.toString() || "",
        payment_method: delivery.payment_method || "credit",
        payment_details: delivery.payment_details || "",
        delivery_period: delivery.delivery_period || "",
        scheduled_date: delivery.scheduled_date || ""
    });

    const openMap = (address: string) => {
        if (!address) return;
        const encoded = encodeURIComponent(address);
        // Opens Google Maps Search
        window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
    };

    const openWhatsApp = (phone: string | null) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleValueChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleEdit = () => {
        if (isEditing) {
            handleSave();
        }
        setIsEditing(!isEditing);
    };

    const handleSave = () => {
        onUpdateDelivery(delivery.id, {
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone,
            customer_instagram: formData.customer_instagram,
            product_name: formData.product_name,
            product_category: formData.product_category,
            delivery_address: formData.delivery_address,
            delivery_reference_point: formData.delivery_reference_point,
            total_value: parseFloat(formData.total_value.replace(',', '.') || '0'),
            payment_method: formData.payment_method,
            payment_details: formData.payment_details,
            delivery_period: formData.delivery_period,
            scheduled_date: formData.scheduled_date
        });
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'ready': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'shipping': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string | null) => {
        switch (status) {
            case 'pending': return 'Pendente';
            case 'ready': return 'Pronto';
            case 'shipping': return 'Em Rota';
            case 'delivered': return 'Entregue';
            case 'cancelled': return 'Cancelado';
            default: return 'Desconhecido';
        }
    };

    const getCategoryIcon = (category: string | null) => {
        switch (category) {
            case 'audio': return <Headphones className="w-4 h-4 text-primary" />;
            case 'protection': return <Shield className="w-4 h-4 text-primary" />;
            case 'iphone':
            case 'xiaomi': return <Smartphone className="w-4 h-4 text-primary" />;
            default: return <Package className="w-4 h-4 text-primary" />;
        }
    };

    return (
        <Card className="w-full shadow-sm hover:shadow-md transition-all border-l-4 group relative" style={{
            borderLeftColor: delivery.delivery_status === 'delivered' ? '#10b981' :
                delivery.delivery_status === 'shipping' ? '#8b5cf6' :
                    delivery.delivery_status === 'ready' ? '#3b82f6' : '#f59e0b'
        }}>
            {/* Edit Button */}
            <div className="absolute top-2 right-2 z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleEdit}
                    className={cn(
                        "h-8 w-8 rounded-full transition-colors",
                        isEditing ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-muted"
                    )}
                >
                    {isEditing ? <Save className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
            </div>

            <CardHeader className="p-4 pb-2 flex flex-col md:flex-row items-start justify-between space-y-2 md:space-y-0 relative">
                <div className="flex flex-col w-full pr-8">
                    {isEditing ? (
                        <Input
                            name="customer_name"
                            value={formData.customer_name}
                            onChange={handleChange}
                            className="h-7 text-lg font-bold mb-1"
                            placeholder="Nome do Cliente"
                        />
                    ) : (
                        <span className="font-bold text-lg flex items-center gap-2 truncate">
                            {delivery.customer_name}
                        </span>
                    )}

                    <div className="flex flex-col gap-1 mt-1">
                        {isEditing ? (
                            <>
                                <Input
                                    name="customer_phone"
                                    value={formData.customer_phone}
                                    onChange={handleChange}
                                    className="h-6 text-xs mb-1"
                                    placeholder="Telefone"
                                />
                                <Input
                                    name="customer_instagram"
                                    value={formData.customer_instagram}
                                    onChange={handleChange}
                                    className="h-6 text-xs"
                                    placeholder="Instagram"
                                />
                            </>
                        ) : (
                            <div className="flex flex-wrap items-center gap-3">
                                {delivery.customer_phone && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-0 text-xs text-muted-foreground hover:text-green-600 flex items-center gap-1"
                                        onClick={() => openWhatsApp(delivery.customer_phone)}
                                    >
                                        <MessageCircle className="w-3 h-3" /> {delivery.customer_phone}
                                    </Button>
                                )}
                                {delivery.customer_instagram && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Instagram className="w-3 h-3" /> {delivery.customer_instagram}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {!isEditing && (
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0 md:mr-8 justify-end">
                        {delivery.delivery_period && delivery.delivery_status !== 'delivered' && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 whitespace-nowrap flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {delivery.scheduled_date ? format(new Date(delivery.scheduled_date), 'dd/MM', { locale: ptBR }) : ''} - {delivery.delivery_period}
                            </Badge>
                        )}
                        <Badge variant="outline" className={`${getStatusColor(delivery.delivery_status)} whitespace-nowrap`}>
                            {getStatusLabel(delivery.delivery_status)}
                        </Badge>
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-4 py-2 space-y-3">

                {/* Produto */}
                <div className="flex items-center gap-2 bg-secondary/30 p-2 rounded-md">
                    {getCategoryIcon(formData.product_category)}
                    <div className="flex flex-col w-full">
                        {isEditing ? (
                            <>
                                <Input
                                    name="product_name"
                                    value={formData.product_name}
                                    onChange={handleChange}
                                    className="h-7 text-sm font-medium bg-transparent border-0 border-b rounded-none px-0 focus-visible:ring-0 mb-1"
                                    placeholder="Nome do Produto"
                                />
                                <Select value={formData.product_category} onValueChange={(v) => handleValueChange("product_category", v)}>
                                    <SelectTrigger className="h-6 text-xs w-full bg-transparent border-0 border-b rounded-none px-0 focus:ring-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="iphone">iPhone</SelectItem>
                                        <SelectItem value="xiaomi">Xiaomi</SelectItem>
                                        <SelectItem value="audio">Fones / Áudio</SelectItem>
                                        <SelectItem value="protection">Blindagem / Proteção</SelectItem>
                                        <SelectItem value="acessorios">Outros Acessórios</SelectItem>
                                        <SelectItem value="outros">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        ) : (
                            <>
                                <span className="text-sm font-medium">{delivery.product_name}</span>
                                <span className="text-xs text-muted-foreground capitalize">
                                    {delivery.product_category === 'audio' ? 'Áudio/Fones' :
                                        delivery.product_category === 'protection' ? 'Blindagem' :
                                            delivery.product_category}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Endereço */}
                <div className="space-y-1 bg-slate-50 p-2 rounded-md border border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 w-full">
                            <MapPin className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                            {isEditing ? (
                                <Textarea
                                    name="delivery_address"
                                    value={formData.delivery_address}
                                    onChange={handleChange}
                                    className="min-h-[60px] text-xs p-2 bg-white"
                                    placeholder="Endereço completo"
                                />
                            ) : (
                                <span className={cn("break-words font-medium", delivery.delivery_status === 'shipping' && "text-base")}>
                                    {delivery.delivery_address}
                                </span>
                            )}
                        </div>
                        {!isEditing && delivery.delivery_address && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 shadow-sm"
                                onClick={() => openMap(delivery.delivery_address!)}
                                title="Abrir no Maps"
                            >
                                <Navigation className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    {isEditing ? (
                        <Input
                            name="delivery_reference_point"
                            value={formData.delivery_reference_point}
                            onChange={handleChange}
                            className="h-6 text-xs mt-1 bg-white"
                            placeholder="Ponto de referência"
                        />
                    ) : (
                        delivery.delivery_reference_point && (
                            <p className="text-xs text-muted-foreground pl-6 italic">
                                Ref: {delivery.delivery_reference_point}
                            </p>
                        )
                    )}
                </div>

                {/* Pagamento */}
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        {isEditing ? (
                            <Select value={formData.payment_method} onValueChange={(v) => handleValueChange("payment_method", v)}>
                                <SelectTrigger className="h-6 text-xs w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="credit">Crédito</SelectItem>
                                    <SelectItem value="pix">Pix</SelectItem>
                                    <SelectItem value="cash">Dinheiro</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <span>{delivery.payment_method === 'credit' ? 'Crédito' : delivery.payment_method === 'pix' ? 'Pix' : 'Dinheiro'}</span>
                        )}
                    </div>
                    <div className="font-medium text-right">
                        {isEditing ? (
                            <Input
                                name="total_value"
                                value={formData.total_value}
                                onChange={handleChange}
                                className="h-6 text-right w-full"
                                placeholder="Valor"
                                type="number"
                            />
                        ) : (
                            delivery.total_value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        )}
                    </div>
                    {(isEditing || delivery.payment_details) && (
                        <div className="col-span-2 text-xs bg-yellow-50 text-yellow-800 p-1.5 rounded px-2">
                            {isEditing ? (
                                <Input
                                    name="payment_details"
                                    value={formData.payment_details}
                                    onChange={handleChange}
                                    className="h-6 text-xs bg-white mb-1"
                                    placeholder="Detalhes (12x...)"
                                />
                            ) : (
                                `Obs: ${delivery.payment_details}`
                            )}
                        </div>
                    )}

                    {isEditing && (
                        <div className="col-span-2 text-xs bg-orange-50 text-orange-800 p-1.5 rounded px-2 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="whitespace-nowrap font-bold w-10">Rota:</span>
                                <Select
                                    value={formData.delivery_period}
                                    onValueChange={(value) => handleValueChange("delivery_period", value)}
                                >
                                    <SelectTrigger className="h-6 text-xs bg-white w-full">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Manhã">Manhã</SelectItem>
                                        <SelectItem value="Tarde">Tarde</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="whitespace-nowrap font-bold w-10">Data:</span>
                                <Input
                                    type="date"
                                    name="scheduled_date"
                                    value={formData.scheduled_date}
                                    onChange={handleChange}
                                    className="h-6 text-xs bg-white"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t mt-2">
                    <Clock className="w-3 h-3" />
                    Criado em: {delivery.created_at ? format(new Date(delivery.created_at), "dd/MM 'às' HH:mm", { locale: ptBR }) : '-'}
                </div>

            </CardContent>

            {/* Ações available only when NOT editing */}
            {!isEditing && (
                <CardFooter className="p-3 bg-secondary/10 flex justify-end gap-2">
                    {delivery.delivery_status === 'pending' && (
                        <Button size="sm" onClick={() => onUpdateStatus(delivery.id, 'ready')} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" /> Marcar Pronto
                        </Button>
                    )}
                    {delivery.delivery_status === 'ready' && (
                        <Button size="sm" onClick={() => onUpdateStatus(delivery.id, 'shipping')} className="bg-purple-600 hover:bg-purple-700 h-8 text-xs">
                            <Truck className="w-3 h-3 mr-1" /> Enviar
                        </Button>
                    )}
                    {delivery.delivery_status === 'shipping' && (
                        <Button size="sm" onClick={() => onUpdateStatus(delivery.id, 'delivered')} className="bg-green-600 hover:bg-green-700 h-8 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" /> Entregue
                        </Button>
                    )}
                    {delivery.delivery_status !== 'delivered' && delivery.delivery_status !== 'cancelled' && (
                        <Button size="sm" variant="outline" onClick={() => onUpdateStatus(delivery.id, 'cancelled')} className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50">
                            <XCircle className="w-3 h-3" />
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}
