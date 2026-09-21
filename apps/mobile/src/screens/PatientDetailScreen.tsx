// apps/mobile/src/screens/PatientDetailScreen.tsx
// Main entry point for Patient Detail Screen - uses view/viewmodel architecture

import React from 'react';
import { PatientDetailScreenView } from './patient-detail';

interface PatientDetailScreenProps {
  patientId: string;
  onBack?: () => void;
}

export default function PatientDetailScreen({
  patientId,
  onBack,
}: PatientDetailScreenProps) {
  return <PatientDetailScreenView patientId={patientId} onBack={onBack} />;
}
