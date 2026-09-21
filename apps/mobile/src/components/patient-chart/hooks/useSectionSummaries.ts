// apps/mobile/src/components/patient-chart/hooks/useSectionSummaries.ts
// Derives summary data from PatientChartContext for the dashboard view.
// Pure computation — no additional queries needed.

import { useMemo } from 'react';
import { summarizeCallHistory } from '@fajr/shared/video-call';
import { usePatientChart } from '../PatientChartContext';

export interface SectionSummaries {
  info: {
    status: string;
    priority: string;
    hospital: string;
    chiefComplaint: string;
    missionName: string;
  };
  notes: {
    publishedCount: number;
    draftCount: number;
    latestDate: Date | string | null;
    latestType: string | null;
  };
  meds: {
    rxCount: number;
    medCount: number;
  };
  images: {
    count: number;
    thumbnailUris: string[];
  };
  messages: {
    hasChat: boolean;
  };
  video: {
    available: boolean;
    canSendLink: boolean;
    callCount: number;
    lastCallAt: string | null;
  };
}

export function useSectionSummaries(): SectionSummaries {
  const {
    patientInfo,
    notes,
    draftNotes,
    rxOrders,
    medOrders,
    photos,
    videoCalls,
  } = usePatientChart();

  const callSummary = useMemo(
    () => summarizeCallHistory(videoCalls),
    [videoCalls],
  );

  return useMemo((): SectionSummaries => {
    // Notes summary
    const latestNote = notes.length > 0 ? notes[0] : null;

    // Images: first 4 thumbnail URIs
    const thumbnailUris = photos
      .slice(0, 4)
      .map((p) => p.url)
      .filter(Boolean);

    return {
      info: {
        status: patientInfo?.status || '',
        priority: patientInfo?.priority || '',
        hospital: patientInfo?.hospital || '',
        chiefComplaint: patientInfo?.chiefComplaint || '',
        missionName: patientInfo?.missionName || '',
      },
      notes: {
        publishedCount: notes.length,
        draftCount: draftNotes.length,
        latestDate: latestNote?.date || latestNote?.createdAt || null,
        latestType: latestNote?.noteType || null,
      },
      meds: {
        rxCount: rxOrders.length,
        medCount: medOrders.length,
      },
      images: {
        count: photos.length,
        thumbnailUris,
      },
      messages: {
        hasChat: !!patientInfo?.telegramChatId,
      },
      video: {
        available: !!patientInfo?.id,
        canSendLink: !!patientInfo?.telegramChatId,
        callCount: callSummary.totalCalls,
        lastCallAt: callSummary.lastCallAt,
      },
    };
  }, [patientInfo, notes, draftNotes, rxOrders, medOrders, photos, callSummary]);
}
