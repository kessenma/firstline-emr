"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePatientDashboard } from "../PatientViewModelContext"
import { getMediaUrl } from "@/lib/media"

interface Video {
    url: string
    fileKey: string // Store the original file key for reference
}

export interface TelegramMessagesVideoGalleryViewModelProps {
    patientId: string
}

export const useTelegramMessagesVideoGalleryViewModel = ({ patientId }: TelegramMessagesVideoGalleryViewModelProps) => {
    const [videos, setVideos] = useState<Video[]>([])
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isDoctor, setIsDoctor] = useState(false)

    const { patientInfo } = usePatientDashboard()
    const telegramChatId = patientInfo?.telegramChatId

    useEffect(() => {
        const fetchVideos = async () => {
            if (!telegramChatId) {
                return // no telegram ID, no files
            }
            setIsLoading(true)
            try {
                // 1. Fetch video messages from thread by chatId
                const listResponse = await fetch(`/api/telegram-thread/list-media?chatId=${encodeURIComponent(telegramChatId)}&mediaType=video`)
                if (!listResponse.ok) {
                    throw new Error(`Error listing media: ${listResponse.statusText}`)
                }
                const { media } = await listResponse.json()

                if (!media || media.length === 0) {
                    setVideos([])
                    return
                }

                const tempVideos: Video[] = []
                for (const msg of media) {
                    if (!msg.mediaUrl) continue
                    // 2. Get signed URL for each media file (cached)
                    const signedUrl = await getMediaUrl(msg.mediaUrl)
                    if (signedUrl) {
                        tempVideos.push({
                            url: signedUrl,
                            fileKey: msg.mediaUrl,
                        })
                    }
                }

                setVideos(tempVideos)
            } catch (error) {
                console.error("Error fetching videos:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchVideos()
    }, [telegramChatId])

    useEffect(() => {
        // Check if user is a doctor
        // Assuming you have session or some logic here
        // setIsDoctor(true/false);
    }, [])

    const handleThumbnailClick = (index: number) => {
        setCurrentVideoIndex(index)
    }

    const handlePrevClick = () => {
        setCurrentVideoIndex((prevIndex) => (prevIndex === 0 ? videos.length - 1 : prevIndex - 1))
    }

    const handleNextClick = () => {
        setCurrentVideoIndex((prevIndex) => (prevIndex === videos.length - 1 ? 0 : prevIndex + 1))
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const filesArray = Array.from(event.target.files || [])
        setSelectedFiles(filesArray)
    }

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        // Upload logic, similar to your existing code but pointing to DO
    }

    return {
        videos,
        currentVideoIndex,
        isLoading,
        isDoctor,
        selectedFiles,
        handleThumbnailClick,
        handlePrevClick,
        handleNextClick,
        handleFileChange,
        handleFormSubmit,
    }
}
