"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Loader2, X } from "lucide-react";
import { cn } from "@/utils/classNames";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  image?: string;
}

// Simple cache for user search results (shared across all instances)
const searchCache = new Map<string, { users: User[]; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

interface UserSearchInputProps {
  selectedUsers: User[];
  onUserSelect: (user: User) => void;
  onUserRemove: (userId: string) => void;
  excludeUserIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function UserSearchInput({
  selectedUsers,
  onUserSelect,
  onUserRemove,
  excludeUserIds = [],
  placeholder = "Enter name, email or tag",
  disabled = false,
}: UserSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize excluded IDs to prevent re-renders
  const allExcludedIds = useMemo(() => {
    const selectedIds = selectedUsers.map((u) => u.id);
    return [...excludeUserIds, ...selectedIds];
  }, [excludeUserIds, selectedUsers]);

  // Memoize the exclusion check
  const excludedIdsSet = useMemo(() => new Set(allExcludedIds), [allExcludedIds]);

  const searchUsers = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      const cacheKey = searchQuery.toLowerCase();
      const cached = searchCache.get(cacheKey);
      const now = Date.now();

      // Use cached results if fresh
      if (cached && now - cached.timestamp < CACHE_TTL) {
        const filtered = cached.users.filter(
          (u: User) => !excludedIdsSet.has(u.id),
        );
        setResults(filtered);
        setHighlightedIndex(filtered.length > 0 ? 0 : -1);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        );
        if (res.ok) {
          const data = await res.json();

          // Cache the raw results
          searchCache.set(cacheKey, { users: data.users, timestamp: now });

          // Filter out excluded users using the memoized set
          const filtered = data.users.filter(
            (u: User) => !excludedIdsSet.has(u.id),
          );
          setResults(filtered);
          setHighlightedIndex(filtered.length > 0 ? 0 : -1);
        }
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [excludedIdsSet],
  );

  // Debounced search - only trigger on query change
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]); // Only depend on query, not searchUsers

  // Re-filter results when excluded IDs change (without re-fetching)
  useEffect(() => {
    if (results.length > 0) {
      const filtered = results.filter((u) => !excludedIdsSet.has(u.id));
      if (filtered.length !== results.length) {
        setResults(filtered);
        setHighlightedIndex(filtered.length > 0 ? 0 : -1);
      }
    }
  }, [excludedIdsSet]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (user: User) => {
    onUserSelect(user);
    setQuery("");
    setResults([]);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && query === "" && selectedUsers.length > 0) {
      // Remove last selected user when backspace is pressed on empty input
      onUserRemove(selectedUsers[selectedUsers.length - 1].id);
    } else if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp" && results.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0 && results.length > 0) {
      e.preventDefault();
      handleSelect(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setResults([]);
      setHighlightedIndex(-1);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Teams-style To: field */}
      <div
        className={cn(
          "flex items-center gap-1 min-h-[40px] px-3 py-1.5 border-b-2 bg-background cursor-text",
          isFocused ? "border-primary" : "border-muted-foreground/20",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onClick={handleContainerClick}
      >
        {/* To: label */}
        <span className="text-muted-foreground font-medium shrink-0 text-sm">To:</span>

        {/* Selected users as inline chips */}
        <div className="flex flex-wrap items-center gap-1 flex-1">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-1 bg-muted rounded px-1.5 py-0.5 text-xs"
            >
              <Avatar
                src={user.image}
                initials={`${user.firstName[0]}${user.lastName[0]}`}
                className="h-4 w-4"
              />
              <span className="font-medium">
                {user.lastName}, {user.firstName}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUserRemove(user.id);
                }}
                className="hover:bg-background/50 rounded p-0.5 transition"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            placeholder={selectedUsers.length === 0 ? placeholder : ""}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
            disabled={disabled}
          />

          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          )}
        </div>
      </div>

      {/* Results dropdown - more compact */}
      {isFocused && results.length > 0 && (
        <div className="absolute z-50 w-full mt-0 bg-background border border-t-0 shadow-lg max-h-48 overflow-y-auto">
          {results.map((user, index) => (
            <button
              key={user.id}
              type="button"
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 transition text-left",
                highlightedIndex === index
                  ? "bg-muted"
                  : "hover:bg-muted/50",
              )}
              onClick={() => handleSelect(user)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <Avatar
                src={user.image}
                initials={`${user.firstName[0]}${user.lastName[0]}`}
                className="h-8 w-8"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {user.lastName}, {user.firstName}
                </p>
                <p className="text-xs text-muted-foreground">
                  ({user.email.split("@")[0].toUpperCase()}) {user.accountType}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isFocused && query.length >= 2 && !isLoading && results.length === 0 && (
        <div className="absolute z-50 w-full mt-0 bg-background border border-t-0 shadow-lg p-3 text-center text-muted-foreground text-sm">
          No users found
        </div>
      )}
    </div>
  );
}
