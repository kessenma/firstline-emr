// app/auth/layout.tsx
import type React from "react"

// Force dynamic rendering for all auth pages - prevents static generation at build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>;
}
