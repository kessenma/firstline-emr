"use client";

import * as React from "react";
import { useState } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useFormContext } from "react-hook-form";

interface TimePickerFormFieldProps {
    name: string;
    label?: string;
    value?: string;
    onChange?: (time: string) => void;
}

export function TimePickerFormField({ name, label, value, onChange }: TimePickerFormFieldProps) {
    const { control, setValue } = useFormContext();
    const [selectedTime, setSelectedTime] = useState<string | undefined>(value);
    const [isOpen, setIsOpen] = useState(false);

    const handleTimeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedTime(event.target.value);
        setValue(name, event.target.value);
        if (onChange) onChange(event.target.value);
    };

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>{label}</FormLabel>
                    <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={"outline"}
                                    className="w-[240px] pl-3 text-left font-normal"
                                    onClick={() => setIsOpen(!isOpen)}
                                >
                                    {selectedTime || "Select Time"}
                                    <Clock className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2">
                            <select className="w-full p-2 border border-border rounded bg-background" onChange={handleTimeChange} value={selectedTime}>
                                {Array.from({ length: 24 }, (_, hour) =>
                                    ["00", "15", "30", "45"].map((minute) => {
                                        const time = `${hour.toString().padStart(2, "0")}:${minute}`;
                                        return (
                                            <option key={time} value={time}>
                                                {time}
                                            </option>
                                        );
                                    })
                                )}
                            </select>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
