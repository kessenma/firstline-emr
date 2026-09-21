import React, { useState, useEffect } from 'react';
import { BlankNote } from '../CombinedNotesViewModel';
import {TextFormField} from "../../../ui/TextFormField";
import {ScrollArea} from "../../../ui/scroll-area";

interface BlankNoteViewProps {
    note: BlankNote;
    onChange: (name: string, value: string) => void;
}

export const BlankNoteView: React.FC<BlankNoteViewProps> = ({ note, onChange }) => {
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
                fieldName="noteField"
                fieldLabel="Note"
                value={note.noteField}
                onChange={(e) => onChange('noteField', e.target.value)}
                multiline={true}
                rows={4}
            />
            </ScrollArea>
        </div>
    );
};
