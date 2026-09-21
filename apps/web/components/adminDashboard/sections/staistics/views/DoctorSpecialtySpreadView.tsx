// apps/web/components/adminDashboard/sections/statistics/DoctorSpecialtySpreadView.tsx
import React, { useState } from "react";
import { useSpecialtyData } from "@/components/adminDashboard/context/SpecialtyDataContext";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useThemeTokens } from "@/components/ui/ThemeProvider";

const LoadingView = () => (
    <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
    </div>
);

const ErrorView = ({ error }: { error: Error }) => (
    <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-destructive">Error fetching data: {error.message}</div>
    </div>
);

const NoDataView = () => (
    <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-muted-foreground">No data available</div>
    </div>
);

const DoctorSpecialtySpreadView: React.FC = () => {
    const { doctorSpecialties, isLoading, error } = useSpecialtyData();
    const [isSpreadOut, setIsSpreadOut] = useState(false);
    const tokens = useThemeTokens();
    const foreground = `hsl(${tokens.foreground})`;
    const border = `hsl(${tokens.border})`;
    const primary = `hsl(${tokens.primary})`;

    if (isLoading) return <LoadingView />;
    if (error) return <ErrorView error={error} />;
    if (!doctorSpecialties.length) return <NoDataView />;

    // Sort by count (descending)
    const sortedSpecialties = [...doctorSpecialties].sort((a, b) => b.count - a.count);
    const totalDoctors = sortedSpecialties.reduce((acc, spec) => acc + spec.count, 0);
    const chartWidth = isSpreadOut ? Math.max(sortedSpecialties.length * 120, 1000) : Math.min(sortedSpecialties.length * 50, 800);

    return (
        <Card className="bg-card">
            <CardHeader className="space-y-1 pb-8">
                <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl text-foreground">
                    Doctor Specialties
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground sm:text-base">
                    Distribution - <span className="text-foreground font-semibold">Total: {totalDoctors}</span>
                </CardDescription>
                <div className="flex items-center space-x-2 pt-4">
                    <Switch id="spread-out-mode" checked={isSpreadOut} onCheckedChange={setIsSpreadOut} />
                    <Label htmlFor="spread-out-mode" className="text-foreground">Spread Out View</Label>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer className="h-[500px]">
                    <div className="overflow-x-auto">
                        <BarChart
                            width={chartWidth}
                            height={450}
                            data={sortedSpecialties}
                            margin={{ top: 20, right: 30, left: 40, bottom: 120 }}
                        >
                            <CartesianGrid stroke={border} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="specialty"
                                interval={isSpreadOut ? 1 : 0}
                                angle={45}
                                textAnchor="start"
                                height={100}
                                tick={{ fontSize: 11, fill: foreground }}
                                tickMargin={5}
                            />
                            <YAxis tickMargin={5} tick={{ fontSize: 11, fill: foreground }} />
                            <Tooltip />
                            <Bar dataKey="count" fill={primary} barSize={15} />
                        </BarChart>
                    </div>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};

export default DoctorSpecialtySpreadView;
