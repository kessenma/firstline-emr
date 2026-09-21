import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { FileText } from 'lucide-react-native';
import { getRoleColor } from '@fajr/shared/theme';
import { useSignupContext } from '../SignupContext';
import { palette } from '../../../utils/colors';
import { RoleIcon } from '../../../components/ui/RoleIcon';

type SignupRole = 'Doctor' | 'Triage';

const ROLE_OPTIONS: { type: SignupRole; description: string }[] = [
  { type: 'Doctor', description: 'Consulting physician or surgeon' },
  { type: 'Triage', description: 'Patient triage and coordination' },
];

export const UserTypeStep: React.FC = () => {
  const { formData, updateFormData } = useSignupContext();

  const handleSelect = (type: SignupRole) => {
    updateFormData({ accountType: type });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Role</Text>
      <Text style={styles.subtitle}>Select the type of account you'd like to create</Text>

      <View style={styles.cardsRow}>
        {ROLE_OPTIONS.map(({ type, description }) => {
          const isSelected = formData.accountType === type;
          const roleColor = getRoleColor(type);

          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.card,
                isSelected && {
                  borderColor: roleColor,
                  backgroundColor: roleColor + '26', // 15% opacity
                },
              ]}
              onPress={() => handleSelect(type)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isSelected
                      ? roleColor
                      : 'rgba(255,255,255,0.1)',
                  },
                ]}
              >
                <RoleIcon
                  accountType={type}
                  size={28}
                  color={isSelected ? '#fff' : 'rgba(255,255,255,0.6)'}
                />
              </View>
              <Text
                style={[styles.cardTitle, isSelected && { color: roleColor }]}
              >
                {type}
              </Text>
              <Text style={styles.cardDescription}>{description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {formData.accountType === 'Doctor' && (
        <Animated.View
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(200)}
          style={styles.licenseBanner}
        >
          <FileText size={18} color={palette.blue[400]} style={{ marginRight: 10 }} />
          <Text style={styles.licenseBannerText}>
            Please have your medical license ready — you'll need to upload it during signup.
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 32,
    textAlign: 'center',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  licenseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(79,142,201,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79,142,201,0.25)',
  },
  licenseBannerText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
});
