import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';

type Props = {
  selectedSections: string[];
  selectedFields: string[];
  toggleSectionSelect: (key: string) => void;
  toggleFieldSelect: (key: string) => void;
};

const patientDetailFieldKeys = ['name','dob','phone','city','country','language','hospital','priority','status','chiefComplaint','diagnosis','icd10','allergies','email'] as const;
const additionalFieldKeys = ['genderPreference','previouslyRegistered','baselineAmbu','occupation','pmhx','pshx','famhx','smokeCount','drinkCount','otherDrugs','prevMeds','currentMeds','coordinatorId','triagedBy','careTeam'] as const;

const labelForField = (key: string) => {
  const map: Record<string, string> = {
    name: 'Name',
    dob: 'DOB',
    phone: 'Phone',
    city: 'City',
    country: 'Country',
    language: 'Language',
    hospital: 'Hospital',
    priority: 'Priority',
    status: 'Status',
    chiefComplaint: 'Chief Complaint',
    diagnosis: 'Diagnosis',
    icd10: 'ICD10',
    allergies: 'Allergies',
    email: 'Email',
    genderPreference: 'Gender Preference',
    previouslyRegistered: 'Previously Registered',
    baselineAmbu: 'Baseline Ambulatory',
    occupation: 'Occupation',
    pmhx: 'PMHx',
    pshx: 'PSHx',
    famhx: 'Family Hx',
    smokeCount: 'Smoke Count',
    drinkCount: 'Drink Count',
    otherDrugs: 'Other Drugs',
    prevMeds: 'Previous Meds',
    currentMeds: 'Current Meds',
    coordinatorId: 'Coordinator',
    triagedBy: 'Triaged By',
    careTeam: 'Care Team',
  };
  return map[key] || key;
};

export const AdvancedExportOptions: React.FC<Props> = ({ selectedSections, selectedFields, toggleSectionSelect, toggleFieldSelect }) => {
  return (
    <div className="mt-2">
      <Accordion type="multiple">
        <AccordionItem value="sections">
          <AccordionTrigger>Sections to include</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2">
              {['patient','specialties','notes','medOrders','rxOrders','telegram','additional'].map((key) => (
                <label key={key} className="flex items-center space-x-2 text-sm">
                  <Checkbox checked={selectedSections.includes(key)} onCheckedChange={() => toggleSectionSelect(key)} />
                  <span className="capitalize">
                    {key === 'patient' ? 'Patient Details'
                      : key === 'specialties' ? 'Specialties'
                      : key === 'notes' ? 'Notes'
                      : key === 'medOrders' ? 'Medication Orders'
                      : key === 'rxOrders' ? 'Rx Orders'
                      : key === 'telegram' ? 'Telegram Messages'
                      : key === 'additional' ? 'Additional Details'
                      : key}
                  </span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="patient-fields">
          <AccordionTrigger>Patient detail fields</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2">
              {patientDetailFieldKeys.map((key) => (
                <label key={key} className="flex items-center space-x-2 text-sm">
                  <Checkbox checked={selectedFields.includes(key)} onCheckedChange={() => toggleFieldSelect(key)} />
                  <span>{labelForField(key)}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="additional-fields">
          <AccordionTrigger>Additional detail fields</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2">
              {additionalFieldKeys.map((key) => (
                <label key={key} className="flex items-center space-x-2 text-sm">
                  <Checkbox checked={selectedFields.includes(key)} onCheckedChange={() => toggleFieldSelect(key)} />
                  <span>{labelForField(key)}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default AdvancedExportOptions;