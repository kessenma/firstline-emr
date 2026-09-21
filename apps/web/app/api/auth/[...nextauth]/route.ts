// apps/web/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Create and export the handler directly
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
