"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Globe, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useSignupContext } from "./container/SignupContext";

interface SignupMission {
    id: string;
    name: string;
    country: string;
    city: string | null;
    status: string;
    description: string | null;
}

/** Optional final signup step — pick missions to request to join.
 *  Selections become pending mission_requests reviewed by an admin.
 *  This step must never block signup: errors and empty lists still allow Submit. */
const MissionSelectionForm: React.FC = () => {
    const { formData, setFormData } = useSignupContext();
    const [availableMissions, setAvailableMissions] = useState<SignupMission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const selectedIds = formData.missionIds || [];

    const fetchMissions = async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const res = await fetch("/api/auth/signup/missions");
            if (!res.ok) throw new Error(`Failed: ${res.status}`);
            const data = await res.json();
            setAvailableMissions(data.missions || []);
        } catch (err) {
            console.error("Error loading missions for signup:", err);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleMission = (missionId: string) => {
        setFormData(prev => {
            const current = prev.missionIds || [];
            const next = current.includes(missionId)
                ? current.filter(id => id !== missionId)
                : [...current, missionId];
            return { ...prev, missionIds: next };
        });
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4">
            <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-medium text-foreground">Join a Mission</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                    Optional — request to join a mission now, or skip and do it later from your profile.
                    Requests are reviewed by an admin.
                </p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading missions...
                </div>
            ) : hasError ? (
                <div className="text-center py-6 space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Couldn&apos;t load missions — you can finish signup and join a mission later from your profile.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={fetchMissions}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Retry
                    </Button>
                </div>
            ) : availableMissions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                    No missions are open for enrollment right now — you can continue and join one later from your profile.
                </p>
            ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {availableMissions.map((mission) => (
                        <button
                            key={mission.id}
                            type="button"
                            onClick={() => toggleMission(mission.id)}
                            className="w-full flex items-center gap-3 p-2 rounded border border-border text-left hover:bg-muted/50 transition-colors"
                        >
                            <Checkbox checked={selectedIds.includes(mission.id)} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{mission.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {mission.country}{mission.city ? `, ${mission.city}` : ""}
                                </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                                mission.status === "active"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}>
                                {mission.status}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {selectedIds.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    {selectedIds.length} mission request{selectedIds.length > 1 ? "s" : ""} will be sent for admin approval.
                </p>
            )}
        </div>
    );
};

export default MissionSelectionForm;
