// apps/web/components/ui/pagination.tsx
import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from "@/lib/utils"
import { ButtonProps, Button } from "@/components/ui/button"

const Pagination = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    siblingCount?: number
}
>(({ className, currentPage, totalPages, onPageChange, siblingCount = 1, ...props }, ref) => {
    // Generate page numbers to display
    const getPageNumbers = () => {
        const pageNumbers = []

        // Always show first page
        pageNumbers.push(1)

        // Calculate range around current page
        const leftSibling = Math.max(2, currentPage - siblingCount)
        const rightSibling = Math.min(totalPages - 1, currentPage + siblingCount)

        // Add ellipsis if needed before left siblings
        if (leftSibling > 2) {
            pageNumbers.push(-1) // -1 represents ellipsis
        }

        // Add page numbers around current page
        for (let i = leftSibling; i <= rightSibling; i++) {
            if (i !== 1 && i !== totalPages) {
                pageNumbers.push(i)
            }
        }

        // Add ellipsis if needed after right siblings
        if (rightSibling < totalPages - 1) {
            pageNumbers.push(-2) // -2 represents ellipsis (using different key)
        }

        // Always show last page if more than 1 page
        if (totalPages > 1) {
            pageNumbers.push(totalPages)
        }

        return pageNumbers
    }

    return (
        <div
            ref={ref}
            className={cn("flex items-center justify-center space-x-2", className)}
            {...props}
        >
            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Go to previous page"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers().map((pageNumber, index) => {
                // Render ellipsis
                if (pageNumber < 0) {
                    return (
                        <div key={`ellipsis-${pageNumber}`} className="flex items-center justify-center h-10 w-10">
                            <MoreHorizontal className="h-4 w-4" />
                        </div>
                    )
                }

                // Render page number
                return (
                    <Button
                        key={`page-${pageNumber}`}
                        variant={pageNumber === currentPage ? "default" : "outline"}
                        size="icon"
                        onClick={() => onPageChange(pageNumber)}
                        aria-label={`Go to page ${pageNumber}`}
                        aria-current={pageNumber === currentPage ? "page" : undefined}
                    >
                        {pageNumber}
                    </Button>
                )
            })}

            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                aria-label="Go to next page"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
})

Pagination.displayName = "Pagination"

export { Pagination }
