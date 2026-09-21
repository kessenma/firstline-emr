// apps/web/app/patient-dashboard/page.tsx

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import DashboardClientWrapper from "@/components/patient-dashboard/PatientDashboardClientWrapper";
import { authOptions } from "@/lib/auth";
import { fetchActivePatientsWithMessages } from "@/lib/server/patients";

export default async function DashboardPage() {
  // Get server-side session
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (!session.user?.accountType) {
    return <div>Error: User account type not available</div>;
  }

  // Pre-fetch initial patient data on the server
  const initialPatients = await fetchActivePatientsWithMessages();

  // Serialize data for client component (convert Dates to strings, ensure JSON compatibility)
  const serializedPatients = JSON.parse(JSON.stringify(initialPatients));

  return (
    <div className="w-full h-screen mt-12 mb-16">
      <DashboardClientWrapper
        session={session}
        initialPatients={serializedPatients}
      />
    </div>
  );
}
