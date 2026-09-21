// apps/web/app/telegram-patient/[token]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { TelegramPatientFormContainer } from "@/components/telegram-patient/TelegramPatientFormContainer";
import { LoadingSpinner } from "@/components/telegram-patient/container/intake-form/view/LoadinerSpinner";
import { Spotlight } from "@/components/telegram-patient/aboutPage/Spotlight";
import { useEffect, useState } from "react";

export default function TelegramPatientPage() {
  const params = useParams();
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    // Extract token from params
    if (params && params.token) {
      setToken(params.token as string);
    }
  }, [params]);

  if (!token) {
    return <LoadingSpinner message="Loading patient data..." />;
  }

  return (
    <div className="bg-background w-full h-full min-h-screen relative">
      {/* Teal Spotlight Effect */}
      <Spotlight
        className="fixed -top-20 -left-20 md:-left-40 md:-top-40"
        fill="#359D98"
        isInView={true}
      />
      <div className="relative z-10 w-full h-full">
        <TelegramPatientFormContainer token={token} />
      </div>
    </div>
  );
}
