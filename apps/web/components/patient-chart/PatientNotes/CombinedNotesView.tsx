import React, { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useSession } from "next-auth/react";
import { CombinedNotesViewModel } from "./CombinedNotesViewModel";
import { AnimatePresence, motion } from "framer-motion";

import { ProcedureNoteView } from "./forms/ProcedureNoteView";
import { SubjectiveNoteView } from "./forms/SubjectiveNoteView";
import { PreviousNotesView } from "./previous/PreviousNotesView";
import { BlankNoteView } from "./forms/BlankNoteView";
import { RadioCard } from "../../ui/radio-card";
import { Button } from "../../ui/button";
import { ChevronDown, ChevronUp, NotebookPen } from "lucide-react";
import ReadOnlyField from "../../form/ReadOnlyField";
// Note shape and its type guards come from `@fajr/shared/patient`, the same
// module mobile uses. Web previously kept its own copies of both, so a change
// to a note type on one platform would not have reached the other.
import {
  isBlankNote,
  isPatientCallNote,
  isProcedureNote,
  isSubjectiveNote,
} from "@fajr/shared/patient";
import { TranscriptBlock } from "./TranscriptBlock";

interface NotesViewProps {
  patientId: string;
}

/** Check if the current note form has all required fields filled for publishing */
function isNoteFormComplete(
  templateType: string,
  procedureNote: { attendingPhysician: string; procedureName: string; diagnosis: string; notes: string; plan: string },
  subjectiveNote: { subjective: string; objective: string; assessment: string; plan: string },
  blankNote: { noteField: string },
): boolean {
  switch (templateType) {
    case "procedure":
      return !!(
        procedureNote.attendingPhysician?.trim() &&
        procedureNote.procedureName?.trim() &&
        procedureNote.diagnosis?.trim() &&
        procedureNote.notes?.trim() &&
        procedureNote.plan?.trim()
      );
    case "subjective":
      return !!(
        subjectiveNote.subjective?.trim() &&
        subjectiveNote.objective?.trim() &&
        subjectiveNote.assessment?.trim() &&
        subjectiveNote.plan?.trim()
      );
    case "blank":
      return !!blankNote.noteField?.trim();
    default:
      return false;
  }
}

