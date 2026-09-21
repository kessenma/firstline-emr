// components/form/DatePickerFormField.tsx
"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { useFormContext } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/utils/classNames";
import { Button } from "./../ui/button";
import { Input } from "./../ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useEffect, useMemo, useState } from "react";
import { isValid, parse, startOfDay } from "date-fns";

interface CalendarProps {
  className?: string;
  classNames?: any;
  showOutsideDays?: boolean;
  type?: "future" | "past";
  selected?: Date | undefined;
  onSelect?: (date: Date | undefined) => void;
  mode?: "single" | "range" | "multiple";
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  type = "future",
  mode = "single",
  selected,
  onSelect,
  ...props
}: CalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = React.useState(
    selected?.getFullYear() || today.getFullYear(),
  );
  const [month, setMonth] = React.useState(
    selected?.getMonth() || today.getMonth(),
  );
  const [showYearPicker, setShowYearPicker] = React.useState(false);
  const [showMonthPicker, setShowMonthPicker] = React.useState(false);

  const yearsToShow = 100;

  const years = React.useMemo(() => {
    if (type === "future") {
      return Array.from(
        { length: yearsToShow },
        (_, i) => today.getFullYear() + i,
      );
    } else {
      return Array.from(
        { length: yearsToShow },
        (_, i) => today.getFullYear() - i,
      ).reverse();
    }
  }, [type, today]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setYear(date.getFullYear());
      setMonth(date.getMonth());
      onSelect?.(date);
    }
  };

  const goToNextMonth = () => {
    const nextMonth = (month + 1) % 12;
    const nextYear = month === 11 ? year + 1 : year;
    setMonth(nextMonth);
    setYear(nextYear);
  };

  const goToPreviousMonth = () => {
    const prevMonth = (month - 1 + 12) % 12;
    const prevYear = month === 0 ? year - 1 : year;
    setMonth(prevMonth);
    setYear(prevYear);
  };

  const selectYear = (selectedYear: number) => {
    setYear(selectedYear);
    const newDate = new Date(
      selectedYear,
      month,
      selected?.getDate() || today.getDate(),
    );
    onSelect?.(newDate);
    setShowYearPicker(false);
  };

  const selectMonth = (selectedMonth: number) => {
    setMonth(selectedMonth);
    const newDate = new Date(
      year,
      selectedMonth,
      selected?.getDate() || today.getDate(),
    );
    onSelect?.(newDate);
    setShowMonthPicker(false);
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className={cn("p-3 w-80", className)}>
      <AnimatePresence mode="wait">
        {showYearPicker ? (
          <motion.div
            key="year-picker"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="text-lg font-semibold text-center">Select Year</div>
            <div className="grid overflow-y-auto grid-cols-4 gap-2 max-h-64">
              {years.map((y) => (
                <motion.div
                  key={y}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={y === year ? "default" : "outline"}
                    onClick={() => selectYear(y)}
                    className="h-12 w-full"
                  >
                    {y}
                  </Button>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-center">
              <Button variant="ghost" onClick={() => setShowYearPicker(false)}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : showMonthPicker ? (
          <motion.div
            key="month-picker"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="text-lg font-semibold text-center">
              Select Month
            </div>
            <div className="grid grid-cols-3 gap-2">
              {months.map((monthName, index) => (
                <motion.div
                  key={monthName}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={index === month ? "default" : "outline"}
                    onClick={() => selectMonth(index)}
                    className="h-12 w-full"
                  >
                    {monthName}
                  </Button>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-center">
              <Button variant="ghost" onClick={() => setShowMonthPicker(false)}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="day-picker"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between items-center mb-4">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </motion.div>
              <div className="flex gap-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowYearPicker(true)}
                  >
                    {year}
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMonthPicker(true)}
                  >
                    {format(new Date(year, month), "MMMM")}
                  </Button>
                </motion.div>
              </div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
            <DayPicker
              mode={mode as "single"}
              selected={selected}
              onSelect={handleDateSelect}
              month={new Date(year, month)}
              showOutsideDays={showOutsideDays}
              className={classNames?.root}
              modifiersClassNames={{
                selected:
                  "bg-transparent text-primary border-2 border-primary hover:bg-primary/10 hover:text-primary focus:bg-primary focus:text-primary-foreground rounded-full",
              }}
              classNames={{
                ...classNames,
                caption: "hidden",
                caption_label: "hidden",
                nav: "hidden",
                nav_button: "hidden",
                nav_button_previous: "hidden",
                nav_button_next: "hidden",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell:
                  "text-muted-foreground rounded-md w-10 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                day: cn(
                  "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-full transition-all duration-200",
                  "hover:bg-accent hover:text-accent-foreground hover:scale-105",
                ),
                day_selected:
                  "bg-transparent text-primary border-2 border-primary hover:bg-primary/10 hover:text-primary focus:bg-primary focus:text-primary-foreground rounded-full",
                selected:
                  "bg-transparent text-primary border-2 border-primary hover:bg-primary/10 hover:text-primary focus:bg-primary focus:text-primary-foreground rounded-full",
                day_today: "bg-accent text-accent-foreground rounded-full",
                today: "bg-accent text-accent-foreground rounded-full",
                day_outside: "text-muted-foreground opacity-50",
                outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                disabled: "text-muted-foreground opacity-50",
                day_range_middle:
                  "aria-selected:bg-accent aria-selected:text-accent-foreground",
                range_middle:
                  "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
                hidden: "invisible",
                ...classNames,
              }}
              disabled={
                type === "future"
                  ? (date) => date < new Date()
                  : (date) => date > new Date()
              }
              {...props}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Standalone DatePicker (no react-hook-form dependency)
interface DatePickerProps {
  label?: string;
  type?: "future" | "past";
  value?: string; // ISO date string or YYYY-MM-DD
  onChange?: (dateStr: string) => void;
  className?: string;
  placeholder?: string;
}

export function DatePicker({
  label,
  type = "future",
  value,
  onChange,
  className,
  placeholder = "MM/DD/YYYY",
}: DatePickerProps) {
  const parsedValue = value ? startOfDay(new Date(value)) : undefined;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    parsedValue && isValid(parsedValue) ? parsedValue : undefined,
  );
  const [inputValue, setInputValue] = useState(
    parsedValue && isValid(parsedValue) ? format(parsedValue, "MM/dd/yyyy") : "",
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (value) {
      const d = startOfDay(new Date(value));
      if (isValid(d)) {
        setSelectedDate(d);
        setInputValue(format(d, "MM/dd/yyyy"));
      }
    } else {
      setSelectedDate(undefined);
      setInputValue("");
    }
  }, [value]);

  const handleDateChange = (date: Date | undefined) => {
    const normalized = date ? startOfDay(date) : undefined;
    setSelectedDate(normalized);
    if (normalized) {
      setInputValue(format(normalized, "MM/dd/yyyy"));
      onChange?.(normalized.toISOString().split("T")[0]);
    } else {
      setInputValue("");
      onChange?.("");
    }
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9]/g, "");
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    if (cleaned.length > 4) formatted = formatted.slice(0, 5) + "/" + formatted.slice(5, 9);
    if (formatted.length > 10) formatted = formatted.slice(0, 10);
    setInputValue(formatted);

    if (formatted.length === 10) {
      const parsedDate = parse(formatted, "MM/dd/yyyy", startOfDay(new Date()));
      if (isValid(parsedDate)) {
        setSelectedDate(parsedDate);
        onChange?.(parsedDate.toISOString().split("T")[0]);
      }
    } else if (formatted === "") {
      setSelectedDate(undefined);
      onChange?.("");
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          className={cn("pr-14", !inputValue && "text-muted-foreground")}
          inputMode="numeric"
          maxLength={10}
        />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-0 top-0 h-full w-40 rounded-l-none border-l hover:bg-transparent",
                isInputFocused || isOpen
                  ? "border-primary bg-accent/10"
                  : "border-input",
              )}
              type="button"
            >
              <CalendarIcon
                className={cn(
                  "w-5 h-5",
                  isInputFocused || isOpen ? "text-primary opacity-100" : "opacity-50",
                )}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              type={type}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

interface DatePickerFormFieldProps {
  name: string;
  label?: string;
  type?: "future" | "past";
  defaultDate?: Date;
  value?: Date | null;
  onChange?: (date: Date) => void;
  required?: boolean;
  className?: string;
}

export function DatePickerFormField({
  name,
  label,
  type = "future",
  defaultDate,
  value,
  onChange,
  required = false,
  className,
}: DatePickerFormFieldProps) {
  const { control, setValue } = useFormContext();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value || defaultDate || undefined,
  );
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (value) {
      setSelectedDate(startOfDay(value));
      setInputValue(format(value, "MM/dd/yyyy"));
    } else if (defaultDate) {
      setSelectedDate(startOfDay(defaultDate));
      setInputValue(format(defaultDate, "MM/dd/yyyy"));
    }
  }, [value, defaultDate]);

  const handleDateChange = (date: Date | undefined) => {
    // DayPicker usually returns start of day, but we ensure it
    const normalizedDate = date ? startOfDay(date) : undefined;
    setSelectedDate(normalizedDate);
    if (normalizedDate) {
      setInputValue(format(normalizedDate, "MM/dd/yyyy"));
      setValue(name, normalizedDate.toISOString());
      if (onChange) {
        onChange(normalizedDate);
      }
    } else {
      setInputValue("");
      setValue(name, undefined);
    }
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    
    // Allow digits and slashes, but we'll control the formatting
    // Remove non-digit characters to re-format
    const cleaned = text.replace(/[^0-9]/g, "");
    
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    }
    if (cleaned.length > 4) {
      formatted = formatted.slice(0, 5) + "/" + formatted.slice(5, 9);
    }
    
    // Limit to 10 characters (MM/DD/YYYY)
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }

    setInputValue(formatted);

    // Validate and update if complete
    if (formatted.length === 10) {
      // Use startOfDay as reference to avoid time mismatch
      const parsedDate = parse(formatted, "MM/dd/yyyy", startOfDay(new Date()));
      if (isValid(parsedDate)) {
        // Check constraints if needed (future/past)
        // For now just update
        setSelectedDate(parsedDate);
        setValue(name, parsedDate.toISOString());
        if (onChange) {
          onChange(parsedDate);
        }
      }
    } else if (formatted === "") {
        setSelectedDate(undefined);
        setValue(name, undefined);
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      rules={{ required }}
      render={({ field }) => (
        <FormItem className={cn("flex flex-col", className)}>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                placeholder="MM/DD/YYYY"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className={cn("pr-14", !inputValue && "text-muted-foreground")}
                inputMode="numeric"
                maxLength={10}
              />
            </FormControl>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute right-0 top-0 h-full w-40 rounded-l-none border-l hover:bg-transparent",
                    isInputFocused || isOpen
                      ? "border-primary bg-accent/10"
                      : "border-input",
                  )}
                  type="button"
                >
                  <CalendarIcon
                    className={cn(
                      "w-5 h-5",
                      isInputFocused || isOpen ? "text-primary opacity-100" : "opacity-50",
                    )}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  type={type}
                />
              </PopoverContent>
            </Popover>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
