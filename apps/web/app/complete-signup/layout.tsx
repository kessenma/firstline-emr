// app/complete-signup/layout.tsx
import type React from "react"

// Force dynamic rendering - prevents static generation at build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CompleteSignupLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>;
}
