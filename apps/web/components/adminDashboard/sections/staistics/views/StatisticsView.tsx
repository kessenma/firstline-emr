// apps/web/components/adminDashboard/sections/statistics/views/StatisticsView.tsx
import React from 'react';
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from '@/components/ui/accordion';
import { SpecialtyDataProvider } from '@/components/adminDashboard/context/SpecialtyDataContext';
import SpecialtySpreadComparisonView from '.././views/SpecialtySpreadComparisonView';
import PatientSpecialtySpreadView from '../views/PatientSpecialtySpreadView';
import DoctorSpecialtySpreadView from '../views/DoctorSpecialtySpreadView';

const StatisticsView: React.FC = () => {
    return (
        <SpecialtyDataProvider>
        <Accordion type="single" collapsible>
            <AccordionItem value="comparison">
                <AccordionTrigger>
                    Doctor vs. Patient Comparison
                </AccordionTrigger>
                <AccordionContent>
                    <SpecialtySpreadComparisonView />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="patientSpread">
                <AccordionTrigger>
                    Patient Specialty Spread
                </AccordionTrigger>
                <AccordionContent>
                    <PatientSpecialtySpreadView />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="doctorSpread">
                <AccordionTrigger>
                    Doctor Specialty Spread
                </AccordionTrigger>
                <AccordionContent>
                    <DoctorSpecialtySpreadView />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        </SpecialtyDataProvider>
    );
};

export default StatisticsView;