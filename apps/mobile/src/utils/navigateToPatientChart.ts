// apps/mobile/src/utils/navigateToPatientChart.ts
//
// Navigates to a patient chart from outside the navigator tree.
//
// Reuses the module-level ref PushNotificationService already sets, so a
// background service (or a bottom sheet rendered through a Portal) can navigate
// without needing React Navigation context.

import { navigateFromService } from '../services/PushNotificationService';

export function goToPatientChart(patientId: string): void {
  navigateFromService('Dashboard', {
    screen: 'PatientChart',
    params: { patientId },
  });
}
