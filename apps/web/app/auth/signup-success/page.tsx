'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, SendHorizonal } from 'lucide-react'

export default function SignupSuccessPage() {
    const [visible, setVisible] = useState(false)
    const [animateFlyOff, setAnimateFlyOff] = useState(false)
    const [showTextAndCheck, setShowTextAndCheck] = useState(false)
    const [showCard, setShowCard] = useState(false)

    useEffect(() => {
        // Start the send-text icon animation immediately
        setAnimateFlyOff(true)

        // Set a delay to show the card after SendHorizonal animation (2s) ends
        const showCardTimer = setTimeout(() => {
            setShowCard(true) // Show the card after 2 seconds (SendHorizonal ends)
        }, 2000)

        // Set a delay for the check mark and text animations (after SendHorizonal ends)
        const timer = setTimeout(() => {
            setVisible(true)
            setShowTextAndCheck(true) // Show the text and check after the card moves in
        }, 2500) // Adjust this timing to match the card's entrance

        return () => {
            clearTimeout(showCardTimer)
            clearTimeout(timer)
        }
    }, [])

    return (
        <div className="flex justify-center items-center min-h-screen bg-background">
            {/* SendHorizontal Animation */}
            <div className={`fixed z-50 ${animateFlyOff ? 'animate-[flyRight_2s_ease-in-out_forwards]' : ''}`} style={{ top: '50%', left: 0 }}>
                <SendHorizonal className="w-10 h-10 text-primary" />
            </div>

            {/* Card (Initially hidden and slides up after send-text animation) */}
            <div
                className={`max-w-md w-full space-y-8 p-10 bg-card rounded-xl shadow-lg transition-transform duration-700 ${
                    showCard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                }`}
            >
                <div className="relative text-center">
                    {/* Check Circle and Text Animation (Appears after delay) */}
                    {showTextAndCheck && (
                        <div className="relative mx-auto flex items-center justify-center">
                            <div className="absolute w-15 h-15 rounded-full bg-primary scale-110 animate-[circle-anim_400ms_ease]"></div>
                            <div className="relative w-15 h-15 rounded-full bg-card flex items-center justify-center scale-100 animate-[success-anim_700ms_ease]">
                                <CheckCircle className="text-primary opacity-0 animate-[check-anim_700ms_ease]" size={40} />
                            </div>
                        </div>
                    )}

                    {showTextAndCheck && (
                        <>
                            <h2 className="mt-6 text-3xl font-extrabold text-foreground">Thanks for signing up!</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Please check-in with your admin for next steps.
                            </p>
                            <p className="mt-5 text-sm text-muted-foreground">
                                If you want to learn more about Fajr.EMR, visit our{' '}
                                <a href="/about" className="text-primary underline">About Page</a>.
                            </p>
                        </>
                    )}
                </div>
            </div>


        </div>
    )
}
