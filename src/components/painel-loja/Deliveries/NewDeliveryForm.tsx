
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus } from "lucide-react";

interface NewDeliveryFormProps {
    onSuccess: () => void;
}

export function NewDeliveryForm({ onSuccess }: NewDeliveryFormProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        customer_name: "",
        customer_phone: "",
        customer_instagram: "",
        product_name: "",
        product_category: "iphone",
        total_value: "",
        payment_method: "credit",
        payment_details: "",
        delivery_address: "",
        delivery_reference_point: "",
        salesperson_name: localStorage.getItem('last_salesperson') || ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleValueChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.customer_name || !formData.product_name || !formData.delivery_address) {
                toast({
                    title: "Campos obrigatórios",
                    description: "Preencha nome, produto e endereço.",
                    variant: "destructive"
                });
                return;
            }

            if (!formData.customer_phone && !formData.customer_instagram) {
                toast({
                    title: "Contato necessário",
                    description: "Informe pelo menos um telefone ou Instagram.",
                    variant: "destructive"
                });
                return;
            }

            // Save salesperson for convenience
            if (formData.salesperson_name) {
                localStorage.setItem('last_salesperson', formData.salesperson_name);
            }

            const { error } = await supabase
                .from('sales_estrela')
                .insert({
                    customer_name: formData.customer_name,
                    customer_phone: formData.customer_phone,
                    customer_instagram: formData.customer_instagram,
                    product_name: formData.product_name,
                    product_category: formData.product_category,
                    total_value: parseFloat(formData.total_value.replace(',', '.') || '0'),
                    payment_method: formData.payment_method,
                    payment_details: formData.payment_details,
                    delivery_address: formData.delivery_address,
                    delivery_reference_point: formData.delivery_reference_point,
                    salesperson_name: formData.salesperson_name,
                    is_delivery: true,
                    delivery_status: 'pending'
                });

            if (error) throw error;

            toast({
                title: "Entrega Criada!",
                description: "O pedido foi adicionado à lista de pendentes.",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            setOpen(false);
            setFormData({
                customer_name: "",
                customer_phone: "",
                customer_instagram: "",
                product_name: "",
                product_category: "iphone",
                total_value: "",
                payment_method: "credit",
                payment_details: "",
                delivery_address: "",
                delivery_reference_point: "",
                salesperson_name: formData.salesperson_name
            });
            onSuccess();

        } catch (error: any) {
            console.error(error);
            toast({
                title: "Erro ao criar entrega",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Nova Entrega
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Nova Entrega</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">

                    {/* Cliente */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="customer_name">Nome do Cliente</Label>
                            <Input id="customer_name" name="customer_name" value={formData.customer_name} onChange={handleChange} placeholder="Ex: João Silva" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer_phone">Telefone / WhatsApp</Label>
                            <Input id="customer_phone" name="customer_phone" value={formData.customer_phone} onChange={handleChange} placeholder="(00) 00000-0000" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer_instagram">Instagram (Opcional)</Label>
                            <Input id="customer_instagram" name="customer_instagram" value={formData.customer_instagram} onChange={handleChange} placeholder="@usuario" />
                        </div>
                    </div>

                    {/* Vendedor */}
                    <div className="space-y-2">
                        <Label htmlFor="salesperson_name">Nome do Vendedor</Label>
                        <Input id="salesperson_name" name="salesperson_name" value={formData.salesperson_name} onChange={handleChange} placeholder="Quem realizou a venda?" />
                    </div>

                    {/* Produto */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="product_name">Produto</Label>
                            <Input id="product_name" name="product_name" value={formData.product_name} onChange={handleChange} placeholder="Ex: iPhone 13 Pro" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="product_category">Categoria</Label>
                            <Select value={formData.product_category} onValueChange={(v) => handleValueChange("product_category", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
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
                        </div>
                    </div>

                    {/* Endereço */}
                    <div className="space-y-2">
                        <Label htmlFor="delivery_address">Endereço de Entrega</Label>
                        <Textarea id="delivery_address" name="delivery_address" value={formData.delivery_address} onChange={handleChange} placeholder="Rua, Número, Bairro, Cidade" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="delivery_reference_point">Ponto de Referência</Label>
                        <Input id="delivery_reference_point" name="delivery_reference_point" value={formData.delivery_reference_point} onChange={handleChange} placeholder="Próximo ao mercado X..." />
                    </div>

                    {/* Pagamento */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 col-span-1">
                            <Label htmlFor="total_value">Valor (R$)</Label>
                            <Input id="total_value" name="total_value" value={formData.total_value} onChange={handleChange} placeholder="0,00" type="number" step="0.01" />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="payment_method">Forma de Pagamento</Label>
                            <Select value={formData.payment_method} onValueChange={(v) => handleValueChange("payment_method", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="credit">Cartão de Crédito</SelectItem>
                                    <SelectItem value="pix">Pix</SelectItem>
                                    <SelectItem value="cash">Dinheiro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="payment_details">Detalhes do Pagamento (Parcelas/Taxas)</Label>
                        <Input id="payment_details" name="payment_details" value={formData.payment_details} onChange={handleChange} placeholder="Ex: 12x de R$ 150,00" />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Salvar Entrega
                        </Button>
                    </div>

                </form>
            </DialogContent>
        </Dialog>
    );
}
