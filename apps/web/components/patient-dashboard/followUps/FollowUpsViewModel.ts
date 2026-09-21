// apps/web/components/patient-dashboard/followUps/FollowUpsViewModel.ts
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export const useFollowUpsViewModel = () => {
    const { data: session } = useSession();
    const [followUps, setFollowUps] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchFollowUps = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            // Get the CSRF token if it exists
            const csrfToken = await getCsrfToken();

            const res = await fetch("/api/telegram-thread/get-follow-ups", {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.user?.id || ''}`,
                    ...(csrfToken ? { 'csrf-token': csrfToken } : {}),
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    throw new Error("Unauthorized: You don't have permission to access follow-ups");
                }
                throw new Error("Failed to fetch follow-ups");
            }

            const data = await res.json();
            setFollowUps(data.followUps || []);
        } catch (err: any) {
            console.error("Error fetching follow-ups:", err);
            setError(err.message || "An error occurred");
        }
        setIsLoading(false);
    }, [session?.user?.id]);

    // Helper function to get CSRF token if it exists
    const getCsrfToken = async () => {
        try {
            // Check if the getCsrfToken function is available from next-auth
            if (typeof window !== 'undefined' && window.__NEXT_DATA__?.props?.csrfToken) {
                return window.__NEXT_DATA__.props.csrfToken;
            }
            return null;
        } catch (error) {
            console.error("Error getting CSRF token:", error);
            return null;
        }
    };

    useEffect(() => {
        if (session) {
            fetchFollowUps();
        }
    }, [session, fetchFollowUps]);

    return {
        followUps,
        isLoading,
        error,
        refetch: fetchFollowUps,
    };
};
