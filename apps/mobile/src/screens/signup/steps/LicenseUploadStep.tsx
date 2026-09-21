import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { FileText, Upload, Check, Camera, Trash2 } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import { useSignupContext } from '../SignupContext';
import { palette } from '../../../utils/colors';

export const LicenseUploadStep: React.FC = () => {
  const { formData, updateFormData } = useSignupContext();

  const handlePickDocument = async (specialty: string) => {
    try {
      const [result] = await pick({
        type: [types.pdf, types.images],
      });

      if (result) {
        addLicense(specialty, {
          uri: result.uri,
          name: result.name || 'document',
          type: result.type || 'application/pdf',
        });
      }
    } catch (err) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        console.error('Document picker error:', err);
        Alert.alert('Error', 'Failed to select document');
      }
    }
  };

  const handlePickImage = async (specialty: string) => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.assets && result.assets[0]) {
      const asset = result.assets[0];
      addLicense(specialty, {
        uri: asset.uri || '',
        name: asset.fileName || 'license_image.jpg',
        type: asset.type || 'image/jpeg',
      });
    }
  };

  const addLicense = (
    specialty: string,
    file: { uri: string; name: string; type: string },
  ) => {
    const existing = formData.medicalLicenses.filter(
      (l) => l.specialty !== specialty,
    );
    updateFormData({
      medicalLicenses: [...existing, { specialty, ...file }],
    });
  };

  const removeLicense = (specialty: string) => {
    updateFormData({
      medicalLicenses: formData.medicalLicenses.filter(
        (l) => l.specialty !== specialty,
      ),
    });
  };

  const getLicenseForSpecialty = (specialty: string) =>
    formData.medicalLicenses.find((l) => l.specialty === specialty);

  const allUploaded = formData.doctorSpecialty.every((s) =>
    formData.medicalLicenses.some((l) => l.specialty === s),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medical Licenses</Text>
      <Text style={styles.subtitle}>
        Upload your medical license
        {formData.doctorSpecialty.length > 1 ? 's' : ''} for{' '}
        {formData.doctorSpecialty.length > 1
          ? 'each of your specialties'
          : 'your specialty'}
      </Text>

      {formData.doctorSpecialty.length > 1 && (
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>
            {
              formData.doctorSpecialty.filter((s) =>
                formData.medicalLicenses.some((l) => l.specialty === s),
              ).length
            }{' '}
            of {formData.doctorSpecialty.length} uploaded
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    (formData.doctorSpecialty.filter((s) =>
                      formData.medicalLicenses.some((l) => l.specialty === s),
                    ).length /
                      formData.doctorSpecialty.length) *
                    100
                  }%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {formData.doctorSpecialty.map((specialty) => {
        const license = getLicenseForSpecialty(specialty);

        return (
          <View key={specialty} style={styles.specialtyCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.specialtyName}>{specialty}</Text>
              {license && <Check size={18} color={palette.teal[400]} />}
            </View>

            {license ? (
              <View style={styles.uploadedRow}>
                <FileText size={20} color={palette.teal[400]} />
                <View style={styles.uploadedInfo}>
                  <Text style={styles.uploadedName} numberOfLines={1}>
                    {license.name}
                  </Text>
                  <Text style={styles.uploadedType}>
                    {license.type.includes('pdf') ? 'PDF Document' : 'Image'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeLicense(specialty)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={18} color={palette.red[400]} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.pickButton}
                  onPress={() => handlePickImage(specialty)}
                  activeOpacity={0.7}
                >
                  <Camera size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.pickButtonText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickButton}
                  onPress={() => handlePickDocument(specialty)}
                  activeOpacity={0.7}
                >
                  <Upload size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.pickButtonText}>Document</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {allUploaded && (
        <View style={styles.completeBanner}>
          <Check size={20} color={palette.teal[400]} />
          <Text style={styles.completeText}>
            All licenses uploaded. You can proceed.
          </Text>
        </View>
      )}

      <Text style={styles.note}>
        Accepted formats: PDF, PNG, JPG. Files will be uploaded when you submit.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBar: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 12,
    color: palette.teal[400],
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.teal[500],
  },
  specialtyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  specialtyName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  uploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    backgroundColor: 'rgba(53,157,152,0.08)',
  },
  uploadedInfo: {
    flex: 1,
  },
  uploadedName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  uploadedType: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  pickButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  pickButtonText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(53,157,152,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(53,157,152,0.2)',
    marginBottom: 12,
  },
  completeText: {
    fontSize: 13,
    color: palette.teal[400],
    flex: 1,
  },
  note: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 4,
  },
});
