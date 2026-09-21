"use client"

import type React from "react"

import { useEffect, useRef } from "react"

export function useResizeObserver<T extends HTMLElement | null>(ref: React.RefObject<T>, callback: (entry: ResizeObserverEntry) => void) {
    const observerRef = useRef<ResizeObserver | null>(null)

    useEffect(() => {
        if (ref.current) {
            observerRef.current = new ResizeObserver((entries) => {
                callback(entries[0])
            })

            observerRef.current.observe(ref.current)
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
        }
    }, [ref, callback])
}
