import { Skeleton } from "@/components/ui/skeleton"
import { SectionHeaders } from "./types"

type SettingsLoadingSkeletonProps = {
    userType?: string
}

export default function SettingsLoadingSkeleton({ userType }: SettingsLoadingSkeletonProps) {
    return (
        <>
            {/* User Information Section Skeleton */}
            <div className="mb-6">
                <h2 className="text-lg font-medium flex items-center gap-2 mb-4">
                    {SectionHeaders.userInfo.icon}
                    {SectionHeaders.userInfo.title}
                </h2>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full mb-2" />
                    <Skeleton className="h-10 w-full mb-2" />
                    {userType === "Doctor" && <Skeleton className="h-10 w-full mb-2" />}
                </div>
            </div>

        </>
    )
}

