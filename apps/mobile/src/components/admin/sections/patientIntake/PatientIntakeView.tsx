import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import {
  Bot,
  Save,
  RotateCcw,
  TestTube,
  Activity,
  Users,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '../../../../contexts/ThemeContext';
import { usePatientIntakeViewModel } from '../../../../viewModels/admin/usePatientIntakeViewModel';
import { LoadingState, ErrorState } from '../../shared';

export const PatientIntakeView: React.FC = () => {
  const { theme, themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const viewModel = usePatientIntakeViewModel();

  const {
    settings,
    hasUnsavedChanges,
    statistics,
    isLoadingSettings,
    isLoadingStatistics,
    isSaving,
    error,
    updateSetting,
    saveSettings,
    resetSettings,
    testBotConnection,
    refreshData,
  } = viewModel;

  // Handle save with confirmation
  const handleSave = () => {
    if (!hasUnsavedChanges) {
      Alert.alert('No Changes', 'There are no unsaved changes to save.');
      return;
    }

    Alert.alert(
      'Save Settings',
      'Are you sure you want to save these bot settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: saveSettings,
        },
      ],
    );
  };

  // Handle reset with confirmation
  const handleReset = () => {
    if (!hasUnsavedChanges) {
      Alert.alert('No Changes', 'There are no unsaved changes to reset.');
      return;
    }

    Alert.alert(
      'Reset Settings',
      'Are you sure you want to discard all unsaved changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: resetSettings,
        },
      ],
    );
  };

  // Loading state
  if (isLoadingSettings) {
    return <LoadingState message="Loading bot settings..." />;
  }

  // Error state
  if (error && !settings) {
    return (
      <ErrorState
        title="Failed to Load Settings"
        message={error}
        onRetry={() => viewModel.fetchBotSettings()}
      />
    );
  }

  if (!settings) {
    return (
      <ErrorState
        title="No Settings Available"
        message="Unable to load bot settings"
        onRetry={() => viewModel.fetchBotSettings()}
      />
    );
  }

  // Render statistics card
  const renderStatCard = (
    icon: React.ReactNode,
    label: string,
    value: string | number,
    color: string,
  ) => (
    <View
      style={[
        styles.statCard,
        { backgroundColor: isDark ? theme.colors.surface : theme.colors.surface },
      ]}
    >
      <View
        style={[styles.statIconContainer, { backgroundColor: color + '20' }]}
      >
        {icon}
      </View>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingSettings || isLoadingStatistics}
            onRefresh={refreshData}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Statistics Section */}
        {statistics && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Activity size={20} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Intake Statistics
              </Text>
            </View>

            <View style={styles.statsGrid}>
              {renderStatCard(
                <TrendingUp size={24} color={theme.colors.primary} />,
                'Total Intakes',
                statistics.totalIntakes.toLocaleString(),
                theme.colors.primary,
              )}
              {renderStatCard(
                <Clock size={24} color="#10B981" />,
                'Today',
                statistics.todayIntakes.toLocaleString(),
                '#10B981',
              )}
              {renderStatCard(
                <CheckCircle size={24} color="#6366F1" />,
                'Completed',
                statistics.completedIntakes.toLocaleString(),
                '#6366F1',
              )}
              {renderStatCard(
                <AlertCircle size={24} color="#F59E0B" />,
                'Pending',
                statistics.pendingIntakes.toLocaleString(),
                '#F59E0B',
              )}
              {renderStatCard(
                <Users size={24} color="#8B5CF6" />,
                'Active Users',
                statistics.activeUsers.toLocaleString(),
                '#8B5CF6',
              )}
              {renderStatCard(
                <Clock size={24} color="#EC4899" />,
                'Avg Response',
                `${statistics.averageResponseTime.toFixed(0)}m`,
                '#EC4899',
              )}
            </View>
          </View>
        )}

        {/* Bot Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bot size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Bot Configuration
            </Text>
          </View>

          {/* Bot Status */}
          <View
            style={[
              styles.settingRow,
              { backgroundColor: isDark ? theme.colors.surface : theme.colors.surface },
            ]}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Bot Active
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Enable or disable the Telegram bot
              </Text>
            </View>
            <Switch
              value={settings.isActive}
              onValueChange={value => updateSetting('isActive', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={Platform.OS === 'android' ? theme.colors.textInverse : undefined}
            />
          </View>

          {/* Bot Token */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Bot Token
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
                  color: theme.colors.text,
                },
              ]}
              value={settings.botToken}
              onChangeText={value => updateSetting('botToken', value)}
              placeholder="Enter bot token from @BotFather"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
            />
          </View>

          {/* Bot Username */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Bot Username
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
                  color: theme.colors.text,
                },
              ]}
              value={settings.botUsername}
              onChangeText={value => updateSetting('botUsername', value)}
              placeholder="@your_bot_username"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
            />
          </View>

          {/* Test Connection Button */}
          <TouchableOpacity
            style={[
              styles.testButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={testBotConnection}
          >
            <TestTube size={18} color={theme.colors.primary} />
            <Text style={[styles.testButtonText, { color: theme.colors.primary }]}>
              Test Connection
            </Text>
          </TouchableOpacity>
        </View>

        {/* Messages Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Bot Messages
            </Text>
          </View>

          {/* Welcome Message */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Welcome Message
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
                  color: theme.colors.text,
                },
              ]}
              value={settings.welcomeMessage}
              onChangeText={value => updateSetting('welcomeMessage', value)}
              placeholder="Enter welcome message for new users"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Help Message */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Help Message
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
                  color: theme.colors.text,
                },
              ]}
              value={settings.helpMessage}
              onChangeText={value => updateSetting('helpMessage', value)}
              placeholder="Enter help message"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Advanced Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Advanced Settings
            </Text>
          </View>

          {/* Auto Response */}
          <View
            style={[
              styles.settingRow,
              { backgroundColor: isDark ? theme.colors.surface : theme.colors.surface },
            ]}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Auto Response
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Automatically respond to messages
              </Text>
            </View>
            <Switch
              value={settings.autoResponseEnabled}
              onValueChange={value =>
                updateSetting('autoResponseEnabled', value)
              }
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={Platform.OS === 'android' ? theme.colors.textInverse : undefined}
            />
          </View>

          {/* Enable Logging */}
          <View
            style={[
              styles.settingRow,
              { backgroundColor: isDark ? theme.colors.surface : theme.colors.surface },
            ]}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Enable Logging
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Log bot activity for debugging
              </Text>
            </View>
            <Switch
              value={settings.enableLogging}
              onValueChange={value => updateSetting('enableLogging', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={Platform.OS === 'android' ? theme.colors.textInverse : undefined}
            />
          </View>

          {/* Max Intakes Per Day */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Max Intakes Per Day
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
                  color: theme.colors.text,
                },
              ]}
              value={settings.maxIntakesPerDay.toString()}
              onChangeText={value => {
                const num = parseInt(value, 10);
                if (!isNaN(num)) {
                  updateSetting('maxIntakesPerDay', num);
                }
              }}
              keyboardType="number-pad"
              placeholder="50"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          {/* Working Hours */}
          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Start Time
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
                    color: theme.colors.text,
                  },
                ]}
                value={settings.workingHoursStart}
                onChangeText={value =>
                  updateSetting('workingHoursStart', value)
                }
                placeholder="08:00"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                End Time
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
                    color: theme.colors.text,
                  },
                ]}
                value={settings.workingHoursEnd}
                onChangeText={value => updateSetting('workingHoursEnd', value)}
                placeholder="17:00"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Timezone */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Timezone
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
                  color: theme.colors.text,
                },
              ]}
              value={settings.timezone}
              onChangeText={value => updateSetting('timezone', value)}
              placeholder="UTC"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </View>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <View style={[styles.warningBanner, { backgroundColor: theme.colors.warning + '15' }]}>
            <AlertCircle size={20} color={theme.colors.warningDark} />
            <Text style={[styles.warningText, { color: theme.colors.warningDark }]}>
              You have unsaved changes
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.resetButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={handleReset}
          disabled={!hasUnsavedChanges || isSaving}
        >
          <RotateCcw size={18} color={theme.colors.text} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
            Reset
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.saveButton,
            { backgroundColor: theme.colors.primary },
            (!hasUnsavedChanges || isSaving) && styles.disabledButton,
          ]}
          onPress={handleSave}
          disabled={!hasUnsavedChanges || isSaving}
        >
          <Save size={18} color={theme.colors.textInverse} />
          <Text style={[styles.saveButtonText, { color: theme.colors.textInverse }]}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '31%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLeft: {
    flex: 1,
    gap: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 13,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  resetButton: {
    flex: 1,
    borderWidth: 1,
  },
  saveButton: {
    flex: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
