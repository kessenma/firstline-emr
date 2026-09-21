"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface ICD10Code {
  code: string
  description: string
}

interface ICD10SearchProps {
  value: ICD10Code[]
  onChange: (value: ICD10Code[]) => void
  placeholder?: string
  className?: string
}

export function ICD10Search({
  value = [],
  onChange,
  placeholder = "Search ICD10 codes...",
  className
}: ICD10SearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ICD10Code[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [openPopoverCode, setOpenPopoverCode] = useState<string | null>(null)

  const searchICD10 = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    try {
      console.log('Searching for:', query)
      const response = await fetch(`/api/icd10/search?q=${encodeURIComponent(query)}`)
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('API response:', data)
      setSearchResults(data.results || [])
    } catch (error) {
      console.error('Error searching ICD10 codes:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(() => {
      searchICD10(searchQuery)
    }, 300) // 300ms debounce

    setDebounceTimer(timer)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [searchQuery, searchICD10])

  const handleToggleCode = (code: ICD10Code, checked: boolean) => {
    if (checked) {
      // Add code if not already selected
      const isAlreadySelected = value.some(item => item.code === code.code)
      if (!isAlreadySelected) {
        onChange([...value, code])
      }
    } else {
      // Remove code
      onChange(value.filter(item => item.code !== code.code))
    }
  }

  const handleRemove = (codeToRemove: string) => {
    onChange(value.filter(item => item.code !== codeToRemove))
  }

  const displayValue = value.length > 0
    ? `${value.length} code${value.length > 1 ? 's' : ''} selected`
    : placeholder

  return (
    <div className={cn("w-full", className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-center">Search ICD10 Codes</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border shadow-md">
            <div className="flex items-center border-b px-3">
              <input
                type="text"
                placeholder="Search ICD10 codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="search"
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm text-center outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Searching...</span>
                </div>
              )}
              {!isLoading && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="py-6 text-center text-sm">No ICD10 codes found.</div>
              )}
              {!isLoading && searchResults.length > 0 && (
                <div className="p-1">
                  {searchResults.map((code) => {
                    const isSelected = value.some(item => item.code === code.code)
                    return (
                      <div
                        key={code.code}
                        className="flex items-start space-x-3 p-3 hover:bg-accent rounded-sm cursor-pointer"
                        onClick={() => handleToggleCode(code, !isSelected)}
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium">{code.code}</span>
                          <span className="text-sm text-muted-foreground break-words">
                            {code.description}
                          </span>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleCode(code, checked as boolean)}
                          className="mt-0.5 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected codes display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 justify-center">
          {value.map((code) => (
            <Popover
              key={code.code}
              open={openPopoverCode === code.code}
              onOpenChange={(open) => setOpenPopoverCode(open ? code.code : null)}
            >
              <PopoverTrigger asChild>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs max-w-xs cursor-pointer hover:bg-secondary/80 transition-colors",
                    openPopoverCode === code.code && "ring-2 ring-primary bg-primary/10"
                  )}
                >
                  <span className="truncate block max-w-[120px]">
                    {code.code}: {code.description}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(code.code)
                    }}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5 flex-shrink-0"
                  >
                    ×
                  </button>
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-auto max-w-xs" align="center">
                <div className="space-y-2">
                  <div className="font-semibold text-sm">{code.code}</div>
                  <div className="text-sm text-muted-foreground">{code.description}</div>
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      )}
    </div>
  )
}
