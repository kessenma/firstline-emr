// apps/web/components/ui/card.tsx
import React from 'react'
import { cn } from "@/utils/classNames"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    backgroundColor?: string;
    backgroundOpacity?: number;
    blurAmount?: number;
    borderColor?: string;
    borderSize?: number;
    shadowSize?: 'sm' | 'md' | 'lg';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({
         className,
         children,
        backgroundColor = 'card',
         backgroundOpacity = 100,
         blurAmount = 0,
         borderColor = 'border-transparent',
         borderSize = 0,
         shadowSize = 'sm',
         ...props
     }, ref) => {
        // Tailwind v4 opacity uses slash syntax: bg-card/50
        const baseColor = backgroundColor.startsWith("bg-")
            ? backgroundColor.replace(/^bg-/, "")
            : backgroundColor
        const bgClass = backgroundOpacity === 100 ? `bg-${baseColor}` : `bg-transparent`
        const inlineStyle = backgroundOpacity === 100
            ? undefined
            : { backgroundColor: `hsl(var(--${baseColor}) / ${backgroundOpacity / 100})` }
        const blurClass = blurAmount > 0 ? `backdrop-blur-[${blurAmount}px]` : '';
        const borderClass = borderSize > 0 ? `border-${borderSize}` : '';
        const shadowClass = `shadow-${shadowSize}`;

        return (
            <div
                ref={ref}
                className={cn(
                    "relative rounded-lg transition-colors duration-200",
                    bgClass,
                    blurClass,
                    borderClass,
                    borderColor,
                    shadowClass,
                    "text-foreground",
                    className
                )}
                style={inlineStyle ? { ...inlineStyle, ...(props as any).style } : (props as any).style}
                {...props}
            >
                {children}
            </div>
        )
    }
);
Card.displayName = "Card"

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
        {...props}
    />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
    />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
