"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAnonymizedName } from "@fajr/shared/patient-utils";
import {
  ExternalLink,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Stethoscope,
  Activity,
  Pill,
  AlertTriangle,
} from "lucide-react";

interface PatientDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}

interface PatientDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: { countryCode: string; phoneNumber: string } | null;
  email: string | null;
  dob: string | null;
  gender: string | null;
  country: string | null;
  city: string | null;
  chiefComplaint: string | null;
  diagnosis: string | null;
  diagnosisCat: string | null;
  icd10: string | null;
  hospital: string | null;
  priority: string | null;
  status: string | null;
  specialties: string[] | null;
  baselineAmbu: string | null;
  pmhx: string | null;
  pshx: string | null;
  famhx: string | null;
  allergies: string | null;
  currentMeds: string | null;
  prevMeds: string | null;
  smokeCount: string | null;
  drinkCount: string | null;
  createdAt: string | null;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div>
        <span className="text-muted-foreground">{label}:</span>{" "}
        <span className="text-foreground">{value}</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

export function PatientDetailSheet({ open, onOpenChange, patientId }: PatientDetailSheetProps) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !patientId) return;

    const fetchPatient = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/patient/${patientId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch patient");
        const data = await res.json();
        setPatient(data.patient || data);
      } catch (err) {
        setError("Failed to load patient details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [open, patientId]);

  const name = patient
    ? getAnonymizedName(patient.firstName, patient.lastName)
    : "";

  const phoneDisplay = patient?.phone
    ? `${patient.phone.countryCode || ""} ${patient.phone.phoneNumber || ""}`.trim()
    : null;

  const dobDisplay = patient?.dob
    ? new Date(patient.dob).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            {loading ? "Loading..." : name}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-sm text-destructive">{error}</div>
        ) : patient ? (
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-4 space-y-4">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-1.5">
                {patient.status && <Badge variant="default">{patient.status}</Badge>}
                {patient.priority && patient.priority !== "Not Selected" && (
                  <Badge variant={patient.priority === "Emergency" || patient.priority === "Urgent" ? "destructive" : "secondary"}>
                    {patient.priority}
                  </Badge>
                )}
                {patient.hospital && (
                  <Badge variant="outline">{patient.hospital}</Badge>
                )}
              </div>

              <Separator />

              {/* Personal Info */}
              <Section title="Personal Information">
                <div className="space-y-1.5">
                  <InfoRow icon={Calendar} label="DOB" value={dobDisplay} />
                  <InfoRow icon={User} label="Gender" value={patient.gender} />
                  <InfoRow icon={MapPin} label="Location" value={[patient.city, patient.country].filter(Boolean).join(", ") || null} />
                  <InfoRow icon={Phone} label="Phone" value={phoneDisplay} />
                  <InfoRow icon={Mail} label="Email" value={patient.email} />
                </div>
              </Section>

              <Separator />

              {/* Medical Info */}
              <Section title="Medical Information">
                <div className="space-y-1.5">
                  <InfoRow icon={Activity} label="Chief Complaint" value={patient.chiefComplaint} />
                  <InfoRow icon={Stethoscope} label="Diagnosis" value={patient.diagnosis} />
                  <InfoRow icon={Stethoscope} label="ICD-10" value={patient.icd10} />
                  <InfoRow icon={Activity} label="Baseline Ambulation" value={patient.baselineAmbu && patient.baselineAmbu !== "Not Selected" ? patient.baselineAmbu : null} />
                </div>
              </Section>

              {/* Specialties */}
              {patient.specialties && patient.specialties.length > 0 && (
                <>
                  <Separator />
                  <Section title="Specialties">
                    <div className="flex flex-wrap gap-1">
                      {patient.specialties.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </Section>
                </>
              )}

              <Separator />

              {/* Medical History */}
              <Section title="Medical History">
                <div className="space-y-1.5">
                  <InfoRow icon={Activity} label="PMHx" value={patient.pmhx} />
                  <InfoRow icon={Activity} label="PSHx" value={patient.pshx} />
                  <InfoRow icon={Activity} label="FamHx" value={patient.famhx} />
                  <InfoRow icon={AlertTriangle} label="Allergies" value={patient.allergies} />
                  <InfoRow icon={Pill} label="Current Meds" value={patient.currentMeds} />
                  <InfoRow icon={Pill} label="Previous Meds" value={patient.prevMeds} />
                </div>
              </Section>

              {/* Social History */}
              {(patient.smokeCount || patient.drinkCount) && (
                <>
                  <Separator />
                  <Section title="Social History">
                    <div className="space-y-1.5">
                      <InfoRow icon={Activity} label="Smoking" value={patient.smokeCount} />
                      <InfoRow icon={Activity} label="Alcohol" value={patient.drinkCount} />
                    </div>
                  </Section>
                </>
              )}

              {/* Action */}
              <Separator />
              <Button
                className="w-full"
                onClick={() => window.open(`/patient/${patientId}`, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Full Patient Chart
              </Button>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
