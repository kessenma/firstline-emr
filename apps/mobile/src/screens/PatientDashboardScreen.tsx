// apps/mobile/src/screens/PatientDashboardScreen.tsx
// Main entry point for Patient Dashboard Screen - uses view/viewmodel architecture

import React from 'react';
import { PatientDashboardScreenView } from './patient-dashboard';

interface PatientDashboardScreenProps {
  // No props needed - user comes from AuthContext
}

export default function PatientDashboardScreen({}: PatientDashboardScreenProps) {
  return <PatientDashboardScreenView />;
}
