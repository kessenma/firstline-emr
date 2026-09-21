"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm, FormProvider } from "react-hook-form";
import { Plus, SendHorizonal, Save, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TextFormField } from "@/components/ui/TextFormField";
import { SelectFormField } from "@/components/form/SelectFormField";
import { DatePickerFormField } from "@/components/form/DatePickerFormField";
import { PhoneFormField } from "@/components/form/PhoneFormField";
import { RadioCard } from "@/components/ui/radio-card";
import { Textarea } from "@/components/ui/textarea";
import { useMissions } from "@/hooks/useMissions";
import { DoctorSpecialties } from "@/data/doctorSpecialty.enum";
import { CountriesList } from "@/data/countries.enum";


const LANGUAGE_OPTIONS = ["English", "Arabic", "Farsi", "Pashto"];

interface CreatePatientFormValues {
  firstName: string;
  lastName: string;
  dob: string;
  language: string;
  chiefComplaint: string;
  currentMeds: string;
  allergies: string;
  city: string;
  phone: {
    countryCode: string;
    phoneNumber: string;
  };
  country: string;
  specialty: string;
  status: string;
  missionId: string;
  hospital: string;
}

interface CreatePatientFormProps {
  draftId?: string | null;
}

export function CreatePatientForm({ draftId }: CreatePatientFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasMedications, setHasMedications] = useState<string | null>(null);
  const [hasAllergies, setHasAllergies] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(draftId || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);
  const { missions } = useMissions();

  const specialtyOptions = DoctorSpecialties;

  const form = useForm<CreatePatientFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      dob: "",
      language: "English",
      chiefComplaint: "",
      currentMeds: "",
      allergies: "",
      city: "",
      phone: {
        countryCode: "+972",
        phoneNumber: "",
      },
      country: "",
      specialty: specialtyOptions[0],
      status: "Pre-Op / Not Cleared",
      missionId: "",
      hospital: "",
    },
  });

  const firstName = form.watch("firstName");
  const lastName = form.watch("lastName");
  const isValid = !!(firstName?.trim() && lastName?.trim());

  // Load existing draft if resuming
  useEffect(() => {
    if (!draftId) return;
    (async () => {
      try {
        const res = await fetch(`/api/patient/drafts/${draftId}`);
        if (!res.ok) return;
        const { data: draft } = await res.json();
        if (!draft) return;

        form.reset({
          firstName: draft.firstName || "",
          lastName: draft.lastName || "",
          dob: draft.dob || "",
          language: draft.language || "English",
          chiefComplaint: draft.chiefComplaint || "",
          currentMeds: draft.currentMeds || "",
          allergies: draft.allergies || "",
          city: draft.city || "",
          phone: draft.phone || { countryCode: "+972", phoneNumber: "" },
          country: draft.country || "",
          specialty: draft.specialties?.[0] || specialtyOptions[0],
          status: draft.status || "Pre-Op / Not Cleared",
          missionId: draft.missionId || "",
          hospital: draft.hospital || "",
        });

        if (draft.currentMeds) setHasMedications("Yes");
        if (draft.allergies) {
          setHasAllergies(draft.allergies === "No allergies" ? "No allergies" : "Yes");
        }
        setEditingDraftId(draftId);
      } catch (err) {
        console.error("Failed to load draft:", err);
      }
    })();
  }, [draftId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select active intake mission once missions load
  const activeIntake = missions.find(m => m.isActiveIntake);
  useEffect(() => {
    if (activeIntake && !form.getValues("missionId") && !draftId) {
      form.setValue("missionId", activeIntake.id);
      if (activeIntake.defaultIntakeHospital) {
        form.setValue("hospital", activeIntake.defaultIntakeHospital);
      }
    }
  }, [activeIntake, form, draftId]);

  // Derive hospital options from selected mission
  const selectedMissionId = form.watch("missionId");
  const selectedMission = missions.find(m => m.id === selectedMissionId);
  const hospitalOptions = (selectedMission?.hospitals || []).map(h =>
    typeof h === "string" ? h : h.name
  );

  // --- Auto-save logic ---
  const saveDraft = useCallback(async () => {
    const data = form.getValues();
    const hasContent = !!(
      data.firstName?.trim() ||
      data.lastName?.trim() ||
      data.chiefComplaint?.trim() ||
      data.city?.trim() ||
      data.currentMeds?.trim() ||
      data.allergies?.trim()
    );
    if (!hasContent) return false;

    try {
      const payload: Record<string, any> = {
        ...data,
        missionId: data.missionId || undefined,
        hospital: data.hospital || undefined,
        phone: {
          countryCode: data.phone.countryCode,
          phoneNumber: data.phone.phoneNumber,
        },
      };

      if (editingDraftId) {
        // Update existing draft
        const res = await fetch("/api/patient/drafts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingDraftId, ...payload }),
        });
        return res.ok;
      } else {
        // Create new draft
        const res = await fetch("/api/patient/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.data?.id) setEditingDraftId(result.data.id);
          return true;
        }
        return false;
      }
    } catch (err) {
      console.error("Auto-save failed:", err);
      return false;
    }
  }, [form, editingDraftId]);

  // Watch all form values for auto-save trigger
  const watchedValues = form.watch();

  // Initialization delay then start auto-saving on form changes
  useEffect(() => {
    isInitializedRef.current = false;
    const t = setTimeout(() => { isInitializedRef.current = true; }, 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isInitializedRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      const [success] = await Promise.all([
        saveDraft(),
        new Promise(r => setTimeout(r, 800)),
      ]);
      setAutoSaveStatus(success ? "saved" : "idle");
      if (success) setTimeout(() => setAutoSaveStatus("idle"), 2000);
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [watchedValues, saveDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (data: CreatePatientFormValues) => {
    setError(null);
    setSubmitting(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    try {
      const formattedData: Record<string, any> = {
        ...data,
        missionId: data.missionId || undefined,
        hospital: data.hospital || undefined,
        phone: {
          countryCode: data.phone.countryCode,
          phoneNumber: data.phone.phoneNumber,
        },
      };

      if (editingDraftId) {
        // Publish existing draft
        const response = await fetch("/api/patient/drafts/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId: editingDraftId, ...formattedData }),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to publish patient.");
        }
      } else {
        // Create new published patient
        const response = await fetch("/api/patient", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formattedData),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message || "Failed to create patient.");
        }
      }

      router.push("/patient-dashboard");
    } catch (err) {
      console.error("Error creating patient:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Auto-save indicator */}
        {autoSaveStatus !== "idle" && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {autoSaveStatus === "saving" ? (
              <>
                <Save className="w-3.5 h-3.5" />
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </>
            ) : (
              <span className="text-green-600">Saved</span>
            )}
          </div>
        )}

        {error && <p className="text-destructive mb-4">{error}</p>}

        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm text-primary">
            First Name *
          </Label>
          <TextFormField
            fieldName="firstName"
            fieldLabel=""
            placeholder=""
            error={form.formState.errors.firstName?.message}
            className="rounded-md border-border shadow-xl focus:ring-0 focus:border-border"
          />
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm text-primary">
            Last Name *
          </Label>
          <TextFormField
            fieldName="lastName"
            fieldLabel=""
            placeholder=""
            error={form.formState.errors.lastName?.message}
            className="rounded-md border-border shadow-xl focus:ring-0 focus:border-border"
          />
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="dob" className="text-sm text-primary">
            Date of Birth
          </Label>
          <div className="shadow-xl">
            <DatePickerFormField name="dob" label="" type="past" required />
          </div>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language" className="text-sm text-primary">
            Language
          </Label>
          <SelectFormField
            classNames="shadow-xl"
            selectOptions={LANGUAGE_OPTIONS}
            form={form}
            fieldName="language"
            fieldLabel=""
          />
        </div>

        {/* Chief Complaint */}
        <div className="space-y-2">
          <Label htmlFor="chiefComplaint" className="text-sm text-primary">
            Chief Complaint
          </Label>
          <TextFormField
            fieldName="chiefComplaint"
            fieldLabel=""
            placeholder=""
            multiline={true}
            rows={4}
            error={form.formState.errors.chiefComplaint?.message}
            className="rounded-md border-border focus:ring-0 focus:border-primary shadow-xl"
          />
        </div>

        {/* Current Medications */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-primary">
              Currently taking any medications?
            </Label>
            <RadioCard.Root
              value={hasMedications || ""}
              onValueChange={(value) => {
                setHasMedications(value);
                if (value === "No") {
                  form.setValue("currentMeds", "");
                }
              }}
              className="flex gap-3"
            >
              {["Yes", "No"].map((option) => (
                <RadioCard.Item key={option} value={option} className="flex-1">
                  <div className="text-center font-medium text-sm">{option}</div>
                </RadioCard.Item>
              ))}
            </RadioCard.Root>
          </div>

          {hasMedications === "Yes" && (
            <div className="space-y-2">
              <Textarea
                placeholder="List your current medications..."
                value={form.watch("currentMeds") || ""}
                onChange={(e) => {
                  form.setValue("currentMeds", e.target.value);
                }}
                className={`min-h-[100px] rounded-md border-border focus:ring-0 focus:border-border shadow-xl ${
                  form.watch("currentMeds") ? "bg-white dark:bg-zinc-800" : "bg-background"
                }`}
              />
            </div>
          )}
        </div>

        {/* Allergies */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-primary">
              Do you have any allergies?
            </Label>
            <RadioCard.Root
              value={hasAllergies || ""}
              onValueChange={(value) => {
                setHasAllergies(value);
                if (value === "No allergies") {
                  form.setValue("allergies", "No allergies");
                } else {
                  form.setValue("allergies", "");
                }
              }}
              className="flex gap-3"
            >
              {["Yes", "No allergies"].map((option) => (
                <RadioCard.Item key={option} value={option} className="flex-1">
                  <div className="text-center font-medium text-sm">{option}</div>
                </RadioCard.Item>
              ))}
            </RadioCard.Root>
          </div>

          {hasAllergies === "Yes" && (
            <div className="space-y-2">
              <Textarea
                placeholder="List your allergies..."
                value={form.watch("allergies") || ""}
                onChange={(e) => {
                  form.setValue("allergies", e.target.value);
                }}
                className={`min-h-[100px] rounded-md border-border focus:ring-0 focus:border-border shadow-xl ${
                  form.watch("allergies") ? "bg-white dark:bg-zinc-800" : "bg-background"
                }`}
              />
            </div>
          )}
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm text-primary">
            City
          </Label>
          <TextFormField
            fieldName="city"
            fieldLabel=""
            placeholder=""
            error={form.formState.errors.city?.message}
            className="rounded-md border-border shadow-xl focus:ring-0 focus:border-border"
          />
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm text-primary">
            Country
          </Label>
          <SelectFormField
            classNames="shadow-xl"
            selectOptions={CountriesList}
            form={form}
            fieldName="country"
            fieldLabel=""
          />
        </div>

        {/* Mission */}
        <div className="space-y-2">
          <Label className="text-sm text-primary">
            Mission
          </Label>
          <select
            value={form.watch("missionId")}
            onChange={(e) => {
              form.setValue("missionId", e.target.value);
              const mission = missions.find(m => m.id === e.target.value);
              form.setValue("hospital", mission?.defaultIntakeHospital || "");
            }}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xl"
          >
            <option value="">No mission selected</option>
            {missions
              .sort((a, b) => {
                const order: Record<string, number> = { active: 0, planned: 1, completed: 2 };
                return (order[a.status] ?? 3) - (order[b.status] ?? 3);
              })
              .map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.country}){m.isActiveIntake ? " - Active Intake" : ""}
                </option>
              ))}
          </select>
        </div>

        {/* Hospital */}
        <div className="space-y-2">
          <Label className="text-sm text-primary">
            Hospital
          </Label>
          <select
            value={form.watch("hospital")}
            onChange={(e) => form.setValue("hospital", e.target.value)}
            disabled={!selectedMissionId || hospitalOptions.length === 0}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xl disabled:opacity-50"
          >
            <option value="">
              {!selectedMissionId ? "Select a mission first" :
               hospitalOptions.length === 0 ? "No hospitals for this mission" : "Not assigned"}
            </option>
            {hospitalOptions.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div className="space-y-2 shadow-xl">
          <Label htmlFor="phone" className="text-sm text-primary">
            Phone
          </Label>
          <PhoneFormField
            form={form}
            fieldName="phone"
            fieldLabel=""
            placeholder="### - ### - ####"
            required
          />
        </div>

        {/* Specialty */}
        <div className="space-y-2">
          <Label htmlFor="specialty" className="text-sm text-primary">
            Specialty
          </Label>
          <SelectFormField
            classNames="shadow-xl"
            selectOptions={specialtyOptions}
            form={form}
            fieldName="specialty"
            fieldLabel=""
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <Button
            type="submit"
            disabled={submitting || !isValid}
            className={`rounded-full px-6 py-2 flex items-center gap-2 transition-all ${
              isValid
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Plus className="w-4 h-4" />
            <SendHorizonal className="w-4 h-4" />
            {submitting ? "Creating..." : "Create Patient"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
