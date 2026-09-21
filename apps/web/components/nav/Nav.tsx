// apps/web/components/nav/Nav.tsx
"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import LoggedInNav from "./LoggedInNav"
import LoggedOutNav from "./LoggedOutNav"

interface NavProps {
    className?: string
}

const Nav: React.FC<NavProps> = ({ className }) => {
    const { data: session, status } = useSession()

    if (status === "loading") {
        return (
            <nav className={`h-16 flex items-center px-4 ${className}`}>
                <div className="h-10 w-32 bg-muted rounded-md animate-pulse"></div>
            </nav>
        )
    }

    return session ? <LoggedInNav className={className} /> : <LoggedOutNav className={className} />
}

export default Nav
