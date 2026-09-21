// app/my-profile/page.tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { UserProfileProvider } from "@/components/user-profile/UserProfileContext"
import { ProfilePageContent } from "@/components/user-profile/ProfilePageContent"

export default async function MyProfilePage() {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    return (
        <UserProfileProvider>
            <ProfilePageContent userId={userId} />
        </UserProfileProvider>
    )
}



