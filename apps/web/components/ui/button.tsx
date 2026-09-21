// apps/web/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { SendHorizonal } from 'lucide-react'

import { cn } from "../../utils/classNames";

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-normal break-words rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary",
                destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
                outline: "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
                secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
                orange: "bg-primary border-primary border text-primary-foreground hover:bg-primary/90 transition-colors",
                orangeOutline: "text-primary border-2 border-primary hover:bg-primary hover:text-primary-foreground",
                darkBlueOutline: "text-primary border-2 border-primary hover:bg-primary hover:text-primary-foreground",
                lightOrangeOutline: "text-accent border-2 border-accent hover:bg-accent hover:text-accent-foreground transition-colors",
                doctorBackground: "bg-[var(--color-doctor-primary)] text-primary-foreground shadow-sm hover:bg-[var(--color-doctor-dark)]",
                doctorOutline: "text-[color:var(--color-doctor-primary)] border-2 border-[var(--color-doctor-primary)] hover:bg-[var(--color-doctor-primary)] hover:text-primary-foreground",
                triageBackground: "bg-[var(--color-triage-primary)] text-primary-foreground shadow-sm hover:bg-[var(--color-triage-dark)]",
                triageOutline: "text-[color:var(--color-triage-primary)] border-2 border-[var(--color-triage-primary)] hover:bg-[var(--color-triage-primary)] hover:text-primary-foreground",
                medEvacBackground: "bg-[var(--color-medical-primary)] text-primary-foreground shadow-sm hover:bg-[var(--color-medical-dark)]",
                medEvacOutline: "text-[color:var(--color-medical-primary)] border-2 border-[var(--color-medical-primary)] hover:bg-[var(--color-medical-primary)] hover:text-primary-foreground",
                submit: "border-1 border-primary text-primary bg-background shadow-xs hover:bg-primary hover:text-primary-foreground hover:border-background hover:border-1"
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-10 rounded-md px-8",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            >
                {variant === 'submit' && <SendHorizonal className="mr-2 h-4 w-4" />}
                {children}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
