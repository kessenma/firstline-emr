import React, { useState, useEffect } from 'react';
import { ProcedureNote } from '../CombinedNotesViewModel';
import {TextFormField} from "../../../ui/TextFormField";
import {ScrollArea} from "../../../ui/scroll-area";
import { CPTSearch } from "../search/cpt-search";
import { ICD10Search } from "../search/icd10-search";
import { DatePickerFormField } from "../../../form/DatePickerFormField";

interface ProcedureNoteViewProps {
    note: ProcedureNote;
    onChange: (name: string, value: string) => void;
    onCPTChange?: (codes: Array<{ code: string; description: string }>) => void;
    onICD10Change?: (codes: Array<{ code: string; description: string }>) => void;
}

export const ProcedureNoteView: React.FC<ProcedureNoteViewProps> = ({ note, onChange, onCPTChange, onICD10Change }) => {
    const [currentDateTime, setCurrentDateTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 1000); // Update every second

        return () => clearInterval(interval);
    }, []);

    const formattedDate = currentDateTime.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    return (
        <div className="space-y-4">
            <ScrollArea className="h-full w-full">
            <TextFormField
                className='mt-4 pl-4'
                fieldName="dateTime"
                fieldLabel="Date & Time"
                value={`${formattedDate} ${formattedTime}`}
                readOnly={true}
            />
            <TextFormField
                className='mt-4'
                fieldName="attendingPhysician"
                fieldLabel="Attending Physician (from care team lead)"
                value={note.attendingPhysician}
                readOnly={true}
            />
            <TextFormField
                className='mt-4'
                fieldName="procedureName"
                fieldLabel="Procedure Name"
                value={note.procedureName}
                onChange={(e) => onChange('procedureName', e.target.value)}
                multiline={true}
                rows={2}
            />
            <TextFormField
                className='mt-4'
                fieldName="diagnosis"
                fieldLabel="Diagnosis"
                value={note.diagnosis} // Changed from Diagnosis
                onChange={(e) => onChange('diagnosis', e.target.value)}
                multiline={true}
                rows={2}
            />
            {onCPTChange && (
                <div className='mt-4'>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                        CPT Codes
                    </label>
                    <CPTSearch
                        value={note.cptCodes}
                        onChange={onCPTChange}
                        placeholder="Search and select CPT codes..."
                    />
                </div>
            )}
            {onICD10Change && (
                <div className='mt-4'>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                        ICD10 Codes
                    </label>
                    <ICD10Search
                        value={note.icd10Codes}
                        onChange={onICD10Change}
                        placeholder="Search ICD10 codes..."
                    />
                </div>
            )}
            <TextFormField
                className='mt-4'
                fieldName="notes"
                fieldLabel="Notes"
                value={note.notes} // Changed from Notes
                onChange={(e) => onChange('notes', e.target.value)}
                multiline={true}
                rows={2}
            />
            <TextFormField
                className='mt-4'
                fieldName="plan"
                fieldLabel="Plan"
                value={note.plan} // Changed from Plan
                onChange={(e) => onChange('plan', e.target.value)}
                multiline={true}
                rows={2}
            />
            </ScrollArea>
        </div>
    );
};
