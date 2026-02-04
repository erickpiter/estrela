import { useState, useEffect } from 'react';
import { Clock, Phone, RotateCcw, CheckCircle2, ShoppingBag, Pencil, XCircle, Instagram } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { formatPhoneForWhatsApp, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientCardProps {
    contact: any;
    onUpdate: (id: number, data: any) => Promise<void>;
    onMarkAsVisited: (id: number, options?: { source?: string }) => Promise<void>;
    onMarkAsNoShow: (id: number, options?: { source?: string }) => Promise<void>;
    onMarkAsPurchased: (id: number) => Promise<void>;
}

function TimePicker({ value, onChange, className }: { value: string, onChange: (val: string) => void, className?: string }) {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')); // 5 min increments

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className={cn("flex items-center justify-center bg-transparent border border-gray-300 rounded hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)}>
                    {value || "--:--"}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
                <div className="flex sm:h-[300px] h-[200px] divide-x">
                    <ScrollArea className="w-16 sm:w-20">
                        <div className="flex flex-col p-2">
                            {hours.map((hour) => (
                                <Button
                                    key={hour}
                                    variant="ghost"
                                    size="sm"
                                    className={cn("justify-center text-xs h-8", value?.startsWith(hour) && "bg-accent text-accent-foreground")}
                                    onClick={() => {
                                        const [_, min] = (value || "00:00").split(':');
                                        onChange(`${hour}:${min || '00'}`);
                                    }}
                                >
                                    {hour}
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                    <ScrollArea className="w-16 sm:w-20">
                        <div className="flex flex-col p-2">
                            {minutes.map((minute) => (
                                <Button
                                    key={minute}
                                    variant="ghost"
                                    size="sm"
                                    className={cn("justify-center text-xs h-8", value?.endsWith(minute) && "bg-accent text-accent-foreground")}
                                    onClick={() => {
                                        const [hr, _] = (value || "00:00").split(':');
                                        onChange(`${hr || '00'}:${minute}`);
                                    }}
                                >
                                    {minute}
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function ClientCard({ contact, onUpdate, onMarkAsVisited, onMarkAsNoShow, onMarkAsPurchased }: ClientCardProps) {
    const [isEditing, setIsEditing] = useState(false);



    // Determine initial status based on contact data
    const getInitialStatus = () => {
        if (contact.status_visita === 'confirmado' || contact.tags?.includes('compareceu')) return 'COMPARECEU';
        if (contact.status_visita === 'no_show') return 'NO-SHOW';
        return 'AGENDADO';
    };

    const [formData, setFormData] = useState({
        name: contact.display_name || '',
        tag: contact.tags || '',
        time: contact.data_agendamento ? new Date(contact.data_agendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        phone: contact.phone_e164 || '',
        attendant: contact.Atendente || '',
        interest: contact.interesse || '',
        exchange: contact.aparelho_de_troca || '',
        status: getInitialStatus(),
        ig: contact.IG || ''
    });

    // Derived states for UI logic (Moved after formData initialization)
    const isConfirmed = formData.status === 'COMPARECEU';
    const isSale = formData.tag.toLowerCase().includes('venda_realizada');

    // Update local state when prop changes (e.g. after save)
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            status: getInitialStatus(),
            tag: contact.tags || ''
        }));
    }, [contact]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleEdit = async () => {
        if (isEditing) {
            // Saving changes
            await handleSave();
        }
        setIsEditing(!isEditing);
    };

    const handleSave = async () => {
        const updates: any = {};

        // Compare and prepare updates
        if (formData.name !== contact.display_name) updates.display_name = formData.name;
        // Comparação mais inteligente para Telefone (tratar '' como null/undefined)
        const currentPhone = contact.phone_e164 || '';
        const newPhone = formData.phone || '';

        // Só atualiza se mudou de fato (ignorando null vs '')
        if (newPhone !== currentPhone) {
            // Se estiver vazio, manda null para o banco (para não violar unique de string vazia)
            updates.phone_e164 = newPhone === '' ? null : newPhone;
        }

        if (formData.attendant !== contact.Atendente) updates.Atendente = formData.attendant;
        if (formData.interest !== contact.interesse) updates.interesse = formData.interest;
        if (formData.exchange !== contact.aparelho_de_troca) updates.aparelho_de_troca = formData.exchange;
        if (formData.ig !== contact.IG) updates.IG = formData.ig;

        // Handle Time Update (Complex because it's an ISO string)
        if (formData.time) {
            const originalDate = contact.data_agendamento ? new Date(contact.data_agendamento) : new Date();
            const [hours, minutes] = formData.time.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
                originalDate.setHours(hours, minutes);
                const newIso = originalDate.toISOString();
                // Simple check if time effectively changed
                if (contact.data_agendamento && Math.abs(new Date(contact.data_agendamento).getTime() - originalDate.getTime()) > 60000) {
                    updates.data_agendamento = newIso;
                } else if (!contact.data_agendamento) {
                    updates.data_agendamento = newIso;
                }
            }
        }

        // Send numeric updates
        if (Object.keys(updates).length > 0) {
            await onUpdate(contact.id, updates);
        }

        // Handle Status Change
        const currentStatus = getInitialStatus();
        if (formData.status !== currentStatus) {
            if (formData.status === 'COMPARECEU') {
                await onMarkAsVisited(contact.id, { source: 'edit_mode' });
            } else if (formData.status === 'NO-SHOW') {
                await onMarkAsNoShow(contact.id, { source: 'edit_mode' });
            } else if (formData.status === 'AGENDADO' && currentStatus !== 'AGENDADO') {
                // Resetting to scheduled - clear related tags/status
                const cleanTags = (contact.tags || '')
                    .replace(/compareceu|no_show|perdido|follow_up_\d+/gi, '') // Remove statuses
                    .replace(/,,+/g, ',') // Fix commas
                    .replace(/^,|,$/g, '') // Trim commas
                    .trim();

                updates.status_visita = null; // or empty string depending on DB constraint, usually null or 'agendado' if enum
                updates.tags = cleanTags;
                updates.checkin_at = null;
                updates.motivo_no_show = null;

                // If we have updates, onUpdate below will handle it.
                // But we need to make sure onUpdate is called even if only status changed (which isn't in 'updates' list above yet)
            }
        }

        // Send updates if any (including the manual status reset we just added to updates)
        if (Object.keys(updates).length > 0) {
            await onUpdate(contact.id, updates);
        }
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
        <div className="relative border border-border/50 rounded-xl p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors group">



            {/* Header with Avatar and Info */}
            <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-muted text-foreground font-medium">
                        {getInitials(formData.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 pr-10"> {/* Padding right for buttons */}
                    {/* Row 1: Name + Tag */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isEditing ? (
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={cn("font-medium text-foreground max-w-[200px] bg-transparent outline-none truncate border border-gray-300 rounded px-1 animate-[wiggle_1s_ease-in-out_infinite]")}
                                placeholder="Nome..."
                            />
                        ) : (
                            <h4 className="font-medium text-foreground truncate max-w-[200px]">
                                {formData.name || "Sem Nome"}
                            </h4>
                        )}
                        {(formData.tag && formData.tag !== 'compareceu' && !formData.tag.includes('venda_realizada')) && (
                            <Badge variant="secondary" className="text-xs bg-muted text-foreground border-border h-5 px-2">
                                {formData.tag}
                            </Badge>
                        )}
                        {/* Status Dropdown */}
                        {isEditing && (
                            <Select
                                value={formData.status}
                                onValueChange={(value) => handleChange({ target: { name: 'status', value } } as any)}
                            >
                                <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs font-bold uppercase bg-muted border-border animate-[wiggle_1s_ease-in-out_infinite]" px-2>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AGENDADO">AGENDADO</SelectItem>
                                    <SelectItem value="COMPARECEU">COMPARECEU</SelectItem>
                                    <SelectItem value="NO-SHOW">NO-SHOW</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Row 2: Time | Attendant | Phone | IG */}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        {/* Time */}
                        {/* Time */}
                        <div className="flex items-center gap-1 min-w-[60px]">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {isEditing ? (
                                <TimePicker
                                    value={formData.time}
                                    onChange={(newTime) => handleChange({ target: { name: 'time', value: newTime } } as any)}
                                    className="h-6 w-16 text-xs px-1 animate-[wiggle_1s_ease-in-out_infinite]"
                                />
                            ) : (
                                <span className="text-sm">{formData.time}</span>
                            )}
                        </div>

                        {/* Attendant Badge */}
                        {(formData.attendant || isEditing) && (
                            <div className="flex items-center">
                                <span className={cn(
                                    "text-xs bg-muted px-2 py-0.5 rounded border flex items-center gap-1",
                                    isEditing && "border-dashed border-emerald-400"
                                )}>
                                    Agendado por:
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="attendant"
                                            value={formData.attendant}
                                            onChange={handleChange}
                                            className="bg-transparent outline-none w-16 text-xs border-b border-gray-400 animate-[wiggle_1s_ease-in-out_infinite]"
                                            placeholder="..."
                                        />
                                    ) : (
                                        <span className="font-medium">{formData.attendant}</span>
                                    )}
                                </span>
                            </div>
                        )}

                        {/* Phone */}
                        {(formData.phone || isEditing) && (
                            <div className="flex items-center gap-1 min-w-[100px]">
                                <Phone className="w-3 h-3 flex-shrink-0" />
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="bg-transparent text-sm outline-none w-28 border border-gray-300 rounded px-1 animate-[wiggle_1s_ease-in-out_infinite]"
                                    />
                                ) : (
                                    <span
                                        className="text-sm cursor-pointer hover:text-foreground transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleWhatsApp(formData.phone);
                                        }}
                                    >
                                        {formData.phone}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* IG (Shows if exists OR editing) */}
                        {(formData.ig || isEditing) && (
                            <div className="flex items-center gap-1 cursor-pointer transition-colors hover:text-foreground">
                                <Instagram className="w-3 h-3 flex-shrink-0" />
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="ig"
                                        value={formData.ig}
                                        onChange={handleChange}
                                        className="bg-transparent text-sm outline-none w-24 placeholder:text-muted-foreground/50 border border-gray-300 rounded px-1 animate-[wiggle_1s_ease-in-out_infinite]"
                                        placeholder="@instagram"
                                    />
                                ) : (
                                    <span
                                        className="text-sm"
                                        onClick={() => {
                                            if (formData.ig) {
                                                window.open(`https://instagram.com/${formData.ig.replace('@', '')}`, '_blank');
                                            }
                                        }}
                                    >
                                        {formData.ig}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Interest and Trade-in Info */}
            {(formData.interest || formData.exchange || isEditing) && (
                <div className="space-y-1 text-sm"> {/* Align with text */}
                    {(formData.interest || isEditing) && (
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-3 h-3 text-foreground" />
                            {isEditing ? (
                                <>
                                    <span className="text-foreground font-bold text-sm">Interesse:</span>
                                    <input
                                        type="text"
                                        name="interest"
                                        value={formData.interest}
                                        onChange={handleChange}
                                        className="bg-transparent text-sm outline-none flex-1 max-w-[200px] text-foreground border border-gray-300 rounded px-1 animate-[wiggle_1s_ease-in-out_infinite]"
                                        placeholder="..."
                                    />
                                </>
                            ) : (
                                <span className="text-foreground"><strong>Interesse:</strong> {formData.interest}</span>
                            )}
                        </div>
                    )}
                    {(formData.exchange || isEditing) && (
                        <div className="flex items-center gap-2">
                            <RotateCcw className="w-3 h-3 text-foreground" />
                            {isEditing ? (
                                <>
                                    <span className="text-foreground font-bold text-sm">Troca:</span>
                                    <input
                                        type="text"
                                        name="exchange"
                                        value={formData.exchange}
                                        onChange={handleChange}
                                        className="bg-transparent text-sm outline-none flex-1 max-w-[200px] text-foreground border border-gray-300 rounded px-1 animate-[wiggle_1s_ease-in-out_infinite]"
                                        placeholder="..."
                                    />
                                </>
                            ) : (
                                <span className="text-foreground"><strong>Troca:</strong> {formData.exchange}</span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Top Right Actions: Edit + Status Badges */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                {/* Confirmed Badge */}
                {isConfirmed && !isEditing && (
                    <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold border border-green-200 shadow-sm animate-in fade-in zoom-in duration-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        COMPARECEU
                    </div>
                )}

                {/* No-Show Badge */}
                {formData.status === 'NO-SHOW' && !isEditing && (
                    <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold border border-red-200 shadow-sm animate-in fade-in zoom-in duration-300">
                        <XCircle className="w-3.5 h-3.5" />
                        NÃO COMPARECEU
                    </div>
                )}

                {/* Edit Button */}
                <button
                    onClick={handleToggleEdit}
                    className={cn(
                        "p-2 rounded-full transition-colors z-20",
                        isEditing ? "bg-emerald-100 text-emerald-700 opacity-100" : "bg-muted text-muted-foreground hover:bg-muted/80 opacity-60 hover:opacity-100"
                    )}
                    title={isEditing ? "Salvar alterações" : "Editar card"}
                >
                    <Pencil size={18} />
                </button>
            </div>


            {/* Footer Buttons */}
            {/* Footer Buttons Logic: Analyzed & Enforced */}
            {(!isEditing && formData.status !== 'NO-SHOW') && (
                <div className={cn("flex w-full gap-2 pt-2 items-center", isConfirmed ? "justify-end" : "")}>
                    {isConfirmed ? (
                        /* Scenario 2 & 3: Confirmed Visit */
                        isSale ? (
                            /* Scenario 3: Sale Completed */
                            <Button
                                size="sm"
                                variant="secondary"
                                className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200 cursor-default h-9 px-4 font-medium"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Venda Confirmada
                            </Button>
                        ) : (
                            /* Scenario 2: Visit Confirmed, Pending Sale */
                            <Button
                                size="sm"
                                onClick={() => onMarkAsPurchased(contact.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9 px-4 font-medium"
                            >
                                <ShoppingBag className="w-4 h-4 mr-2" />
                                Registrar Venda
                            </Button>
                        )
                    ) : (
                        /* Scenario 1: Scheduled (Decision) */
                        <>
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 font-medium"
                                size="sm"
                                onClick={() => onMarkAsVisited(contact.id)}
                            >
                                Confirmar Presença
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-auto border-red-200 text-red-700 hover:bg-red-50 h-9 font-medium"
                                onClick={() => onMarkAsNoShow(contact.id)}
                            >
                                Não Compareceu
                            </Button>
                        </>
                    )}
                </div>
            )}

            {/* Save Button - Visible ONLY when editing */}
            {isEditing && (
                <div className="flex justify-end pt-2 pr-2">
                    <button
                        onClick={handleToggleEdit}
                        className="bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:scale-105 transition-all p-2 rounded-full shadow-sm border border-emerald-200"
                        title="Salvar alterações"
                    >
                        <CheckCircle2 className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
}
