// apps/web/components/adminDashboard/sections/notifications/CentralNotificationsView.tsx
"use client"

import { useCentralNotifications } from "./CentralNotificationsViewModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import React, { useState } from "react"
import { Search, RefreshCw, Filter, ChevronDown, ChevronUp, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { CentralNotificationsTable } from "./CentralNotificationsTable"
import { Pagination } from "@/components/ui/pagination"
import InfiniteScroll from "@/components/ui/infiniteScroll"
import { useIsMobile } from "@/components/ui/Table/hooks/use-mobile"
import { ScrollArea } from "@/components/ui/scroll-area"
import {BarLoader} from "react-spinners";

export function CentralNotificationsView() {
    const {
        centralNotifications,
        isLoading,
        filters,
        resetFilters,
        refetch,
        paginationMode,
        togglePaginationMode,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
        totalPages,
        currentPage,
        handlePageChange,
    } = useCentralNotifications()

    const [tempPatientId, setTempPatientId] = useState<string>("")
    const [tempUserId, setTempUserId] = useState<string>("")
    const [showFilters, setShowFilters] = useState(false)
    const isMobile = useIsMobile()

    const handlePatientSearch = () => {
        filters.setPatientId(tempPatientId || null)
    }

    const handleUserSearch = () => {
        filters.setUserId(tempUserId || null)
    }

    // Common specialties - you can expand this list as needed
    const specialties = [
        "All Specialties",
        "Cardiology",
        "Dermatology",
        "Endocrinology",
        "Gastroenterology",
        "Neurology",
        "Oncology",
        "Orthopedics",
        "Pediatrics",
        "Psychiatry",
        "Urology",
    ]

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-xl">Central Notifications</CardTitle>
                    <div className="flex space-x-2">
                        {/* Filter toggle button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            <span className="hidden sm:inline">Filters</span>
                            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>

                        {/* Refresh button */}
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>

                        {/* Toggle pagination mode button - hide on mobile */}
                        {!isMobile && (
                            <Button variant="outline" size="sm" onClick={togglePaginationMode} className="flex items-center gap-2">
                <span className="hidden sm:inline">
                  {paginationMode === "infinite" ? "Use Paged" : "Use Infinite Scroll"}
                </span>
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col space-y-4">
                    {/* Collapsible Filters */}
                    <div
                        className={cn(
                            "overflow-hidden transition-all duration-300 ease-in-out",
                            showFilters ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
                        )}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-card rounded-md">
                            {/* First row */}
                            <div className="flex flex-col space-y-4">
                                <div className="flex space-x-2">
                                    <Input
                                        placeholder="Patient ID"
                                        value={tempPatientId}
                                        onChange={(e) => setTempPatientId(e.target.value)}
                                    />
                                    <Button variant="outline" onClick={handlePatientSearch}>
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex space-x-2">
                                    <Input placeholder="User ID" value={tempUserId} onChange={(e) => setTempUserId(e.target.value)} />
                                    <Button variant="outline" onClick={handleUserSearch}>
                                        <User className="h-4 w-4" />
                                    </Button>
                                </div>

                                <Select value={filters.type || ""} onValueChange={(value) => filters.setType(value || null)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Notification Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="message">Message</SelectItem>
                                        <SelectItem value="alert">Alert</SelectItem>
                                        <SelectItem value="announcement">Announcement</SelectItem>
                                        <SelectItem value="reminder">Reminder</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Second row */}
                            <div className="flex flex-col space-y-4">
                                <Select
                                    value={filters.notificationType || ""}
                                    onValueChange={(value) => filters.setNotificationType(value || null)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Notification Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="new_patient">New Patient</SelectItem>
                                        <SelectItem value="specialty_assigned">Specialty Assigned</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.specialty || ""}
                                    onValueChange={(value) => filters.setSpecialty(value === "All Specialties" ? null : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Doctor Specialty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {specialties.map((specialty) => (
                                            <SelectItem key={specialty} value={specialty}>
                                                {specialty}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button variant="outline" onClick={resetFilters} className="w-full">
                                    Reset Filters
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Summary (when filters are hidden) */}
                    {!showFilters &&
                        (filters.patientId || filters.userId || filters.type || filters.notificationType || filters.specialty) && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {filters.patientId && (
                                    <div className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full flex items-center">
                                        <span>Patient: {filters.patientId}</span>
                                    </div>
                                )}
                                {filters.userId && (
                                    <div className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full flex items-center">
                                        <span>User: {filters.userId}</span>
                                    </div>
                                )}
                                {filters.type && filters.type !== "all" && (
                                    <div className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full flex items-center">
                                        <span>Category: {filters.type}</span>
                                    </div>
                                )}
                                {filters.notificationType && filters.notificationType !== "all" && (
                                    <div className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full flex items-center">
                    <span>
                      Type: {filters.notificationType === "new_patient" ? "New Patient" : "Specialty Assigned"}
                    </span>
                                    </div>
                                )}
                                {filters.specialty && (
                                    <div className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full flex items-center">
                                        <span>Specialty: {filters.specialty}</span>
                                    </div>
                                )}
                            </div>
                        )}

                    {/* Notifications Table */}
                    {isLoading ? (
                            <div className="py-8 flex items-center justify-center text-foreground" aria-live="polite">
                                <BarLoader color="#9e1a0e"/>
                            </div>

                    ) : (
                        <>
                            {/* On mobile, always use infinite scroll for better UX */}
                            {paginationMode === "infinite" || isMobile ? (
                                <div className={`${isMobile ? "h-[70vh]" : "h-[600px]"} rounded-md overflow-hidden`}>
                                    <ScrollArea className="h-full w-full">
                                        <InfiniteScroll
                                            hasMore={!!hasNextPage}
                                            isLoading={isFetchingNextPage}
                                            next={() => fetchNextPage()}
                                            dataLength={centralNotifications?.length || 0}
                                            className="h-full pb-8"
                                            showGradient={false} // Disable gradient as ScrollArea will handle scrolling
                                            threshold={200}
                                            loader={
                            <div className="flex justify-center py-4 text-muted-foreground">
                                <p>Loading more notifications...</p>
                            </div>
                                            }
                                            endMessage={
                                                <div className="flex justify-center py-4 text-muted-foreground text-sm">
                                                    <p>No more notifications to load.</p>
                                                </div>
                                            }
                                        >
                                            <div id="scrollable-notifications-container" className="h-full">
                                                <CentralNotificationsTable notifications={centralNotifications} />
                                            </div>
                                        </InfiniteScroll>
                                    </ScrollArea>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-4">
                                    <div className="h-[550px] rounded-md overflow-hidden">
                                        <ScrollArea className="h-full w-full">
                                            <CentralNotificationsTable notifications={centralNotifications} />
                                        </ScrollArea>
                                    </div>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                        siblingCount={1}
                                        className="mt-4"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
