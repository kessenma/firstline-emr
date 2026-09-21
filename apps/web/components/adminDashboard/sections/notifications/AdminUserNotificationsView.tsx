// apps/web/components/adminDashboard/sections/notifications/AdminUserNotificationsView.tsx
"use client"

import { useNotificationsViewModel } from "./AdminUserNotificationsViewModel"
import { UserNotificationsTable } from "./AdminUserNotificationsTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import React, { useState } from "react"
import { Search, RefreshCw, List, Layers, Filter, ChevronDown, ChevronUp } from "lucide-react"
import InfiniteScroll from "@/components/ui/infiniteScroll"
import { Pagination } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/ui/Table/hooks/use-mobile"
import { ScrollArea } from "@/components/ui/scroll-area"
import {BarLoader} from "react-spinners";

export function AdminUserNotificationsView() {
    const {
        userNotifications,
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
    } = useNotificationsViewModel()

    const [tempUserId, setTempUserId] = useState<string>("")
    const [showFilters, setShowFilters] = useState(false)
    const isMobile = useIsMobile()

    const handleSearch = () => {
        filters.setUserId(tempUserId || null)
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-xl">User Notifications</CardTitle>
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

                        {/* Pagination mode toggle - hide on mobile */}
                        {!isMobile && (
                            <Button variant="outline" size="sm" onClick={togglePaginationMode} className="flex items-center gap-2">
                                {paginationMode === "infinite" ? (
                                    <>
                                        <Layers className="h-4 w-4" />
                                        <span className="hidden sm:inline">Switch to Paged</span>
                                    </>
                                ) : (
                                    <>
                                        <List className="h-4 w-4" />
                                        <span className="hidden sm:inline">Switch to Infinite</span>
                                    </>
                                )}
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-card rounded-md">
                            <div className="flex space-x-2">
                                <Input placeholder="User ID" value={tempUserId} onChange={(e) => setTempUserId(e.target.value)} />
                                <Button variant="outline" onClick={handleSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>

                            <Select value={filters.type || ""} onValueChange={(value) => filters.setType(value || null)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Notification Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="message">Message</SelectItem>
                                    <SelectItem value="alert">Alert</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filters.method || ""} onValueChange={(value) => filters.setMethod(value || null)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Delivery Method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Methods</SelectItem>
                                    <SelectItem value="in-app">In-App</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex space-x-2">
                                <Button variant="outline" onClick={resetFilters} className="flex-1">
                                    Reset
                                </Button>
                                <Button variant="outline" onClick={() => refetch()} className="px-3">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Summary (when filters are hidden) */}
                    {!showFilters && (filters.userId || filters.type || filters.method) && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {filters.userId && (
                                <div className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full flex items-center">
                                    <span>User: {filters.userId}</span>
                                </div>
                            )}
                            {filters.type && filters.type !== "all" && (
                                <div className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full flex items-center">
                                    <span>Type: {filters.type}</span>
                                </div>
                            )}
                            {filters.method && filters.method !== "all" && (
                                <div className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full flex items-center">
                                    <span>Method: {filters.method}</span>
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
                                            dataLength={userNotifications?.length || 0}
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
                                            <div id="scrollable-user-notifications-container" className="h-full">
                                                <UserNotificationsTable notifications={userNotifications} />
                                            </div>
                                        </InfiniteScroll>
                                    </ScrollArea>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-4">
                                    <div className="h-[550px] rounded-md overflow-hidden">
                                        <ScrollArea className="h-full w-full">
                                            <UserNotificationsTable notifications={userNotifications} />
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
