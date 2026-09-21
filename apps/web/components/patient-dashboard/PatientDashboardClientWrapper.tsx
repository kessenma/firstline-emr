// apps/web/components/patient-dashboard/DashboardClientWrapper.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardView from "@/components/patient-dashboard/DashboardView";
import { TableSkeleton } from "@/components/ui/Table/TableSkeleton";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import type { ServerPatient } from "@/lib/server/patients";

interface Props {
  session: Session;
  initialPatients: ServerPatient[];
}

export default function DashboardClientWrapper({
  session: serverSession,
  initialPatients,
}: Props) {
  const { data: clientSession, status } = useSession();
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const router = useRouter();

  // Use server session initially, then client session once available
  const session = clientSession || serverSession;

  useEffect(() => {
    if (status === "authenticated" && session?.user?.accountType) {
      setTimeout(() => setIsLoadingPage(false), 500); // Add slight delay to smooth transition
    }
  }, [status, session?.user?.accountType]);

  if (status === "unauthenticated") {
    router.replace("/auth/login");
    return null;
  }

  if (status === "loading" || isLoadingPage) {
    return (
      <div className="flex flex-col items-center w-full min-h-[calc(100vh-4rem)]">
        <TableSkeleton rowCount={10} columnCount={7} />
      </div>
    );
  }

  if (!session || !session.user?.accountType) {
    return <div>Error: User account type not available</div>;
  }

  return (
    <DashboardView
      session={session}
      isLoadingInitial={false}
      initialPatients={initialPatients}
    />
  );
}
