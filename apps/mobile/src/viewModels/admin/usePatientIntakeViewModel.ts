import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import { getApiUrl } from '../../config';
import { storageUtils } from '../../utils/storage';

// Bot Settings Interface
export interface BotSettings {
  botToken: string;
  botUsername: string;
  welcomeMessage: string;
  helpMessage: string;
  isActive: boolean;
  allowedUsers: string[]; // User IDs or usernames
  adminChatId: string;
  notificationsChatId: string;
  autoResponseEnabled: boolean;
  workingHoursStart: string; // HH:mm format
  workingHoursEnd: string; // HH:mm format
  timezone: string;
  maxIntakesPerDay: number;
  enableLogging: boolean;
}

// Intake Statistics Interface
export interface IntakeStatistics {
  totalIntakes: number;
  todayIntakes: number;
  weekIntakes: number;
  monthIntakes: number;
  averageResponseTime: number; // in minutes
  activeUsers: number;
  completedIntakes: number;
  pendingIntakes: number;
  lastIntakeTimestamp?: string;
  popularTimeSlots: Array<{ hour: number; count: number }>;
  intakesByDay: Array<{ date: string; count: number }>;
}

// ViewModel Interface
export interface UsePatientIntakeViewModel {
  // Settings State
  settings: BotSettings | null;
  originalSettings: BotSettings | null;
  hasUnsavedChanges: boolean;
  
  // Statistics State
  statistics: IntakeStatistics | null;
  
  // Loading States
  isLoadingSettings: boolean;
  isLoadingStatistics: boolean;
  isSaving: boolean;
  
  // Error State
  error: string | null;
  
  // Actions
  fetchBotSettings: () => Promise<void>;
  fetchIntakeStatistics: () => Promise<void>;
  updateSetting: <K extends keyof BotSettings>(key: K, value: BotSettings[K]) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  testBotConnection: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const usePatientIntakeViewModel = (): UsePatientIntakeViewModel => {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<BotSettings | null>(null);
  const [statistics, setStatistics] = useState<IntakeStatistics | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  // Fetch bot settings from API
  const fetchBotSettings = useCallback(async () => {
    try {
      setIsLoadingSettings(true);
      setError(null);

      const token = storageUtils.getToken();
      const apiUrl = getApiUrl();

      const response = await axios.get(`${apiUrl}/api/admin/GET/bot-settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const botSettings: BotSettings = response.data.settings || {
        botToken: '',
        botUsername: '',
        welcomeMessage: 'Welcome! Please provide your patient information.',
        helpMessage: 'Type /help for assistance.',
        isActive: false,
        allowedUsers: [],
        adminChatId: '',
        notificationsChatId: '',
        autoResponseEnabled: true,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        timezone: 'UTC',
        maxIntakesPerDay: 50,
        enableLogging: true,
      };

      setSettings(botSettings);
      setOriginalSettings(botSettings);
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'Failed to fetch bot settings';
      setError(errorMessage);
      console.error('Fetch bot settings error:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  // Fetch intake statistics from API
  const fetchIntakeStatistics = useCallback(async () => {
    try {
      setIsLoadingStatistics(true);
      setError(null);

      const token = storageUtils.getToken();
      const apiUrl = getApiUrl();

      const response = await axios.get(`${apiUrl}/api/admin/GET/bot-statistics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const stats: IntakeStatistics = response.data.statistics || {
        totalIntakes: 0,
        todayIntakes: 0,
        weekIntakes: 0,
        monthIntakes: 0,
        averageResponseTime: 0,
        activeUsers: 0,
        completedIntakes: 0,
        pendingIntakes: 0,
        popularTimeSlots: [],
        intakesByDay: [],
      };

      setStatistics(stats);
    } catch (err) {
      console.error('Fetch statistics error:', err);
      // Don't set error here as it's not critical
    } finally {
      setIsLoadingStatistics(false);
    }
  }, []);

  // Update a single setting
  const updateSetting = useCallback(
    <K extends keyof BotSettings>(key: K, value: BotSettings[K]) => {
      if (!settings) return;

      setSettings(prev => {
        if (!prev) return prev;
        return { ...prev, [key]: value };
      });
    },
    [settings]
  );

  // Save settings to API
  const saveSettings = useCallback(async () => {
    if (!settings) {
      Alert.alert('Error', 'No settings to save');
      return;
    }

    // Validation
    if (settings.isActive && !settings.botToken) {
      Alert.alert('Validation Error', 'Bot token is required when bot is active');
      return;
    }

    if (settings.maxIntakesPerDay < 1) {
      Alert.alert('Validation Error', 'Max intakes per day must be at least 1');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const token = storageUtils.getToken();
      const apiUrl = getApiUrl();

      await axios.post(
        `${apiUrl}/api/admin/POST/bot-settings`,
        { settings },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update original settings to match saved settings
      setOriginalSettings(settings);

      Alert.alert('Success', 'Bot settings saved successfully');
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'Failed to save bot settings';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      console.error('Save settings error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  // Reset settings to original values
  const resetSettings = useCallback(() => {
    if (originalSettings) {
      setSettings(originalSettings);
    }
  }, [originalSettings]);

  // Test bot connection
  const testBotConnection = useCallback(async () => {
    if (!settings?.botToken) {
      Alert.alert('Error', 'Bot token is required to test connection');
      return;
    }

    try {
      const token = storageUtils.getToken();
      const apiUrl = getApiUrl();

      const response = await axios.post(
        `${apiUrl}/api/admin/POST/test-bot-connection`,
        { botToken: settings.botToken },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        Alert.alert(
          'Connection Successful',
          `Bot @${response.data.botUsername} is responding correctly.`
        );
      } else {
        Alert.alert('Connection Failed', response.data.message || 'Unable to connect to bot');
      }
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'Failed to test bot connection';
      Alert.alert('Error', errorMessage);
      console.error('Test connection error:', err);
    }
  }, [settings?.botToken]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([fetchBotSettings(), fetchIntakeStatistics()]);
  }, [fetchBotSettings, fetchIntakeStatistics]);

  // Fetch data on mount
  useEffect(() => {
    fetchBotSettings();
    fetchIntakeStatistics();
  }, [fetchBotSettings, fetchIntakeStatistics]);

  return {
    settings,
    originalSettings,
    hasUnsavedChanges,
    statistics,
    isLoadingSettings,
    isLoadingStatistics,
    isSaving,
    error,
    fetchBotSettings,
    fetchIntakeStatistics,
    updateSetting,
    saveSettings,
    resetSettings,
    testBotConnection,
    refreshData,
  };
};
