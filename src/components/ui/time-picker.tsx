import * as React from "react";
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TimePickerProps {
    value: string; // Format "HH:mm"
    onChange: (value: string) => void;
    className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [open, setOpen] = React.useState(false);

    // Parse current value
    const [hours, minutes] = value ? value.split(':').map(Number) : [null, null];

    const hoursList = Array.from({ length: 24 }, (_, i) => i);
    const minutesList = Array.from({ length: 60 }, (_, i) => i);

    const handleTimeChange = (type: 'hour' | 'minute', val: number) => {
        let newHour = hours !== null ? hours : 0;
        let newMinute = minutes !== null ? minutes : 0;

        if (type === 'hour') {
            newHour = val;
        } else {
            newMinute = val;
        }

        const formattedHour = newHour.toString().padStart(2, '0');
        const formattedMinute = newMinute.toString().padStart(2, '0');

        onChange(`${formattedHour}:${formattedMinute}`);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <Clock className="mr-2 h-4 w-4" />
                    {value ? value : "Selecione o horário"}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                    <ScrollArea className="w-full sm:w-auto h-[300px]">
                        <div className="flex sm:flex-col p-2">
                            {hoursList.map((hour) => (
                                <Button
                                    key={hour}
                                    size="icon"
                                    variant={hours === hour ? "default" : "ghost"}
                                    className="sm:w-full shrink-0 aspect-square"
                                    onClick={() => handleTimeChange('hour', hour)}
                                >
                                    {hour.toString().padStart(2, '0')}
                                </Button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="sm:hidden" />
                    </ScrollArea>
                    <ScrollArea className="w-full sm:w-auto h-[300px]">
                        <div className="flex sm:flex-col p-2">
                            {minutesList.map((minute) => (
                                <Button
                                    key={minute}
                                    size="icon"
                                    variant={minutes === minute ? "default" : "ghost"}
                                    className="sm:w-full shrink-0 aspect-square"
                                    onClick={() => handleTimeChange('minute', minute)}
                                >
                                    {minute.toString().padStart(2, '0')}
                                </Button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="sm:hidden" />
                    </ScrollArea>
                </div>
                <div className="p-3 border-t">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Horário: {value || "--:--"}</span>
                        <Button size="sm" onClick={() => setOpen(false)}>Confirmar</Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
