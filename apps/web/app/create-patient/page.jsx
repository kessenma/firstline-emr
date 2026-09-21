"use client";

import { useState, useEffect, useCallback } from "react";
import { CreatePatientForm } from "@/components/create-patient/CreatePatientForm";
import { BulkPatientUploadCSV } from "@/components/create-patient/BulkPatientUploadCSV";
import { GridPattern } from "@/components/ui/grid-pattern";
import { FileText, Trash2, Loader2 } from "lucide-react";

function DraftsList({ onResume }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/drafts");
      if (res.ok) {
        const { data } = await res.json();
        setDrafts(data || []);
      }
    } catch (err) {
      console.error("Failed to load drafts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;
    try {
      const res = await fetch(`/api/patient/drafts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete draft:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">No saved drafts</p>
        <p className="text-xs text-muted-foreground">
          Start creating a patient and your progress will be saved automatically
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => {
        const name = [draft.firstName, draft.lastName].filter(Boolean).join(" ") || "Unnamed";
        const subtitle = draft.chiefComplaint || "No chief complaint";
        const date = draft.updatedAt
          ? new Date(draft.updatedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return (
          <div
            key={draft.id}
            className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => onResume(draft.id)}
          >
            <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{date}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(draft.id);
              }}
              className="p-1 hover:bg-destructive/10 rounded text-destructive flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function CreatePatientPage() {
  const [mode, setMode] = useState("single");
  const [editingDraftId, setEditingDraftId] = useState(null);

  const handleResumeDraft = (draftId) => {
    setEditingDraftId(draftId);
    setMode("single");
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode !== "single") setEditingDraftId(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GridPattern
        width={30}
        height={30}
        className="absolute inset-0 h-full w-full fill-primary/5 stroke-primary/10 [mask-image:radial-gradient(900px_circle_at_center,white,transparent)]"
      />
      <div className={`relative z-10 p-6 pt-16 mx-auto ${mode === "bulk" ? "max-w-6xl" : "max-w-2xl"}`}>
        <h1 className="text-2xl font-bold mb-6 text-center">Create New Patient</h1>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full p-1 bg-muted">
            {["single", "bulk", "drafts"].map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "single" ? "Single Patient" : m === "bulk" ? "Bulk Upload" : "Drafts"}
              </button>
            ))}
          </div>
        </div>

        {mode === "single" ? (
          <CreatePatientForm key={editingDraftId || "new"} draftId={editingDraftId} />
        ) : mode === "bulk" ? (
          <BulkPatientUploadCSV />
        ) : (
          <DraftsList onResume={handleResumeDraft} />
        )}
      </div>
    </div>
  );
}
