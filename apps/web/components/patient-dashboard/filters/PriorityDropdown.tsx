// apps/web/components/patient-dashboard/PriorityDropdown.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PRIORITIES } from '@/components/ui/Table/filters';
import { ChevronDown } from 'lucide-react';
import { CircleLoader } from "react-spinners";
import useDashboardStore from '@/stores/useDashboardStore';
import { motion, AnimatePresence } from "framer-motion";

interface PriorityDropdownProps {
    priority: string;
    onChange: (value: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
    isHeader?: boolean;
    filteredOptions?: string[];
    loadingState?: string | boolean;
}

export function PriorityDropdown({ priority, onChange, isLoading = false, disabled = false, isHeader = false, filteredOptions, loadingState }: PriorityDropdownProps) {
    const { filters, updateFilters } = useDashboardStore();

    // Track hover state & mouse position for tooltip
    const [isHovered, setIsHovered] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const handleMouseEnter = (e: React.MouseEvent) => {
        setMousePosition({ x: e.clientX, y: e.clientY });
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    const tooltipMessage = (disabled && typeof loadingState === 'string' && loadingState !== 'priority')
        ? `Please wait for ${loadingState} to update.`
        : null;

    // Use filtered options if provided, otherwise use all PRIORITIES options
    const priorityOptions = filteredOptions || PRIORITIES;

    const handleChange = (value: string) => {
        console.log("🟡 PriorityDropdown onChange triggered:", { value, isHeader });
        if (isHeader) {
            updateFilters({ priority: value || undefined });
        } else {
            onChange(value);
        }
    };
    
    return (
        <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        disabled={isLoading || disabled}
                    >
                        {isLoading ? (
                            <CircleLoader size={16} color="#888888" />
                        ) : (
                            <>
                                {isHeader ? null : priority}
                                <ChevronDown className={`h-4 w-4 ${isHeader ? '' : 'ml-2'}`} />
                            </>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-46">
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={isHeader ? (filters.priority ?? '') : priority} onValueChange={handleChange}>
                        {priorityOptions.map((p) => (
                            <DropdownMenuRadioItem key={p} value={p}>{p}</DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <AnimatePresence>
                {isHovered && tooltipMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{
                            position: "fixed",
                            top: mousePosition.y + 15,
                            left: mousePosition.x + 15,
                            zIndex: 9999,
                        }}
                        className="pointer-events-none w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl border border-gray-700"
                    >
                        <div className="relative z-10">{tooltipMessage}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

