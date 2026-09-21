// apps/web/components/ui/radio-card.tsx
"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Check } from "lucide-react"
import { cn } from "@/utils/classNames"

const RadioCardRoot = React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
    return <RadioGroupPrimitive.Root className={cn("flex w-full", className || "")} {...props} ref={ref} />
})
RadioCardRoot.displayName = RadioGroupPrimitive.Root.displayName

const RadioCardItem = React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { value: string }
>(({ className, children, value, ...props }, ref) => {
    return (
        <RadioGroupPrimitive.Item
            ref={ref}
            value={value}
            className={cn(
                "relative rounded-lg p-2 text-left transition-all duration-200",
                "border border-border bg-background text-foreground",
                "hover:border-primary cursor-pointer",
                "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-xs",
                className || "",
            )}
            {...props}
        >
            {children}
            <RadioGroupPrimitive.Indicator className="overflow-hidden absolute inset-0 rounded-lg border-2 border-primary">
                <div className="flex absolute top-2 right-2 justify-center items-center w-5 h-5 rounded-full bg-primary">
                    <Check className="w-3 h-3 text-primary-foreground" />
                </div>
            </RadioGroupPrimitive.Indicator>
        </RadioGroupPrimitive.Item>
    )
})
RadioCardItem.displayName = RadioGroupPrimitive.Item.displayName

export const RadioCard = {
    Root: RadioCardRoot,
    Item: RadioCardItem,
}
