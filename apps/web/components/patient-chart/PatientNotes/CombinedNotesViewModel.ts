// apps/web/components/patient-chart/PatientNotes/CombinedNotesViewModel.ts
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
// Note shape and guards are shared with mobile. This file held a third copy of
// the same three guards (CombinedNotesView and PreviousNotesView had the other
// two) — all now deleted in favour of the shared implementation.
import {
  isBlankNote,
  isProcedureNote,
  isSubjectiveNote,
  type NoteBase as Note,
} from "@fajr/shared/patient";
import { usePatientDashboard } from "../PatientViewModelContext";

// Define the ProcedureNote interface
export interface ProcedureNote {
  date: string;
  time: string;
  procedureName: string;
  attendingPhysician: string;
  diagnosis: string;
  cptCodes: Array<{
    code: string;
    description: string;
  }>;
  icd10Codes: Array<{
    code: string;
    description: string;
  }>;
  notes: string;
  plan: string;
}

// Define the SubjectiveNote interface
export interface SubjectiveNote {
  date: string;
  time: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10Codes: Array<{
    code: string;
    description: string;
  }>;
  cptCodes: Array<{
    code: string;
    description: string;
  }>;
}

export interface BlankNote {
  date: string;
  time: string;
  noteField: string;
}

export function CombinedNotesViewModel(patientId: string) {
  const { data: session } = useSession(); // Use session directly here
  const { notes, refreshPatientNotes, dashboardNotes, patientInfo } = usePatientDashboard();
  const authorName = `${session?.user?.firstName || ""} ${session?.user?.lastName || ""}`;
  const authorID = session?.user?._id || "";

  // Resolve attending physician from care team lead (fallback to current user)
  const leadSurgeon = patientInfo?.leadSurgeon;
  const attendingPhysicianId = leadSurgeon?.userId || authorID;
  const attendingPhysicianName = leadSurgeon
    ? `${leadSurgeon.firstName} ${leadSurgeon.lastName}`.trim()
    : authorName;

  const [templateType, setTemplateType] = useState<
    "procedure" | "subjective" | "blank"
  >("procedure");
  const [isLoading, setIsLoading] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);

  // Initialize state for each type of note
  const [procedureNote, setProcedureNote] = useState<ProcedureNote>({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().split(" ")[0],
    procedureName: "",
    attendingPhysician: authorName,
    diagnosis: "",
    cptCodes: [],
    icd10Codes: [],
    notes: "",
    plan: "",
  });

  const [subjectiveNote, setSubjectiveNote] = useState<SubjectiveNote>({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().split(" ")[0],
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    icd10Codes: [],
    cptCodes: [],
  });

  const [blankNote, setBlankNote] = useState<BlankNote>({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().split(" ")[0],
    noteField: "",
  });

  // Update attending physician when care team lead or session changes
  useEffect(() => {
    if (attendingPhysicianName) {
      setProcedureNote((prev) => ({ ...prev, attendingPhysician: attendingPhysicianName }));
    }
  }, [attendingPhysicianName]);

  // Function to set the note fields based on type
  const setNoteField = (
    noteType: "procedure" | "subjective" | "blank",
    name: string,
    value: string,
  ) => {
    switch (noteType) {
      case "procedure":
        setProcedureNote((prev) => ({ ...prev, [name]: value }));
        break;
      case "subjective":
        setSubjectiveNote((prev) => ({ ...prev, [name]: value }));
        break;
      case "blank":
        setBlankNote((prev) => ({ ...prev, [name]: value }));
        break;
      default:
        console.error("Invalid note type");
    }
  };

  // Function to set ICD10 codes for subjective notes
  const setICD10Codes = (
    codes: Array<{ code: string; description: string }>,
  ) => {
    setSubjectiveNote((prev) => ({ ...prev, icd10Codes: codes }));
  };

  // Function to set CPT codes for procedure notes
  const setCPTCodes = (codes: Array<{ code: string; description: string }>) => {
    setProcedureNote((prev) => ({ ...prev, cptCodes: codes }));
  };

  // Function to set ICD10 codes for procedure notes
  const setProcedureICD10Codes = (
    codes: Array<{ code: string; description: string }>,
  ) => {
    setProcedureNote((prev) => ({ ...prev, icd10Codes: codes }));
  };

  // Function to set CPT codes for subjective notes
  const setSubjectiveCPTCodes = (
    codes: Array<{ code: string; description: string }>,
  ) => {
    setSubjectiveNote((prev) => ({ ...prev, cptCodes: codes }));
  };

  const populateNote = (note: Note) => {
    const noteType = note.noteType;
    // setTemplateType(noteType);
    if (note.id) {
      setNoteId(note.id);
    }

    if (isProcedureNote(note)) {
      setNoteField("procedure", "procedureName", note.content.procedureName);
      setNoteField(
        "procedure",
        "attendingPhysician",
        note.content.attendingPhysician,
      );
      setNoteField("procedure", "diagnosis", note.content.diagnosis);
      setNoteField("procedure", "notes", note.content.notes);
      setNoteField("procedure", "plan", note.content.plan);
      if (note.content.cptCodes) {
        setCPTCodes(note.content.cptCodes);
      }
      if (note.content.icd10Codes) {
        setProcedureICD10Codes(note.content.icd10Codes);
      }
    } else if (isSubjectiveNote(note)) {
      setNoteField("subjective", "subjective", note.content.subjective);
      setNoteField("subjective", "objective", note.content.objective);
      setNoteField("subjective", "assessment", note.content.assessment);
      setNoteField("subjective", "plan", note.content.plan);
      if (note.content.icd10Codes) {
        setICD10Codes(note.content.icd10Codes);
      }
      if (note.content.cptCodes) {
        setSubjectiveCPTCodes(note.content.cptCodes);
      }
    } else if (isBlankNote(note)) {
      setNoteField("blank", "noteField", note.content.noteField);
    } else {
      console.error("Invalid note type");
    }
  };

  const createNote = useCallback(
    async (draft: boolean) => {
      if (!authorID || !patientId) {
        console.error("Missing authorID or patientId");
        return;
      }

      const commonFields = {
        email: session?.user.email,
        authorName,
        authorID,
        draft,
        noteId,
        attendingPhysicianId,
        attendingPhysicianName,
        ...(noteId ? { lastEditedById: authorID, lastEditedByName: authorName } : {}),
      };

      let noteData;
      switch (templateType) {
        case "procedure":
          noteData = {
            noteType: "procedure",
            content: procedureNote,
            ...commonFields,
          };
          break;
        case "subjective":
          noteData = {
            noteType: "subjective",
            content: subjectiveNote,
            ...commonFields,
          };
          break;
        case "blank":
          noteData = {
            noteType: "blank",
            content: blankNote,
            ...commonFields,
          };
          break;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/patient/${patientId}/notes/doctor-notes`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(noteData),
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to create note: ${response.status}`);
        }

        await refreshPatientNotes(); // Refresh the notes

        // Reset the form fields after successful note creation
        resetNoteFields();
      } catch (error) {
        console.error("Error creating note:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      templateType,
      procedureNote,
      subjectiveNote,
      blankNote,
      patientId,
      authorID,
      authorName,
      attendingPhysicianId,
      attendingPhysicianName,
      session,
      refreshPatientNotes,
      noteId,
    ],
  );

  const publishNote = async (noteId: string) => {
    try {
      const response = await fetch(
        `/api/patient/${patientId}/notes/doctor-notes`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteId,
            draft: false,
            lastEditorId: authorID,
            lastEditorName: authorName,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to publish note: ${response.status}`);
      }
      await refreshPatientNotes();
    } catch (error) {
      console.error("Error publishing note:", error);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const response = await fetch(
        `/api/patient/${patientId}/notes/doctor-notes/`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ noteId }),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to delete note: ${response.status}`);
      }

      await refreshPatientNotes(); // Refresh the notes
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  // Helper function to reset form fields
  const resetNoteFields = () => {
    setProcedureNote({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().split(" ")[0],
      procedureName: "",
      attendingPhysician: attendingPhysicianName,
      diagnosis: "",
      cptCodes: [],
      icd10Codes: [],
      notes: "",
      plan: "",
    });

    setSubjectiveNote({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().split(" ")[0],
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      icd10Codes: [],
      cptCodes: [],
    });

    setBlankNote({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().split(" ")[0],
      noteField: "",
    });
  };

  // Ensure setNoteField is returned
  return {
    notes,
    templateType,
    setTemplateType,
    procedureNote,
    subjectiveNote,
    blankNote,
    populateNote,
    deleteNote,
    publishNote,
    setNoteField,
    setICD10Codes,
    setCPTCodes,
    setProcedureICD10Codes,
    setSubjectiveCPTCodes,
    createNote,
    isLoading,
    dashboardNotes,
    attendingPhysicianName,
  };
}
