// apps/web/components/patient-chart/PatientNotes/PreviousNotesViewModel.tsx
import { usePatientDashboard } from "../../PatientViewModelContext";
import type { Note } from "@/db/schema/notes";

export function usePreviousNotesViewModel() {
  const { notes, loadingNotes: loading, draftNotes } = usePatientDashboard();

  const handleDownload = (note: Note) => {
    const blob = new Blob([JSON.stringify(note)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `note-${note.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    notes,
    loading,
    handleDownload,
    draftNotes,
  };
}
