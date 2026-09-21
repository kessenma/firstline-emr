import React, { useState, useEffect } from 'react';
import { SubjectiveNote } from '../CombinedNotesViewModel';
import {TextFormField} from "../../../ui/TextFormField";
import {ScrollArea} from "../../../ui/scroll-area";
import { ICD10Search } from "../search/icd10-search";
import { CPTSearch } from "../search/cpt-search";

interface SubjectiveNoteViewProps {
    note: SubjectiveNote;
    onChange: (name: string, value: string) => void;
    onICD10Change?: (codes: Array<{ code: string; description: string }>) => void;
    onCPTChange?: (codes: Array<{ code: string; description: string }>) => void;
}

export const SubjectiveNoteView: React.FC<SubjectiveNoteViewProps> = ({ note, onChange, onICD10Change, onCPTChange }) => {
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
                fieldName="subjective"
                fieldLabel="Subjective"
                value={note.subjective}
                onChange={(e) => onChange('subjective', e.target.value)}
                multiline={true}
                rows={2}
            />
            <TextFormField
                className='mt-4'
                fieldName="objective"
                fieldLabel="Objective"
                value={note.objective}
                onChange={(e) => onChange('objective', e.target.value)}
                multiline={true}
                rows={2}
            />
            <TextFormField
                className='mt-4'
                fieldName="assessment"
                fieldLabel="Assessment"
                value={note.assessment}
                onChange={(e) => onChange('assessment', e.target.value)}
                multiline={true}
                rows={2}
            />
            <TextFormField
                className='mt-4'
                fieldName="plan"
                fieldLabel="Plan"
                value={note.plan}
                onChange={(e) => onChange('plan', e.target.value)}
                multiline={true}
                rows={2}
            />
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
            </ScrollArea>
        </div>
    );
};
