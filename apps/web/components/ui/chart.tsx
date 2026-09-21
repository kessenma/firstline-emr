"use client"

import * as React from "react"
import {
    ResponsiveContainer,
    PieChart as RechartsChart,
    Pie as RechartsPie,
    Tooltip,
    Cell,
    Label,
    type TooltipProps,
} from "recharts"

import { cn } from "@/lib/utils"
import { useThemeTokens } from "@/components/ui/ThemeProvider"

const ChartContext = React.createContext<{
    config: Record<string, any>
} | null>(null)

const ChartContainer = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
    config?: Record<string, any>
}
>(({ className, children, config = {}, ...props }, ref) => (
    <ChartContext.Provider value={{ config }}>
        <div ref={ref} className={cn("h-[350px] w-full", className)} {...props}>
            <ResponsiveContainer width="100%" height="100%">
                {children as React.ReactElement}
            </ResponsiveContainer>
        </div>
    </ChartContext.Provider>
))
ChartContainer.displayName = "ChartContainer"

type ChartPieProps = Omit<React.ComponentProps<typeof RechartsPie>, "ref"> & {
    className?: string
}

const ChartPie = React.forwardRef<SVGElement, ChartPieProps>(({ className, children, ...props }, ref) => {
    console.log("📊 ChartPie received props:", props)
    const tokens = useThemeTokens()

    if (!props.data || props.data.length === 0) {
        console.warn("⚠️ ChartPie received empty data. Nothing will render.")
        return null
    }

    const palette = [
        `hsl(${tokens.primary})`,
        `hsl(${tokens.accent})`,
        `hsl(${tokens.secondary})`,
        `hsl(${tokens.foreground})`,
    ]

    return (
        <RechartsChart>
            <Tooltip />
            <RechartsPie
                {...props}
                className={cn("[&_.recharts-sector:focus]:outline-hidden", className)}
                startAngle={90}
                endAngle={-270}
            >
                {props.data?.map((entry, index) => {
                    console.log(`🟢 Rendering Pie Slice: ${entry.specialty} - ${entry.count}`)
                    return <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                })}
            </RechartsPie>
            {children}
        </RechartsChart>
    )
})
ChartPie.displayName = "ChartPie"

type ChartTooltipProps<TValue extends string | number | Array<string | number>, TName extends string> = Omit<
    TooltipProps<TValue, TName>,
    "content"
> & {
    content?: TooltipProps<TValue, TName>["content"]
    wrapperClassName?: string
}

function ChartTooltip<TValue extends string | number | Array<string | number>, TName extends string>({
                                                                                                         wrapperClassName,
                                                                                                         content,
                                                                                                         ...props
                                                                                                     }: ChartTooltipProps<TValue, TName>) {
    return (
        <Tooltip<TValue, TName>
            {...props}
            content={
                content ||
                (({ active, payload }) => {
                    if (active && payload && payload.length) {
                        return (
                            <div className="rounded-lg border bg-background p-2 shadow-xs">
                                <div className="grid grid-cols-2 gap-2">
                                    {payload.map((entry: any, index: number) => (
                                        <div key={`item-${index}`} className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">{entry.name}</span>
                                            <span className="font-bold text-muted-foreground">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    }
                    return null
                })
            }
            wrapperClassName={cn(wrapperClassName)}
        />
    )
}

export { ChartContainer, ChartPie, ChartTooltip, Cell, Label }
