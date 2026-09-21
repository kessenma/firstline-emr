"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when the patient dashboard has zero patients to display.
 *  Patient visibility isn't mission-scoped today, so an empty dashboard means
 *  no active patients exist yet — point the user at mission enrollment. */
export function EmptyPatientsState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Globe className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        No patients in your dashboard
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Join a mission with active patients, or confirm with your admin that
        your mission has active patients in it.
      </p>
      <Button onClick={() => router.push("/my-profile")}>
        <Globe className="w-4 h-4 mr-2" />
        View Available Missions
      </Button>
    </div>
  );
}
