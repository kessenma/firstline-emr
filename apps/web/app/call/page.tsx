// app/call/page.tsx
//
// Patient-facing join page. Public route (see proxy.ts) — the invite token in
// the query string is the only credential.
import { Suspense } from "react";
import dynamicImport from "next/dynamic";

// Force dynamic rendering - prevents static generation at build time
export const dynamic = "force-dynamic";

// next/dynamic rather than React.lazy: the child reads useSearchParams(), which
// needs a Suspense boundary, and lazy() here had none.
const PatientVideoCall = dynamicImport(
  () => import("@/components/patient-chart/videocall/PatientVideoCall"),
);

const VideoPage = () => (
  <Suspense
    fallback={
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    }
  >
    <PatientVideoCall />
  </Suspense>
);

export default VideoPage;
