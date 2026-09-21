import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import {
  useClearTestDataViewModel,
  DATA_TYPES,
  DataTypeInfo,
} from '../../../../viewModels/admin/useClearTestDataViewModel';

export const ClearTestDataView: React.FC = () => {
  const colors = useThemeColors();
  const viewModel = useClearTestDataViewModel();

  const {
    selectedDataTypes,
    isClearing,
    clearProgress,
    clearResults,
    environment,
    isAllowedEnvironment,
    toggleDataType,
    selectAll,
    deselectAll,
    clearSelectedData,
    resetResults,
    canClear,
    totalSelected,
  } = viewModel;

  // Get warning color based on level
  const getWarningColor = (level: DataTypeInfo['warningLevel']) => {
    switch (level) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  // Handle clear with additional confirmation
  const handleClear = () => {
    if (!canClear) return;

    // Show warning about critical data
    const criticalTypes = Array.from(selectedDataTypes).filter(dt => {
      const info = DATA_TYPES.find(d => d.id === dt);
      return info?.warningLevel === 'critical';
    });

    if (criticalTypes.length > 0) {
      Alert.alert(
        '🚨 Critical Data Selected',
        'You have selected critical data types (Patients). This will permanently delete patient records!\n\nPlease confirm you understand this action.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I Understand',
            style: 'destructive',
            onPress: clearSelectedData,
          },
        ]
      );
    } else {
      clearSelectedData();
    }
  };

  // Render environment banner
  const renderEnvironmentBanner = () => {
    const bannerColor = isAllowedEnvironment
      ? environment === 'development'
        ? colors.success
        : colors.warning
      : colors.error;

    const bannerText = isAllowedEnvironment
      ? `${environment.toUpperCase()} Environment - Clear Test Data Available`
      : `${environment.toUpperCase()} Environment - Clear Test Data NOT ALLOWED`;

    return (
      <View style={[styles.environmentBanner, { backgroundColor: bannerColor }]}>
        <Shield size={20} color={colors.textInverse} />
        <Text style={[styles.environmentBannerText, { color: colors.textInverse }]}>{bannerText}</Text>
      </View>
    );
  };

  // Render data type checkbox
  const renderDataTypeCheckbox = (dataTypeInfo: DataTypeInfo) => {
    const isSelected = selectedDataTypes.has(dataTypeInfo.id);
    const warningColor = getWarningColor(dataTypeInfo.warningLevel);

    return (
      <TouchableOpacity
        key={dataTypeInfo.id}
        style={[
          styles.dataTypeCard,
          { backgroundColor: colors.surface },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => toggleDataType(dataTypeInfo.id)}
        disabled={!isAllowedEnvironment || isClearing}
      >
        {/* Checkbox */}
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <CheckSquare size={24} color={colors.primary} />
          ) : (
            <Square size={24} color={colors.textSecondary} />
          )}
        </View>

        {/* Info */}
        <View style={styles.dataTypeInfo}>
          <View style={styles.dataTypeHeader}>
            <Text style={[styles.dataTypeLabel, { color: colors.text }]}>
              {dataTypeInfo.label}
            </Text>
            <View
              style={[
                styles.warningBadge,
                { backgroundColor: warningColor + '20', borderColor: warningColor },
              ]}
            >
              <Text style={[styles.warningBadgeText, { color: warningColor }]}>
                {dataTypeInfo.warningLevel.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.dataTypeDescription, { color: colors.textSecondary }]}>
            {dataTypeInfo.description}
          </Text>
          {dataTypeInfo.estimatedRecords !== undefined && (
            <Text style={[styles.recordCount, { color: colors.textSecondary }]}>
              ~{dataTypeInfo.estimatedRecords} records
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render progress bar
  const renderProgressBar = () => {
    if (!isClearing && clearProgress === 0) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            {isClearing ? 'Clearing data...' : 'Complete'}
          </Text>
          <Text style={[styles.progressPercent, { color: colors.text }]}>
            {Math.round(clearProgress)}%
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              { backgroundColor: colors.primary, width: `${clearProgress}%` },
            ]}
          />
        </View>
      </View>
    );
  };

  // Render clear results
  const renderClearResults = () => {
    if (clearResults.length === 0) return null;

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsTitle, { color: colors.text }]}>Clear Results</Text>
          <TouchableOpacity onPress={resetResults} style={styles.clearResultsButton}>
            <Text style={[styles.clearResultsButtonText, { color: colors.primary }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {clearResults.map((result, index) => {
          const dataTypeInfo = DATA_TYPES.find(dt => dt.id === result.dataType);
          return (
            <View
              key={index}
              style={[
                styles.resultCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.resultIcon}>
                {result.success ? (
                  <CheckCircle size={20} color={colors.success} />
                ) : (
                  <XCircle size={20} color={colors.error} />
                )}
              </View>
              <View style={styles.resultInfo}>
                <Text style={[styles.resultLabel, { color: colors.text }]}>
                  {dataTypeInfo?.label || result.dataType}
                </Text>
                <Text style={[styles.resultDetails, { color: colors.textSecondary }]}>
                  {result.success
                    ? `${result.recordsCleared} records deleted`
                    : result.error || 'Failed to clear'}
                </Text>
              </View>
              <View style={styles.resultDuration}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.resultDurationText, { color: colors.textSecondary }]}>
                  {(result.duration / 1000).toFixed(1)}s
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Environment Banner */}
      {renderEnvironmentBanner()}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {/* Warning Section */}
        <View style={[styles.warningSection, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
          <AlertTriangle size={24} color={colors.warning} />
          <View style={styles.warningContent}>
            <Text style={[styles.warningTitle, { color: colors.warningDark }]}>⚠️ Danger Zone</Text>
            <Text style={[styles.warningText, { color: colors.warningDark }]}>
              This feature permanently deletes test data. Only use in development or staging environments.
              All deletions are irreversible.
            </Text>
          </View>
        </View>

        {/* Not Allowed Message */}
        {!isAllowedEnvironment && (
          <View style={[styles.notAllowedSection, { backgroundColor: colors.error + '15' }]}>
            <Shield size={24} color={colors.error} />
            <View style={styles.notAllowedContent}>
              <Text style={[styles.notAllowedTitle, { color: colors.errorDark }]}>Not Available</Text>
              <Text style={[styles.notAllowedText, { color: colors.errorDark }]}>
                This feature is disabled in production environments to protect live data.
              </Text>
            </View>
          </View>
        )}

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Clear Results */}
        {renderClearResults()}

        {/* Selection Controls */}
        {isAllowedEnvironment && (
          <View style={styles.selectionControls}>
            <TouchableOpacity
              style={[styles.selectionButton, { backgroundColor: colors.surface }]}
              onPress={selectAll}
              disabled={isClearing}
            >
              <Text style={[styles.selectionButtonText, { color: colors.text }]}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectionButton, { backgroundColor: colors.surface }]}
              onPress={deselectAll}
              disabled={isClearing}
            >
              <Text style={[styles.selectionButtonText, { color: colors.text }]}>Deselect All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Data Type Checkboxes */}
        <View style={styles.dataTypesContainer}>
          {DATA_TYPES.map(renderDataTypeCheckbox)}
        </View>

        {/* Selected Count */}
        {totalSelected > 0 && (
          <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
            {totalSelected} data type{totalSelected !== 1 ? 's' : ''} selected
          </Text>
        )}
      </ScrollView>

      {/* Clear Button */}
      {isAllowedEnvironment && (
        <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.clearButton,
              { backgroundColor: colors.error },
              (!canClear || isClearing) && styles.disabledButton,
            ]}
            onPress={handleClear}
            disabled={!canClear || isClearing}
          >
            <Trash2 size={20} color={colors.textInverse} />
            <Text style={[styles.clearButtonText, { color: colors.textInverse }]}>
              {isClearing ? 'Clearing...' : 'Clear Selected Data'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  environmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  environmentBannerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    gap: 16,
  },
  warningSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  warningContent: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  notAllowedSection: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  notAllowedContent: {
    flex: 1,
    gap: 4,
  },
  notAllowedTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  notAllowedText: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  resultsContainer: {
    gap: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  clearResultsButton: {
    padding: 4,
  },
  clearResultsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultDetails: {
    fontSize: 12,
  },
  resultDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultDurationText: {
    fontSize: 12,
  },
  selectionControls: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dataTypesContainer: {
    gap: 12,
  },
  dataTypeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  checkboxContainer: {
    paddingTop: 2,
  },
  dataTypeInfo: {
    flex: 1,
    gap: 6,
  },
  dataTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  warningBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dataTypeDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  recordCount: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  selectedCount: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
