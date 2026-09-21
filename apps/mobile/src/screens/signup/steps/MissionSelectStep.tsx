import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Globe, Check, RefreshCw, MapPin } from 'lucide-react-native';
import { useSignupContext } from '../SignupContext';
import { palette } from '../../../utils/colors';
import { getApiUrl } from '../../../config';

interface SignupMission {
  id: string;
  name: string;
  country: string;
  city: string | null;
  status: string;
  description: string | null;
}

/** Optional final signup step — pick missions to request to join.
 *  Selections become pending mission_requests reviewed by an admin.
 *  Runs pre-auth (no token yet), so it uses the public signup missions endpoint
 *  and must never block signup on network failure. */
export const MissionSelectStep: React.FC = () => {
  const { formData, updateFormData } = useSignupContext();
  const [missions, setMissions] = useState<SignupMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const selectedIds = formData.missionIds;

  const fetchMissions = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(getApiUrl('/auth/signup/missions'), {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data = await response.json();
      setMissions(data.missions || []);
    } catch (err) {
      console.error('[Signup] Failed to load missions:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const toggleMission = (missionId: string) => {
    const next = selectedIds.includes(missionId)
      ? selectedIds.filter((id) => id !== missionId)
      : [...selectedIds, missionId];
    updateFormData({ missionIds: next });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a Mission</Text>
      <Text style={styles.subtitle}>
        Optional — request to join a mission now, or skip and do it later from
        your profile. Requests are reviewed by an admin.
      </Text>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={palette.teal[400]} />
          <Text style={styles.centerText}>Loading missions...</Text>
        </View>
      ) : hasError ? (
        <View style={styles.centerBox}>
          <Text style={styles.centerText}>
            Couldn't load missions — you can skip this step and join a mission
            later from your profile.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchMissions}
            activeOpacity={0.7}
          >
            <RefreshCw size={16} color={palette.teal[400]} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : missions.length === 0 ? (
        <View style={styles.centerBox}>
          <Globe size={24} color="rgba(255,255,255,0.4)" />
          <Text style={styles.centerText}>
            No missions are open for enrollment right now — you can continue
            and join one later from your profile.
          </Text>
        </View>
      ) : (
        missions.map((mission) => {
          const isSelected = selectedIds.includes(mission.id);
          return (
            <TouchableOpacity
              key={mission.id}
              style={[styles.missionCard, isSelected && styles.missionCardSelected]}
              onPress={() => toggleMission(mission.id)}
              activeOpacity={0.7}
            >
              <View
                style={[styles.checkbox, isSelected && styles.checkboxSelected]}
              >
                {isSelected && <Check size={14} color="#fff" />}
              </View>
              <View style={styles.missionInfo}>
                <Text style={styles.missionName} numberOfLines={1}>
                  {mission.name}
                </Text>
                <View style={styles.locationRow}>
                  <MapPin size={12} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.missionLocation} numberOfLines={1}>
                    {mission.country}
                    {mission.city ? `, ${mission.city}` : ''}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  mission.status === 'active'
                    ? styles.statusActive
                    : styles.statusPlanned,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    mission.status === 'active'
                      ? styles.statusTextActive
                      : styles.statusTextPlanned,
                  ]}
                >
                  {mission.status}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {selectedIds.length > 0 && (
        <Text style={styles.note}>
          {selectedIds.length} mission request
          {selectedIds.length > 1 ? 's' : ''} will be sent for admin approval.
        </Text>
      )}
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
  centerBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  centerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.teal[400],
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    marginBottom: 10,
  },
  missionCardSelected: {
    borderColor: palette.teal[400],
    backgroundColor: 'rgba(53,157,152,0.10)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: palette.teal[500],
    backgroundColor: palette.teal[500],
  },
  missionInfo: {
    flex: 1,
  },
  missionName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  missionLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusActive: {
    backgroundColor: 'rgba(53,157,152,0.2)',
  },
  statusPlanned: {
    backgroundColor: 'rgba(79,142,201,0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusTextActive: {
    color: palette.teal[400],
  },
  statusTextPlanned: {
    color: '#7fb3e3',
  },
  note: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 8,
  },
});
