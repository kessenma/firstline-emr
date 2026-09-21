"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod/v3"
import { useForgotPasswordContext } from "./ForgotPasswordContext"
import { TextFormField } from "@/components/ui/TextFormField"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface VerificationStepProps {
  onNext: () => void
}

const verificationSchema = z.object({
  tempCode: z
    .string()
    .min(6, "Verification code must be at least 6 characters")
    .max(6, "Verification code must be at most 6 characters"),
})

type VerificationFormValues = z.infer<typeof verificationSchema>

const useTimer = (initialTime: number) => {
  const [timeLeft, setTimeLeft] = useState(initialTime)

  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  return timeLeft
}

const CircularTimer: React.FC<{ percentage: number; timeLeft: number }> = ({ percentage, timeLeft }) => {
  const circumference = 2 * Math.PI * 45 // 45 is the radius of the circle

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-muted-foreground"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <circle
          className="text-warning"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (percentage / 100) * circumference}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold">{formatTime(timeLeft)}</span>
      </div>
    </div>
  )
}

export function VerificationStep({ onNext }: VerificationStepProps) {
  const { loading, setLoading, setToast, handleVerificationStep } = useForgotPasswordContext()
  const timeLeft = useTimer(600) // 10 minutes in seconds

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      tempCode: "",
    },
  })

  const onSubmit = async (data: VerificationFormValues) => {
    setLoading(true)
    try {
      await handleVerificationStep(data.tempCode)
      onNext()
    } catch (error) {
      console.error("Verification error:", error)
      setToast?.({
        title: "Verification Error",
        description: "Failed to verify the code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const percentage = ((600 - timeLeft) / 600) * 100

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex flex-col items-center text-center">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-sm text-muted-foreground">
            You can enter your code now, but please <span className="font-semibold text-primary">do not close this page</span> until 10 minutes have passed.
          </p>
          <CircularTimer percentage={percentage} timeLeft={timeLeft} />
        </div>
        <TextFormField
          fieldName="tempCode"
          fieldLabel="Verification Code"
          autoComplete="off"
          error={form.formState.errors.tempCode?.message}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Code"
          )}
        </Button>
      </form>
    </FormProvider>
  )
}

export default VerificationStep
