"use client"

import type React from "react"
import { useState, useEffect, ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"

interface SpecialtyBreakdown {
    specialty: string
    count: number
}

const UserBreakdownView: React.FC = () => {
    const { data, isLoading, error } = useQuery<SpecialtyBreakdown[]>({
        queryKey: ["doctorSpecialtyBreakdown"],
        queryFn: async () => {
            const response = await axios.get("/api/admin/GET/doctor-specialty-breakdown")
            return response.data.specialtyBreakdown
        },
    })

    const [chartData, setChartData] = useState<SpecialtyBreakdown[]>([])

    useEffect(() => {
        if (data) {
            // Sort data by count in descending order and filter out zero counts
            const sortedData = [...data].filter((item) => item.count > 0).sort((a, b) => b.count - a.count)

            setChartData(sortedData)
        }
    }, [data])

    if (isLoading)
        return (
            <div className="flex min-h-[500px] items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        )

    if (error)
        return (
            <div className="flex min-h-[500px] items-center justify-center">
                <div className="text-destructive">Error fetching data: {(error as Error).message}</div>
            </div>
        )

    if (!chartData.length)
        return (
            <div className="flex min-h-[500px] items-center justify-center">
                <div className="text-muted-foreground">No data available</div>
            </div>
        )

    return (
        <div className="bg-background mx-auto max-w-5xl px-4 py-8">
            <Card className="shadow-md">
                <CardHeader className="space-y-1 pb-8">
                    <CardTitle className="text-2xl font-bold tracking-tight">Doctor Specialty Breakdown</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                        Distribution of doctor specialties across our platform
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer className="h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 250,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} />
                                <YAxis
                                    type="category"
                                    dataKey="specialty"
                                    width={240}
                                    tick={{
                                        fontSize: 12,
                                        fill: "hsl(var(--foreground))",
                                    }}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border bg-card p-3 shadow-sm">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-medium text-foreground">{payload[0].payload.specialty}</span>
                                                        <span className="text-lg font-bold text-primary">
                              {payload[0].value} {payload[0].value === 1 ? "Doctor" : "Doctors"}
                            </span>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="hsl(var(--primary))"
                                    radius={[0, 4, 4, 0]}
                                    label={{
                                        position: "right",
                                        fill: "hsl(var(--foreground))",
                                        fontSize: 12,
                                        formatter: (label: ReactNode) => {
                                            const value = typeof label === 'number' ? label : 0;
                                            return `${value} ${value === 1 ? "Doctor" : "Doctors"}`;
                                        },
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    )
}

export default UserBreakdownView
