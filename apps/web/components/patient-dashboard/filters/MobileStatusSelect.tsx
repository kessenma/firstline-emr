import React from 'react';
import { STATUS } from '@/components/ui/Table/filters';

interface MobileStatusSelectProps {
    status: string;
    onChange: (value: string) => void;
    filteredOptions?: string[];
    className?: string;
}

export function MobileStatusSelect({ 
    status, 
    onChange, 
    filteredOptions,
    className = ""
}: MobileStatusSelectProps) {
    // Use filtered options if provided, otherwise use all STATUS options
    const statusOptions = filteredOptions || STATUS;

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        console.log("🔴 MobileStatusSelect onChange triggered:", { value });
        onChange(value);
    };

    return (
        <select
            value={status || "Pre-Op / Not Cleared"}
            onChange={handleChange}
            className={`w-full p-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none cursor-pointer ${className}`}
            style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
            }}
        >
            {statusOptions.map((option) => (
            <option key={option} value={option} className="bg-background text-foreground">
                {option}
            </option>
            ))}
        </select>
    );
}
