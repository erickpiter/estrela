
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types";

type Delivery = Database['public']['Tables']['sales_estrela']['Row'];

export function useDeliveries() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const loadDeliveries = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('sales_estrela')
                .select('*')
                .eq('is_delivery', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDeliveries(data || []);
        } catch (error) {
            console.error('Error loading deliveries:', error);
            toast({
                title: "Erro ao carregar entregas",
                description: "Não foi possível buscar os dados.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Update status
    const updateDeliveryStatus = async (id: number, newStatus: Delivery['delivery_status']) => {
        try {
            const updates: any = {
                delivery_status: newStatus
            };

            if (newStatus === 'delivered') {
                updates.completed_at = new Date().toISOString();
                updates.delivery_period = null; // Clear period when delivered
                // Ensure the date counts for TODAY when delivered
                updates.scheduled_date = new Date().toLocaleDateString('en-CA');
            }

            if (newStatus === 'ready') {
                const now = new Date();
                const hour = now.getHours();

                // Logic: 
                // Before 12:00 -> Afternoon Route (Same Day)
                // After 12:00 -> Morning Route (Next Day)
                if (hour < 12) {
                    updates.delivery_period = 'Tarde';
                    updates.scheduled_date = now.toLocaleDateString('en-CA'); // Today Local
                } else {
                    updates.delivery_period = 'Manhã';
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    updates.scheduled_date = tomorrow.toLocaleDateString('en-CA'); // Tomorrow Local
                }
            }

            const { error } = await supabase
                .from('sales_estrela')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            // If delivered, mark as sale in contacts mostly for statistics?
            // User requirement: "quando for entregue e a venda for feita, deve computar como venda feita"
            // The current 'useStorePanelData' counts tags 'venda_realizada'.
            // So we need to find the contact linked to this delivery and add the tag.
            // Problem: We store 'customer_phone' snapshot in sales_estrela, but not necessarily 'contact_id'.
            // We should try to find the contact by phone to tag it.

            if (newStatus === 'delivered') {
                const delivery = deliveries.find(d => d.id === id);

                if (delivery) {
                    let contactToTag = null;

                    // 1. Try to find by Phone
                    if (delivery.customer_phone) {
                        const cleanPhone = delivery.customer_phone.replace(/\D/g, '').slice(-8); // Last 8 digits to be safe
                        const { data: contacts } = await supabase
                            .from('contacts')
                            .select('id, tags')
                            .ilike('phone_e164', `%${cleanPhone}%`)
                            .limit(1);

                        if (contacts && contacts.length > 0) {
                            contactToTag = contacts[0];
                        }
                    }

                    // 2. If not found by phone, try by Instagram
                    if (!contactToTag && delivery.customer_instagram) {
                        const cleanIg = delivery.customer_instagram.replace('@', '').trim();
                        const { data: contacts } = await supabase
                            .from('contacts')
                            .select('id, tags')
                            .ilike('IG', `%${cleanIg}%`) // Case insensitive match
                            .limit(1);

                        if (contacts && contacts.length > 0) {
                            contactToTag = contacts[0];
                        }
                    }

                    // 3. If contact found, update tags
                    if (contactToTag) {
                        if (!contactToTag.tags?.includes('venda_realizada')) {
                            const newTags = contactToTag.tags ? `${contactToTag.tags},venda_realizada` : 'venda_realizada';
                            await supabase.from('contacts').update({ tags: newTags }).eq('id', contactToTag.id);

                            toast({
                                title: "Venda contabilizada!",
                                description: "Contato vinculado e venda registrada.",
                                className: "bg-blue-50 border-blue-200 text-blue-800"
                            });
                        }
                    } else {
                        console.warn("Could not find contact to tag for delivery:", delivery);
                    }
                }
            }

            toast({
                title: "Status atualizado!",
                description: `Entrega marcada como ${newStatus}.`,
                className: "bg-green-50 border-green-200 text-green-800"
            });

            loadDeliveries();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Erro ao atualizar",
                description: "Tente novamente.",
                variant: "destructive"
            });
        }
    };

    // Generic Update
    const updateDelivery = async (id: number, updates: Partial<Delivery>) => {
        try {
            const { error } = await supabase
                .from('sales_estrela')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "Entrega atualizada!",
                className: "bg-green-50 border-green-200 text-green-800"
            });

            loadDeliveries();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Erro ao atualizar",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    useEffect(() => {
        loadDeliveries();

        // Realtime subscription
        const channel = supabase
            .channel('sales_estrela_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_estrela' }, () => {
                loadDeliveries();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return {
        deliveries,
        loading,
        updateDeliveryStatus,
        updateDelivery,
        refreshDeliveries: loadDeliveries
    };
}