export function CombinedNotesView({ patientId }: NotesViewProps) {
  const { data: session, status } = useSession();
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [isLatestExpanded, setIsLatestExpanded] = useState(false);

  const {
    populateNote,
    deleteNote,
    publishNote,
    templateType,
    setTemplateType,
    procedureNote,
    subjectiveNote,
    blankNote,
    createNote,
    setNoteField,
    setICD10Codes,
    setCPTCodes,
    setProcedureICD10Codes,
    setSubjectiveCPTCodes,
    isLoading,
    notes,
    dashboardNotes,
    attendingPhysicianName,
  } = CombinedNotesViewModel(patientId);

  const methods = useForm({
    defaultValues: {
      notes: notes || [],
    },
  });

  const handleCreateNote = async (draft: boolean) => {
    console.log("Create Note button clicked");
    console.log("Session status:", status);

    if (status === "authenticated") {
      try {
        await createNote(draft);
        console.log("Note created successfully");
      } catch (error) {
        console.error("Error creating note:", error);
      }
    } else {
      console.error("Session not authenticated");
    }
  };

  // Get latest note (most recent)
  const latestNote = notes && notes.length > 0 ? notes[0] : null;

  const toggleAllNotes = (event: React.MouseEvent) => {
    event.preventDefault();
    setShowAllNotes(!showAllNotes);
  };

  const toggleLatestExpanded = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsLatestExpanded(!isLatestExpanded);
  };

  if (status === "unauthenticated" || !session?.user) {
    return <div>Access Denied</div>;
  }

  const isDoctor = session?.user?.accountType === "Doctor";
  const isTriage = session?.user?.accountType === "Triage";

  return (
    <FormProvider {...methods}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col h-screen overflow-hidden bg-muted"
      >
        <div className="grow overflow-auto border-t-2 border-border rounded-lg">
          {dashboardNotes?.trim() && (
            <div className="mx-4 mt-4 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
              <div className="flex items-center gap-1.5 mb-1.5">
                <NotebookPen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 tracking-wide">
                  Triage Notes
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {dashboardNotes}
              </p>
            </div>
          )}

          {!isTriage && latestNote && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="p-4 border-b border-border rounded-lg"
            >
              <div className="text-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <motion.button
                      onClick={toggleLatestExpanded}
                      className="text-foreground border-border border-2 pt-0.5 pl-2 pr-2 rounded-full hover:text-card-foreground hover:bg-muted transition-colors"
                      aria-expanded={isLatestExpanded}
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isLatestExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </motion.button>
                    <div className="inline-block p-2 mb-2 text-card-foreground font-medium">
                      Latest:
                    </div>
                    <div className="text-center bg-primary border-2 p-2 text-primary-foreground font-medium">
                      {latestNote.noteType || "Note"}
                    </div>
                  </div>
                </div>
                <p className={"text-right text-muted-foreground"}>
                  {latestNote.date
                    ? new Date(latestNote.date).toLocaleString()
                    : "Date Unavailable"}
                </p>
                <p className="mt-2 text-center text-muted-foreground">
                  <i>{latestNote.authorName || "Author Unavailable"}</i>
                </p>

                <AnimatePresence>
                  {isLatestExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-2 p-2 bg-background text-foreground rounded-sm overflow-hidden"
                    >
                      {isSubjectiveNote(latestNote) && (
                        <>
                          <p>
                            <strong>Subjective:</strong>{" "}
                            {latestNote.content.subjective}
                          </p>
                          <p>
                            <strong>Objective:</strong>{" "}
                            {latestNote.content.objective}
                          </p>
                          <p>
                            <strong>Assessment:</strong>{" "}
                            {latestNote.content.assessment}
                          </p>
                          {latestNote.content.icd10Codes &&
                            latestNote.content.icd10Codes.length > 0 && (
                              <div>
                                <p>
                                  <strong>ICD10 Codes:</strong>
                                </p>
                                <ul className="list-disc list-inside ml-4">
                                  {latestNote.content.icd10Codes.map(
                                    (code, index) => (
                                      <li key={index}>
                                        {code.code} ({code.description})
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          {latestNote.content.cptCodes &&
                            latestNote.content.cptCodes.length > 0 && (
                              <div>
                                <p>
                                  <strong>CPT Codes:</strong>
                                </p>
                                <ul className="list-disc list-inside ml-4">
                                  {latestNote.content.cptCodes.map(
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
                            <strong>Plan:</strong> {latestNote.content.plan}
                          </p>
                        </>
                      )}

                      {isProcedureNote(latestNote) && (
                        <>
                          <p>
                            <strong>Procedure Name:</strong>{" "}
                            {latestNote.content.procedureName}
                          </p>
                          <p>
                            <strong>Diagnosis:</strong>{" "}
                            {latestNote.content.diagnosis}
                          </p>
                          {latestNote.content.cptCodes &&
                            latestNote.content.cptCodes.length > 0 && (
                              <div>
                                <p>
                                  <strong>CPT Codes:</strong>
                                </p>
                                <ul className="list-disc list-inside ml-4">
                                  {latestNote.content.cptCodes.map(
                                    (code, index) => (
                                      <li key={index}>
                                        {code.code} ({code.description})
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          {latestNote.content.icd10Codes &&
                            latestNote.content.icd10Codes.length > 0 && (
                              <div>
                                <p>
                                  <strong>ICD10 Codes:</strong>
                                </p>
                                <ul className="list-disc list-inside ml-4">
                                  {latestNote.content.icd10Codes.map(
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
                            <strong>Notes:</strong> {latestNote.content.notes}
                          </p>
                          <p>
                            <strong>Plan:</strong> {latestNote.content.plan}
                          </p>
                        </>
                      )}
                      {isBlankNote(latestNote) && (
                        <>
                          <p>
                            <strong>Content:</strong>{" "}
                            {latestNote.content.noteField}
                          </p>
                        </>
                      )}

                      {isPatientCallNote(latestNote) && (
                        <TranscriptBlock content={latestNote.content} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {!isTriage && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="sticky bottom-0 w-full p-4 bg-muted border-t border-border"
            >
              <Button
                variant="outline"
                className="w-full border-2 transition-colors pt-4 pb-4"
                onClick={toggleAllNotes}
                type="button"
              >
                {showAllNotes ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Hide previous notes
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    All previous notes
                  </>
                )}
              </Button>
            </motion.div>
          )}

          <AnimatePresence>
            {showAllNotes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <PreviousNotesView
                  patientId={patientId}
                  populateNote={populateNote}
                  deleteNote={deleteNote}
                  publishNote={publishNote}
                  setTemplateType={setTemplateType}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!showAllNotes && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="p-4"
            >
              {isDoctor && (
                <>
                  {/* Attending physician info */}
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <span className="font-medium">Attending:</span>
                    <span>{attendingPhysicianName || "Unknown"}</span>
                  </div>

                  <RadioCard.Root
                    defaultValue={templateType}
                    onValueChange={(value) =>
                      setTemplateType(
                        value as "procedure" | "subjective" | "blank",
                      )
                    }
                    className="flex w-full mb-4"
                  >
                    <RadioCard.Item
                      value="procedure"
                      className={`flex-1 ${templateType === "procedure" ? "border-2 border-primary bg-primary text-primary-foreground" : "border-2 border-border text-muted-foreground hover:bg-muted transition-colors"}`}
                    >
                      Procedure
                    </RadioCard.Item>
                    <RadioCard.Item
                      value="subjective"
                      className={`flex-1 ${templateType === "subjective" ? "border-2 border-primary bg-primary text-primary-foreground" : "border-2 border-border text-muted-foreground hover:bg-muted transition-colors"}`}
                    >
                      SOAP
                    </RadioCard.Item>
                    <RadioCard.Item
                      value="blank"
                      className={`flex-1 ${templateType === "blank" ? "border-2 border-primary bg-primary text-primary-foreground" : "border-2 border-border text-muted-foreground hover:bg-muted transition-colors"}`}
                    >
                      brief incident note
                    </RadioCard.Item>
                  </RadioCard.Root>

                  <AnimatePresence mode="wait">
                    {templateType === "procedure" && (
                      <motion.div
                        key="procedure"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {isLoading ? (
                          <ReadOnlyField
                            fieldName="procedure"
                            fieldLabel="Procedure Note"
                            value={JSON.stringify(procedureNote)}
                          />
                        ) : (
                          <ProcedureNoteView
                            note={procedureNote}
                            onChange={(name, value) =>
                              setNoteField("procedure", name, value)
                            }
                            onCPTChange={setCPTCodes}
                            onICD10Change={setProcedureICD10Codes}
                          />
                        )}
                      </motion.div>
                    )}
                    {templateType === "subjective" && (
                      <motion.div
                        key="subjective"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {isLoading ? (
                          <ReadOnlyField
                            fieldName="subjective"
                            fieldLabel="Subjective Note"
                            value={JSON.stringify(subjectiveNote)}
                          />
                        ) : (
                          <SubjectiveNoteView
                            note={subjectiveNote}
                            onChange={(name, value) =>
                              setNoteField("subjective", name, value)
                            }
                            onICD10Change={setICD10Codes}
                            onCPTChange={setSubjectiveCPTCodes}
                          />
                        )}
                      </motion.div>
                    )}
                    {templateType === "blank" && (
                      <motion.div
                        key="blank"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {isLoading ? (
                          <ReadOnlyField
                            fieldName="blank"
                            fieldLabel="Blank Note"
                            value={JSON.stringify(blankNote)}
                          />
                        ) : (
                          <BlankNoteView
                            note={blankNote}
                            onChange={(name, value) =>
                              setNoteField("blank", name, value)
                            }
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-center mt-4 space-x-4">
                    <Button
                      onClick={() => handleCreateNote(true)}
                      variant="orangeOutline"
                      className="min-w-[120px] whitespace-nowrap"
                      disabled={status !== "authenticated" || isLoading}
                    >
                      {isLoading ? "Saving..." : "Save Draft"}
                    </Button>
                    <Button
                      onClick={() => handleCreateNote(false)}
                      variant="orange"
                      className="min-w-[120px] whitespace-nowrap"
                      disabled={
                        status !== "authenticated" ||
                        isLoading ||
                        !isNoteFormComplete(templateType, procedureNote, subjectiveNote, blankNote)
                      }
                    >
                      {isLoading ? "Saving..." : "Create Note"}
                    </Button>
                  </div>
                </>
              )}
              {isTriage && (
                <PreviousNotesView
                  patientId={patientId}
                  populateNote={populateNote}
                  deleteNote={deleteNote}
                  publishNote={publishNote}
                  setTemplateType={setTemplateType}
                />
              )}
              {!isDoctor && !isTriage && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-muted-foreground mb-4"
                >
                  You do not have permission to view or create notes.
                </motion.p>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </FormProvider>
  );
}

export default CombinedNotesView;
