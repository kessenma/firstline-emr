// apps/web/components/adminDashboard/sections/statistics/views/SpecialtySpreadComparisonView.tsx

import React, { useState } from "react"
import { useSpecialtyData } from "@/components/adminDashboard/context/SpecialtyDataContext"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useThemeTokens } from "@/components/ui/ThemeProvider"

const LoadingView: React.FC = () => (
    <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
    </div>
)

const ErrorView: React.FC<{ error: Error }> = ({ error }) => (
    <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-destructive">Error fetching data: {error.message}</div>
    </div>
)

const NoDataView: React.FC = () => (
    <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-muted-foreground">No data available</div>
    </div>
)

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    const tokens = useThemeTokens()
    const card = `hsl(${tokens.card})`
    const border = `hsl(${tokens.border})`
    const foreground = `hsl(${tokens.foreground})`
    const primary = `hsl(${tokens.primary})`
    const accent = `hsl(${tokens.accent})`
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip" style={{ backgroundColor: card, padding: "10px", border: `1px solid ${border}` }}>
                <p className="label" style={{ color: foreground }}>{`Specialty: ${label}`}</p>
                <p style={{ color: primary }}>{`Doctors: ${payload[0].value}`}</p>
                <p style={{ color: accent }}>{`Patients: ${payload[1].value}`}</p>
            </div>
        )
    }
    return null
}

const SpecialtySpreadComparisonView: React.FC = () => {
    const { doctorSpecialties, patientSpecialties, isLoading, error } = useSpecialtyData()
    const [isSpreadOut, setIsSpreadOut] = useState(false)
    const tokens = useThemeTokens()
    const foreground = `hsl(${tokens.foreground})`
    const border = `hsl(${tokens.border})`
    const primary = `hsl(${tokens.primary})`
    const accent = `hsl(${tokens.accent})`

    if (isLoading) return <LoadingView />
    if (error) return <ErrorView error={error} />
    if (!doctorSpecialties.length && !patientSpecialties.length) return <NoDataView />

    // Status patient and doctor specialties into a single dataset
    const mergedData = doctorSpecialties.map((docSpec) => {
        const patientSpec = patientSpecialties.find((patSpec) => patSpec.specialty === docSpec.specialty)
        return {
            specialty: docSpec.specialty,
            doctors: docSpec.count,
            patients: patientSpec ? patientSpec.count : 0,
        }
    })

    // Add any patient specialties that don't have a corresponding doctor specialty
    patientSpecialties.forEach((patSpec) => {
        if (!mergedData.find((data) => data.specialty === patSpec.specialty)) {
            mergedData.push({
                specialty: patSpec.specialty,
                doctors: 0,
                patients: patSpec.count,
            })
        }
    })

    const chartWidth = isSpreadOut ? Math.max(mergedData.length * 150, 1200) : "100%";

    return (
        <Card className="bg-card">
            <CardHeader className="space-y-1 pb-8">
                <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl text-foreground">
                    Doctor Specialties vs. Assigned Patient Specialties
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground sm:text-base">
                    Comparison of available specialties
                </CardDescription>
                <div className="flex items-center space-x-2 pt-4">
                    <Switch
                        id="spread-out-mode"
                        checked={isSpreadOut}
                        onCheckedChange={setIsSpreadOut}
                    />
                    <Label htmlFor="spread-out-mode" className="text-foreground">Spread Out View</Label>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer className="h-[500px]">
                    <div className="overflow-x-auto">
                        <ResponsiveContainer width={chartWidth} height={500}>
                            <LineChart data={mergedData} margin={{top: 30, right: 30, left: 20, bottom: 100}}>
                                <Legend verticalAlign="top" height={36}/>
                                <Line type="monotone" dataKey="doctors" stroke={primary} activeDot={{r: 8}}/>
                                <Line type="monotone" dataKey="patients" stroke={accent} activeDot={{r: 8}}/>
                                <CartesianGrid stroke={border} strokeDasharray="3 3"/>
                                <XAxis
                                    dataKey="specialty"
                                    interval={isSpreadOut ? 1 : 0}
                                    tick={({x, y, payload}) => (
                                        <g transform={`translate(${x},${y})`}>
                                            <text
                                                x={0}
                                                y={0}
                                                dy={16}
                                                textAnchor="end"
                                                fill={foreground}
                                                transform="rotate(-45)"
                                            >
                                                {payload.value}
                                            </text>
                                        </g>
                                    )}
                                    height={80}
                                />
                                <YAxis tick={{fill: foreground}}/>
                                <Tooltip content={<CustomTooltip/>}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

export default SpecialtySpreadComparisonView
