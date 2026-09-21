import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from 'react-native';
import {
  Upload,
  Download,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react-native';
import { pick } from '@react-native-documents/picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { Button } from '../ui/Button';
import { SingleSelectField, SelectOption } from '../form/SelectField';
import { useMissions } from '../../hooks/useMissions';
import { PatientApiService } from '../../services/api/PatientApiService';
import {
  parseCSV,
  TEMPLATE_DATA,
  ParsedPatientRow,
  ValidationIssue,
  UploadResult,
} from '../../utils/csvParser';
import { BulkPatientCard } from './BulkPatientCard';
import { UploadResultsSummary } from './UploadResultsSummary';

interface BulkPatientUploadProps {
  onSuccess: () => void;
}

export function BulkPatientUpload({ onSuccess }: BulkPatientUploadProps) {
  const colors = useThemeColors();
  const { missions } = useMissions();

  const [fileName, setFileName] = useState<string | null>(null);
  const [patients, setPatients] = useState<ParsedPatientRow[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    [],
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [globalMissionId, setGlobalMissionId] = useState('');
  const [globalHospital, setGlobalHospital] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<UploadResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const errorIssues = validationIssues.filter((i) => i.type === 'error');
  const correctedIssues = validationIssues.filter((i) => i.type === 'corrected');

  const getCellIssue = useCallback(
    (rowId: number, field: string): ValidationIssue | undefined => {
      return validationIssues.find((i) => i.row === rowId && i.field === field);
    },
    [validationIssues],
  );

  const handlePickCSV = async () => {
    try {
      const [result] = await pick({
        type: [
          'text/csv',
          'text/comma-separated-values',
          ...(Platform.OS === 'ios' ? ['public.comma-separated-values-text'] : []),
        ],
        allowMultiSelection: false,
      });

      if (!result) return;

      setFileName(result.name || 'Uploaded CSV');
      setParseError(null);
      setPatients([]);
      setValidationIssues([]);
      setResults([]);
      setShowResults(false);

      const filePath = decodeURIComponent(
        result.uri.replace('file://', ''),
      );
      const content = await ReactNativeBlobUtil.fs.readFile(
        filePath,
        'utf8',
      );
      const { rows, issues } = parseCSV(content);

      // Auto-assign active intake mission
      const activeIntake = missions.find((m) => m.isActiveIntake);
      if (activeIntake) {
        const defaultHosp = activeIntake.defaultIntakeHospital || '';
        setGlobalMissionId(activeIntake.id);
        setGlobalHospital(defaultHosp);
        rows.forEach((r) => {
          r.missionId = activeIntake.id;
          r.hospital = defaultHosp;
        });
      }

      setPatients(rows);
      setValidationIssues(issues);
    } catch (err: any) {
      if (err?.message?.includes('cancel') || err?.code === 'DOCUMENT_PICKER_CANCELED') {
        return;
      }
      setParseError(
        err instanceof Error ? err.message : 'Failed to read CSV file',
      );
    }
  };

  const handleClearFile = () => {
    setFileName(null);
    setPatients([]);
    setParseError(null);
    setValidationIssues([]);
    setResults([]);
    setShowResults(false);
    setEditingRowId(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const tempPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/patient_upload_template.csv`;
      await ReactNativeBlobUtil.fs.writeFile(tempPath, TEMPLATE_DATA, 'utf8');
      await Share.share({
        url: Platform.OS === 'ios' ? tempPath : `file://${tempPath}`,
        title: 'Patient Upload Template',
      });
    } catch {
      Alert.alert('Error', 'Failed to share template file.');
    }
  };

  const updatePatient = (rowId: number, field: string, value: string) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== rowId) return p;
        if (field === 'phone.countryCode') {
          return { ...p, phone: { ...p.phone, countryCode: value } };
        }
        if (field === 'phone.phoneNumber') {
          return { ...p, phone: { ...p.phone, phoneNumber: value } };
        }
        if (field === 'phoneCountryCode') {
          return { ...p, phone: { ...p.phone, countryCode: value } };
        }
        return { ...p, [field]: value };
      }),
    );

    // Clear validation issue for the edited field
    setValidationIssues((prev) =>
      prev.filter((i) => !(i.row === rowId && i.field === field)),
    );
  };

  const handleApplyGlobalMission = () => {
    if (!globalMissionId) return;
    const mission = missions.find((m) => m.id === globalMissionId);
    const hosp = globalHospital || mission?.defaultIntakeHospital || '';

    setPatients((prev) =>
      prev.map((p) => ({
        ...p,
        missionId: globalMissionId,
        hospital: hosp,
      })),
    );
  };

  const handleUploadAll = async () => {
    if (errorIssues.length > 0) {
      Alert.alert(
        'Validation Errors',
        'Please fix all errors before uploading.',
      );
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: patients.length });

    const uploadResults: UploadResult[] = [];
    const api = PatientApiService.getInstance();

    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      setUploadProgress({ current: i + 1, total: patients.length });

      try {
        const payload: Record<string, any> = {
          firstName: p.firstName,
          lastName: p.lastName,
          dob: p.dob || undefined,
          gender: p.gender || undefined,
          language: p.language,
          chiefComplaint: p.chiefComplaint || undefined,
          currentMeds: p.currentMeds || undefined,
          allergies: p.allergies || undefined,
          city: p.city || undefined,
          country: p.country || undefined,
          phone: {
            countryCode: p.phone.countryCode,
            phoneNumber: p.phone.phoneNumber,
          },
          specialty: p.specialty,
          status: p.status,
          missionId: p.missionId || undefined,
          hospital: p.hospital || undefined,
        };

        await api.createPatient(payload as any);
        uploadResults.push({
          row: p.id,
          name: `${p.firstName} ${p.lastName}`,
          success: true,
        });
      } catch (err) {
        uploadResults.push({
          row: p.id,
          name: `${p.firstName} ${p.lastName}`,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    setResults(uploadResults);
    setShowResults(true);
    setUploading(false);
  };

  // Mission & hospital select options
  const globalMission = missions.find((m) => m.id === globalMissionId);
  const globalHospitalOptions: SelectOption[] = (
    globalMission?.hospitals || []
  ).map((h) => {
    const name = typeof h === 'string' ? h : h.name;
    return { label: name, value: name };
  });
  const missionSelectOptions: SelectOption[] = missions
    .sort((a, b) => {
      const order: Record<string, number> = {
        active: 0,
        planned: 1,
        completed: 2,
      };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    })
    .map((m) => ({
      label: `${m.name} (${m.country})${m.isActiveIntake ? ' *' : ''}`,
      value: m.id,
    }));

  if (showResults) {
    return (
      <View style={styles.content}>
        <UploadResultsSummary results={results} onDone={onSuccess} />
      </View>
    );
  }

  return (
    <View style={styles.content}>
      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={handleDownloadTemplate}
          style={[styles.actionButton, { borderColor: colors.border }]}
        >
          <Download size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>
            Download Template
          </Text>
        </TouchableOpacity>
      </View>

      {/* File upload area */}
      {!fileName ? (
        <TouchableOpacity
          onPress={handlePickCSV}
          style={[styles.uploadArea, { borderColor: colors.border }]}
        >
          <Upload size={32} color={colors.textSecondary} />
          <Text
            style={[styles.uploadText, { color: colors.textSecondary }]}
          >
            Tap to upload a CSV file
          </Text>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.fileBar,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.fileName, { color: colors.text }]}
            numberOfLines={1}
          >
            {fileName}
          </Text>
          <TouchableOpacity onPress={handleClearFile}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Parse error */}
      {parseError && (
        <View
          style={[
            styles.errorBar,
            {
              backgroundColor: colors.error + '15',
              borderColor: colors.error,
            },
          ]}
        >
          <AlertCircle size={18} color={colors.error} />
          <Text style={[styles.errorBarText, { color: colors.error }]}>
            {parseError}
          </Text>
        </View>
      )}

      {/* Validation summary */}
      {validationIssues.length > 0 && (
        <View style={styles.validationSummary}>
          {correctedIssues.length > 0 && (
            <View
              style={[
                styles.issueBadge,
                { backgroundColor: colors.info + '15', borderColor: colors.info },
              ]}
            >
              <Info size={16} color={colors.info} />
              <Text style={{ color: colors.info, fontSize: typography.fontSize.sm }}>
                {correctedIssues.length} auto-corrected
              </Text>
            </View>
          )}
          {errorIssues.length > 0 && (
            <View
              style={[
                styles.issueBadge,
                {
                  backgroundColor: colors.error + '15',
                  borderColor: colors.error,
                },
              ]}
            >
              <AlertTriangle size={16} color={colors.error} />
              <Text
                style={{
                  color: colors.error,
                  fontSize: typography.fontSize.sm,
                }}
              >
                {errorIssues.length} errors - fix before uploading
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Mission & Hospital batch assignment */}
      {patients.length > 0 && (
        <View
          style={[
            styles.batchAssign,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.batchTitle,
              { color: colors.text },
            ]}
          >
            Assign to All
          </Text>
          <SingleSelectField
            label="Mission"
            options={missionSelectOptions}
            value={globalMissionId}
            onChange={(v) => {
              setGlobalMissionId(v);
              const m = missions.find((ms) => ms.id === v);
              setGlobalHospital(m?.defaultIntakeHospital || '');
            }}
            placeholder="Select mission"
          />
          <SingleSelectField
            label="Hospital"
            options={globalHospitalOptions}
            value={globalHospital}
            onChange={setGlobalHospital}
            disabled={globalHospitalOptions.length === 0}
            placeholder={
              globalHospitalOptions.length === 0
                ? 'No hospitals'
                : 'Select hospital'
            }
          />
          <Button
            onPress={handleApplyGlobalMission}
            disabled={!globalMissionId}
            style={[
              styles.applyButton,
              {
                backgroundColor: globalMissionId
                  ? colors.primary
                  : colors.border,
              },
            ]}
          >
            <Text style={[styles.applyText, { color: colors.textInverse }]}>Apply to All</Text>
          </Button>
        </View>
      )}

      {/* Patient cards */}
      {patients.map((patient) => (
        <BulkPatientCard
          key={patient.id}
          patient={patient}
          isEditing={editingRowId === patient.id}
          onToggleEdit={() =>
            setEditingRowId(editingRowId === patient.id ? null : patient.id)
          }
          onUpdate={updatePatient}
          getCellIssue={getCellIssue}
          missions={missions}
        />
      ))}

      {/* Upload button */}
      {patients.length > 0 && (
        <View style={styles.uploadSection}>
          {uploading && (
            <Text
              style={[styles.progressText, { color: colors.textSecondary }]}
            >
              Uploading {uploadProgress.current} of {uploadProgress.total}...
            </Text>
          )}
          <Button
            onPress={handleUploadAll}
            disabled={uploading || errorIssues.length > 0}
            style={[
              styles.uploadButton,
              {
                backgroundColor:
                  uploading || errorIssues.length > 0
                    ? colors.border
                    : colors.primary,
              },
            ]}
          >
            <View style={styles.uploadButtonContent}>
              <CheckCircle2 size={18} color={colors.textInverse} />
              <Text style={[styles.uploadButtonText, { color: colors.textInverse }]}>
                {uploading
                  ? `Uploading (${uploadProgress.current}/${uploadProgress.total})...`
                  : `Upload ${patients.length} Patient${patients.length !== 1 ? 's' : ''}`}
              </Text>
            </View>
          </Button>
        </View>
      )}

      {/* Bottom padding */}
      <View style={{ height: 120 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  uploadText: {
    fontSize: typography.fontSize.sm,
  },
  fileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  fileName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  errorBarText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  validationSummary: {
    gap: spacing.xs,
  },
  issueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  batchAssign: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  batchTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  applyButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  applyText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  uploadSection: {
    gap: spacing.sm,
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
  },
  uploadButton: {
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  uploadButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadButtonText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});
