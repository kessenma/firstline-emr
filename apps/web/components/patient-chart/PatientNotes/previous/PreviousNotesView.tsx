// apps/web/components/patient-chart/PatientNotes/PreviousNotesView.tsx
import React, { useState, useCallback, Dispatch, SetStateAction } from "react";
import {
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Trash2Icon,
  Send,
  History,
} from "lucide-react";
import { usePreviousNotesViewModel } from "./PreviousNotesViewModel";
import { ScrollArea } from "../../../ui/scroll-area";
import { RadioCard } from "@/components/ui/radio-card";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "next/navigation";
import { NoteContributors } from "../NoteContributors";
// Shared with mobile — see the note in CombinedNotesView about the duplicate
// guards these replace.
import {
  isBlankNote,
  isPatientCallNote,
  isProcedureNote,
  isSubjectiveNote,
  type NoteBase as Note,
  type NoteEditBase as NoteEdit,
} from "@fajr/shared/patient";
import { TranscriptBlock } from "../TranscriptBlock";

/** Resolve attending physician name with fallback chain */
function getAttendingName(note: Note): string | null {
  if (note.attendingPhysicianName) return note.attendingPhysicianName;
  if (isProcedureNote(note) && note.content?.attendingPhysician) {
    return note.content.attendingPhysician;
  }
  return note.authorName || null;
}

