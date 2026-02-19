export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            contacts: {
                Row: {
                    id: number
                    phone_e164: string | null
                    display_name: string | null
                    wa_user_id: string | null
                    source: string | null
                    created_at: string | null
                    interesse: string | null
                    follow_up: string | null
                    data_agendamento: string | null
                    ultimo_contato: string | null
                    categoria_atendimento: string | null
                    aparelho_de_troca: string | null
                    tags: string | null
                    marcado_em_data: string | null
                    IG: string | null
                    Atendente: string | null
                    status_visita: 'agendado' | 'confirmado' | 'no_show' | 'reagendado' | 'cancelado' | null
                    motivo_no_show: string | null
                    checkin_at: string | null
                    checkout_at: string | null
                }
                Insert: {
                    id?: number
                    phone_e164?: string | null
                    display_name?: string | null
                    wa_user_id?: string | null
                    source?: string | null
                    created_at?: string | null
                    interesse?: string | null
                    follow_up?: string | null
                    data_agendamento?: string | null
                    ultimo_contato?: string | null
                    categoria_atendimento?: string | null
                    aparelho_de_troca?: string | null
                    tags?: string | null
                    marcado_em_data?: string | null
                    IG?: string | null
                    Atendente?: string | null
                    status_visita?: 'agendado' | 'confirmado' | 'no_show' | 'reagendado' | 'cancelado' | null
                    motivo_no_show?: string | null
                    checkin_at?: string | null
                    checkout_at?: string | null
                }
                Update: {
                    id?: number
                    phone_e164?: string | null
                    display_name?: string | null
                    wa_user_id?: string | null
                    source?: string | null
                    created_at?: string | null
                    interesse?: string | null
                    follow_up?: string | null
                    data_agendamento?: string | null
                    ultimo_contato?: string | null
                    categoria_atendimento?: string | null
                    aparelho_de_troca?: string | null
                    tags?: string | null
                    marcado_em_data?: string | null
                    IG?: string | null
                    Atendente?: string | null
                    status_visita?: 'agendado' | 'confirmado' | 'no_show' | 'reagendado' | 'cancelado' | null
                    motivo_no_show?: string | null
                    checkin_at?: string | null
                    checkout_at?: string | null
                }
            }
            sales: {
                Row: {
                    id: number
                    contact_id: number | null
                    total_value: number
                    payment_method: string
                    status: string
                    created_at: string
                    salesperson_name: string | null
                    notes: string | null
                }
                Insert: {
                    id?: number
                    contact_id?: number | null
                    total_value: number
                    payment_method: string
                    status: string
                    created_at?: string
                    salesperson_name?: string | null
                    notes?: string | null
                }
                Update: {
                    id?: number
                    contact_id?: number | null
                    total_value?: number
                    payment_method?: string
                    status?: string
                    created_at?: string
                    salesperson_name?: string | null
                    notes?: string | null
                }
            }
            sales_items: {
                Row: {
                    id: number
                    sale_id: number
                    product_id: number
                    quantity: number
                    unit_price: number
                    total_price: number
                }
                Insert: {
                    id?: number
                    sale_id: number
                    product_id: number
                    quantity: number
                    unit_price: number
                    total_price: number
                }
                Update: {
                    id?: number
                    sale_id?: number
                    product_id?: number
                    quantity?: number
                    unit_price?: number
                    total_price?: number
                }
            }
            inventory: {
                Row: {
                    id: number
                    product_name: string
                    unit_price: number
                    stock_quantity: number
                    reserved_quantity: number
                    low_stock_threshold: number
                    category: string | null
                    active: boolean
                }
                Insert: {
                    id?: number
                    product_name: string
                    unit_price: number
                    stock_quantity: number
                    reserved_quantity?: number
                    low_stock_threshold?: number
                    category?: string | null
                    active?: boolean
                }
                Update: {
                    id?: number
                    product_name?: string
                    unit_price?: number
                    stock_quantity?: number
                    reserved_quantity?: number
                    low_stock_threshold?: number
                    category?: string | null
                    active?: boolean
                }
            },
            settings: {
                Row: {
                    key: string
                    value: Json
                    updated_at: string
                }
                Insert: {
                    key: string
                    value: Json
                    updated_at?: string
                }
                Update: {
                    key?: string
                    value?: Json
                    updated_at?: string
                }
            },
            sales_estrela: {
                Row: {
                    id: number
                    created_at: string
                    product_category: string | null
                    product_name: string | null
                    total_value: number | null
                    payment_method: string | null
                    payment_details: string | null
                    customer_name: string | null
                    customer_phone: string | null
                    customer_instagram: string | null
                    is_delivery: boolean
                    delivery_status: 'pending' | 'ready' | 'shipping' | 'delivered' | 'cancelled' | null
                    delivery_address: string | null
                    delivery_reference_point: string | null
                    salesperson_name: string | null
                    notes: string | null
                    completed_at: string | null
                    completed_at: string | null
                    delivery_period: string | null
                    scheduled_date: string | null
                }
                Insert: {
                    id?: number
                    created_at?: string
                    product_category?: string | null
                    product_name?: string | null
                    total_value?: number | null
                    payment_method?: string | null
                    payment_details?: string | null
                    customer_name?: string | null
                    customer_phone?: string | null
                    customer_instagram?: string | null
                    is_delivery?: boolean
                    delivery_status?: 'pending' | 'ready' | 'shipping' | 'delivered' | 'cancelled' | null
                    delivery_address?: string | null
                    delivery_reference_point?: string | null
                    salesperson_name?: string | null
                    notes?: string | null
                    completed_at?: string | null
                    completed_at?: string | null
                    delivery_period?: string | null
                    scheduled_date?: string | null
                }
                Update: {
                    id?: number
                    created_at?: string
                    product_category?: string | null
                    product_name?: string | null
                    total_value?: number | null
                    payment_method?: string | null
                    payment_details?: string | null
                    customer_name?: string | null
                    customer_phone?: string | null
                    customer_instagram?: string | null
                    is_delivery?: boolean
                    delivery_status?: 'pending' | 'ready' | 'shipping' | 'delivered' | 'cancelled' | null
                    delivery_address?: string | null
                    delivery_reference_point?: string | null
                    salesperson_name?: string | null
                    notes?: string | null
                    completed_at?: string | null
                    completed_at?: string | null
                    delivery_period?: string | null
                    scheduled_date?: string | null
                }
            }
        }
    }
}
