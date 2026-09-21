// apps/mobile/src/components/patient-chart/video-call/components/TranscriptionJobStatus.tsx
//
// Shows the state of transcription jobs for one patient.
//
// Reads from the app-level job context rather than the call session, because by
// the time this matters the call is over and its provider may well be gone —
// the clinician has hung up and is looking at the chart.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AlertCircle, RefreshCw, X } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useTranscriptionJobs } from '../../../../contexts/TranscriptionJobsContext';

interface TranscriptionJobStatusProps {
  patientId: string;
}

export const TranscriptionJobStatus: React.FC<TranscriptionJobStatusProps> = ({
  patientId,
}) => {
  const colors = useThemeColors();
  const { jobsForPatient, retry, dismiss } = useTranscriptionJobs();

  const jobs = jobsForPatient(patientId).filter(
    job => job.status === 'transcribing' || job.status === 'failed',
  );

  if (jobs.length === 0) return null;

  return (
    <View style={styles.list}>
      {jobs.map(job => (
        <View
          key={job.jobId}
          style={[
            styles.row,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          {job.status === 'transcribing' ? (
            <>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.text, { color: colors.text }]}>
                Writing call notes… {Math.round(job.progress * 100)}%
                {'\n'}
                {/* Says plainly what iOS will and won't do. Background compute
                    is not granted to apps, so an interrupted job waits for the
                    app to come back rather than finishing on its own. */}
                <Text style={{ color: colors.textSecondary }}>
                  Keep the app open to finish now, or reopen later to resume.
                </Text>
              </Text>
            </>
          ) : (
            <>
              <AlertCircle size={16} color={colors.error} />
              <View style={styles.failedBody}>
                <Text style={[styles.text, { color: colors.error }]}>
                  Could not write call notes. The recording is still on this
                  device.
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.action, { borderColor: colors.border }]}
                    onPress={() => retry(job.jobId)}
                    activeOpacity={0.7}
                  >
                    <RefreshCw size={13} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>
                      Try again
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.action, { borderColor: colors.border }]}
                    onPress={() => dismiss(job.jobId)}
                    activeOpacity={0.7}
                  >
                    <X size={13} color={colors.textSecondary} />
                    <Text
                      style={[styles.actionText, { color: colors.textSecondary }]}
                    >
                      Discard recording
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  text: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
  },
  failedBody: { flex: 1, gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.xs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default TranscriptionJobStatus;