/** Lazy-loaded edit history accordion for a single note */
function NoteEditHistory({ noteId, patientId }: { noteId: string; patientId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [edits, setEdits] = useState<NoteEdit[]>([]);
  const [loaded, setLoaded] = useState(false);

  const toggle = useCallback(async () => {
    if (!expanded && !loaded) {
      try {
        const res = await fetch(`/api/patient/${patientId}/notes/${noteId}/edits`);
        if (res.ok) {
          setEdits(await res.json());
        }
      } catch (e) {
        console.error("Failed to fetch note edits:", e);
      }
      setLoaded(true);
    }
    setExpanded((prev) => !prev);
  }, [expanded, loaded, noteId, patientId]);

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="h-3.5 w-3.5" />
        <span className="font-medium">Edit History{edits.length > 0 ? ` (${edits.length})` : ""}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-5 pt-1.5 space-y-1">
              {edits.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No edit history</p>
              ) : (
                edits.map((edit) => (
                  <div key={edit.id} className="text-xs">
                    <span className="font-medium text-foreground">{edit.editorName || "Unknown"}</span>
                    {(edit.editorAccountType || edit.editorCareTeamRole) && (
                      <span className="text-muted-foreground/70">
                        {" "}({[edit.editorAccountType, edit.editorCareTeamRole].filter(Boolean).join(" / ")})
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {" "}{edit.editType} · {new Date(edit.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PreviousNotesViewProps {
  patientId: string;
  deleteNote: (noteId: string) => void;
  publishNote?: (noteId: string) => void;
  setTemplateType: Dispatch<
    SetStateAction<"subjective" | "procedure" | "blank">
  >;
  populateNote: (note: Note) => void;
}

/** Check if a note has all required fields filled for publishing */
function isNotePublishable(note: Note): boolean {
  if (!note.content) return false;
  if (isProcedureNote(note)) {
    const c = note.content;
    return !!(c.attendingPhysician?.trim() && c.procedureName?.trim() && c.diagnosis?.trim() && c.notes?.trim() && c.plan?.trim());
  }
  if (isSubjectiveNote(note)) {
    const c = note.content;
    return !!(c.subjective?.trim() && c.objective?.trim() && c.assessment?.trim() && c.plan?.trim());
  }
  if (isBlankNote(note)) {
    return !!note.content.noteField?.trim();
  }
  if (isPatientCallNote(note)) {
    return (
      Array.isArray(note.content.segments) && note.content.segments.length > 0
    );
  }
  return false;
}

export function PreviousNotesView({
  patientId,
  setTemplateType,
  deleteNote,
  publishNote,
  populateNote,
}: PreviousNotesViewProps) {
  const { notes, loading, draftNotes } = usePreviousNotesViewModel();
  const [expandedNotes, setExpandedNotes] = useState<string[]>([]);
  const [expandAll, setExpandAll] = useState(false);
  const [viewingDraftNotes, setViewingDraftNotes] = useState(false);
  const { data: session } = useSession();
  const params = useParams() as { id: string };

  if (loading) return <p>Loading...</p>; // Render loading state

  // Toggles individual note expansion
  const toggleNoteExpansion = (noteId: string) => {
    if (expandedNotes.includes(noteId)) {
      setExpandedNotes(expandedNotes.filter((id) => id !== noteId));
    } else {
      setExpandedNotes([...expandedNotes, noteId]);
    }
  };

  // Toggles expansion for all notes
  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedNotes([]); // Collapse all notes
    } else {
      setExpandedNotes(notes.map((note) => note.id)); // Expand all notes
    }
    setExpandAll(!expandAll);
  };

  return (
    <div className="h-full bg-muted">
      <div className="flex justify-center items-center py-2">
        <motion.button
          onClick={toggleExpandAll}
          className="text-foreground border-border border-2 pt-0.5 pl-2 pr-2 rounded-full hover:text-card-foreground hover:bg-muted transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {expandAll ? (
            <ChevronsUp className="h-5 w-5" />
          ) : (
            <ChevronsDown className="h-5 w-5" />
          )}
        </motion.button>
      </div>
      <ScrollArea className="h-full w-full">
        {session?.user.accountType === "Doctor" && (
          <RadioCard.Root
            onValueChange={(value) => setViewingDraftNotes(value === "true")}
            className="flex w-full"
          >
            <RadioCard.Item
              value="false"
              className={`flex-1 ${!viewingDraftNotes ? "border-2 border-primary bg-primary text-primary-foreground" : "border-2 border-border text-muted-foreground hover:bg-muted transition-colors"}`}
            >
              Published
            </RadioCard.Item>
            <RadioCard.Item
              value="true"
              className={`flex-1 ${viewingDraftNotes ? "border-2 border-primary bg-primary text-primary-foreground" : "border-2 border-border text-muted-foreground hover:bg-muted transition-colors"}`}
            >
              Drafts
            </RadioCard.Item>
          </RadioCard.Root>
        )}
        {!viewingDraftNotes ? (
          notes.length > 0 ? (
            <motion.ul
              className="list-none m-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {notes.map((note) => {
                const noteId = note.id;
                const isExpanded = expandedNotes.includes(noteId);
                return (
                  <motion.li
                    key={noteId}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-card-foreground border-border border-t-2 border-l-2 p-4 m-4 rounded-lg bg-card"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <motion.button
                          onClick={() => toggleNoteExpansion(noteId)}
                          className="text-muted-foreground border-border border-2 pt-0.5 pl-2 pr-2 rounded-full hover:text-card-foreground hover:bg-muted transition-colors"
                          aria-expanded={isExpanded}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </motion.button>
                        <h3 className="text-center bg-primary border-2 p-2 text-primary-foreground inline-block ml-12 font-medium">
                          {note.noteType || "Note Type Unavailable"}
                        </h3>
                      </div>
                    </div>
                    <p className="mt-2 text-right text-muted-foreground">
                      {note.date
                        ? new Date(note.date).toLocaleString()
                        : "Date Unavailable"}
                    </p>
                    <p className="mt-2 text-center text-muted-foreground">
                      <i>{note.authorName || "Author Unavailable"}</i>
                    </p>
                    {getAttendingName(note) && (
                      <p className="text-center text-xs text-muted-foreground">
                        Attending: {getAttendingName(note)}
                      </p>
                    )}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-2 p-2 bg-background text-foreground rounded-sm overflow-hidden"
                        >
                          {isSubjectiveNote(note) && (
                            <>
                              <p>
                                <strong>Subjective:</strong>{" "}
                                {note.content.subjective}
                              </p>
                              <p>
                                <strong>Objective:</strong>{" "}
                                {note.content.objective}
                              </p>
                              <p>
                                <strong>Assessment:</strong>{" "}
                                {note.content.assessment}
                              </p>
                              {note.content.icd10Codes &&
                                note.content.icd10Codes.length > 0 && (
                                  <div>
                                    <p>
                                      <strong>ICD10 Codes:</strong>
                                    </p>
                                    <ul className="list-disc list-inside ml-4">
                                      {note.content.icd10Codes.map(
                                        (code, index) => (
                                          <li key={index}>
                                            {code.code} ({code.description})
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                              <p>
                                <strong>Plan:</strong> {note.content.plan}
                              </p>
                            </>
                          )}

                          {isProcedureNote(note) && (
                            <>
                              <p>
                                <strong>Procedure Name:</strong>{" "}
                                {note.content.procedureName}
                              </p>
                              <p>
                                <strong>Diagnosis:</strong>{" "}
                                {note.content.diagnosis}
                              </p>
                              {note.content.cptCodes &&
                                note.content.cptCodes.length > 0 && (
                                  <div>
                                    <p>
                                      <strong>CPT Codes:</strong>
                                    </p>
                                    <ul className="list-disc list-inside ml-4">
                                      {note.content.cptCodes.map(
                                        (code, index) => (
                                          <li key={index}>
                                            {code.code} ({code.description})
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                              <p>
                                <strong>Notes:</strong> {note.content.notes}
                              </p>
                              <p>
                                <strong>Plan:</strong> {note.content.plan}
                              </p>
                            </>
                          )}
                          {isBlankNote(note) && (
                            <>
                              <p>
                                <strong>Content:</strong>{" "}
                                {note.content.noteField}
                              </p>
                            </>
                          )}
                          {isPatientCallNote(note) && (
                            <TranscriptBlock content={note.content} />
                          )}
                          {/* Contributors */}
                          <NoteContributors noteId={noteId} patientId={params.id} />
                          {/* Edit history */}
                          <NoteEditHistory noteId={noteId} patientId={params.id} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </motion.ul>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-2 border-border border-2 text-muted-foreground rounded-lg m-4 p-4 text-center bg-card"
            >
              <p>
                <strong>No previous notes found</strong> for this patient.
              </p>
            </motion.div>
          )
        ) : draftNotes.length > 0 ? (
          <motion.ul
            className="list-none m-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {draftNotes.map((note) => {
              const noteId = note.id;
              const isExpanded = expandedNotes.includes(noteId);
              return (
                <motion.li
                  key={noteId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-card-foreground border-border border-t-2 border-l-2 p-4 m-4 rounded-lg bg-card cursor-pointer hover:bg-card/80 transition-colors"
                  onClick={() => {
                    setTemplateType(
                      note.noteType as "subjective" | "procedure" | "blank",
                    );
                    populateNote(note);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNoteExpansion(noteId);
                        }}
                        className="text-muted-foreground border-border border-2 pt-0.5 pl-2 pr-2 rounded-full hover:text-card-foreground hover:bg-muted transition-colors"
                        aria-expanded={isExpanded}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </motion.button>
                      <h3 className="text-center bg-primary border-2 p-2 text-primary-foreground inline-block ml-12 font-medium">
                        {note.noteType || "Note Type Unavailable"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold tracking-wide bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded">
                        DRAFT
                      </span>
                      {publishNote && isNotePublishable(note) && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            publishNote(noteId);
                          }}
                          className="text-muted-foreground hover:text-green-600 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Publish note"
                        >
                          <Send className="h-5 w-5 mx-1" />
                        </motion.button>
                      )}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(noteId);
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Delete note"
                      >
                        <Trash2Icon className="h-5 w-5 mx-1" />
                      </motion.button>
                    </div>
                  </div>
                  <p className="mt-2 text-right text-muted-foreground">
                    {note.date
                      ? new Date(note.date).toLocaleString()
                      : "Date Unavailable"}
                  </p>
                  <p className="mt-2 text-center text-muted-foreground">
                    <i>{note.authorName || "Author Unavailable"}</i>
                  </p>
                  {getAttendingName(note) && (
                    <p className="text-center text-xs text-muted-foreground">
                      Attending: {getAttendingName(note)}
                    </p>
                  )}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-2 p-2 bg-background text-foreground rounded-sm overflow-hidden"
                      >
                        {isSubjectiveNote(note) && (
                          <>
                            <p>
                              <strong>Subjective:</strong>{" "}
                              {note.content.subjective}
                            </p>
                            <p>
                              <strong>Objective:</strong>{" "}
                              {note.content.objective}
                            </p>
                            <p>
                              <strong>Assessment:</strong>{" "}
                              {note.content.assessment}
                            </p>
                            {note.content.icd10Codes &&
                              note.content.icd10Codes.length > 0 && (
                                <div>
                                  <p>
                                    <strong>ICD10 Codes:</strong>
                                  </p>
                                  <ul className="list-disc list-inside ml-4">
                                    {note.content.icd10Codes.map(
                                      (code, index) => (
                                        <li key={index}>
                                          {code.code} ({code.description})
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}
                            <p>
                              <strong>Plan:</strong> {note.content.plan}
                            </p>
                          </>
                        )}

                        {isProcedureNote(note) && (
                          <>
                            <p>
                              <strong>Procedure Name:</strong>{" "}
                              {note.content.procedureName}
                            </p>
                            <p>
                              <strong>Diagnosis:</strong>{" "}
                              {note.content.diagnosis}
                            </p>
                            {note.content.cptCodes &&
                              note.content.cptCodes.length > 0 && (
                                <div>
                                  <p>
                                    <strong>CPT Codes:</strong>
                                  </p>
                                  <ul className="list-disc list-inside ml-4">
                                    {note.content.cptCodes.map(
                                      (code, index) => (
                                        <li key={index}>
                                          {code.code} ({code.description})
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}
                            <p>
                              <strong>Notes:</strong> {note.content.notes}
                            </p>
                            <p>
                              <strong>Plan:</strong> {note.content.plan}
                            </p>
                          </>
                        )}
                        {isBlankNote(note) && (
                          <>
                            <p>
                              <strong>Content:</strong> {note.content.noteField}
                            </p>
                          </>
                        )}
                        {isPatientCallNote(note) && (
                          <TranscriptBlock content={note.content} />
                        )}
                        {/* Edit history */}
                        <NoteEditHistory noteId={noteId} patientId={params.id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-2 border-border border-2 text-muted-foreground rounded-lg m-4 p-4 text-center bg-card"
          >
            <p>
              <strong>No draft notes found</strong> for this patient.
            </p>
          </motion.div>
        )}
      </ScrollArea>
    </div>
  );
}
