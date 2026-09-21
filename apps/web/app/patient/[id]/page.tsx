// app/patient/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import PatientViewModel from "@/components/patient-chart/PatientViewModel";
import { useParams } from "next/navigation";
import StackedLoader from "@/components/ui/StackedLoader";

const PatientView = () => {
  const { id } = useParams() as { id: string }; // Explicitly define `id` as a string
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate a loading delay or until the necessary data is ready
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mx-auto px-4">

      {/* Loader */}
      <div
        className={`
                    fixed inset-0 flex flex-col items-center justify-center
                    transition-opacity duration-1000 ease-in-out
                    ${isLoading ? "opacity-100 z-50" : "opacity-0 z-0 pointer-events-none"}
                `}
      >
        <StackedLoader />
      </div>

      {/* Main Content */}
      <div
        className={`
                    transition-opacity duration-1000 ease-in-out
                    ${isLoading ? "opacity-0" : "opacity-100"}
                `}
      >
        <PatientViewModel />
      </div>
    </div>
  );
};

export default PatientView;
