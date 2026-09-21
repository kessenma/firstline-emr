// apps/web/components/patient-dashboard/hooks/use-pagination.tsx
"use client"

import { useState, useRef } from "react"
import { useEffect } from "react"

export function usePagination<T>({
                                     data,
                                     itemsPerPage = 10,
                                     initialInfiniteScroll = false,
                                 }: {
    data: T[]
    itemsPerPage?: number
    initialInfiniteScroll?: boolean
}) {
    const [currentPage, setCurrentPage] = useState(1)
    const [isInfiniteScroll, setIsInfiniteScroll] = useState(initialInfiniteScroll)
    const loaderRef = useRef(null)

    const totalItems = data.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)

    const currentItems = isInfiniteScroll
        ? data.slice(0, currentPage * itemsPerPage)
        : data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const goToPage = (page: number) => {
        setCurrentPage(page)
    }

    const goToNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
    }

    const goToPreviousPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1))
    }

    const toggleInfiniteScroll = () => {
        setIsInfiniteScroll((prev) => !prev)
        setCurrentPage(1) // Reset to the first page when toggling
    }
    const [isIntersecting, setIsIntersecting] = useState(false)

    useEffect(() => {
        if (!isInfiniteScroll) return

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                setIsIntersecting(entry.isIntersecting)

                if (entry.isIntersecting && currentItems.length < totalItems) {
                    setCurrentPage((prev) => prev + 1)
                }
            },
            { threshold: 1.0 }
        )

        const node = loaderRef.current
        if (node) observer.observe(node)

        return () => {
            if (node) observer.unobserve(node)
        }
    }, [currentItems.length, totalItems, isInfiniteScroll])

    return {
        displayedItems: currentItems,
        currentPage,
        totalPages,
        goToPage,
        goToNextPage,
        goToPreviousPage,
        isInfiniteScroll,
        toggleInfiniteScroll,
        itemsPerPage,
        loaderRef,
        handlePageChange: goToPage,
        isIntersecting,
    }
}
