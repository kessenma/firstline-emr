import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import { getApiUrl } from '../../config';
import { storageUtils } from '../../utils/storage';

// Data Type to Clear
export type DataType =
  | 'patients'
  | 'users'
  | 'medical_orders'
  | 'notifications'
  | 'images'
  | 'bot_messages'
  | 'analytics_logs'
  | 'all';

// Data Type Info
export interface DataTypeInfo {
  id: DataType;
  label: string;
  description: string;
  warningLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedRecords?: number;
}

// Clear Result
export interface ClearResult {
  dataType: DataType;
  success: boolean;
  recordsCleared: number;
  error?: string;
  duration: number; // in milliseconds
}

// Environment
export type Environment = 'development' | 'staging' | 'production' | 'unknown';

// ViewModel Interface
export interface UseClearTestDataViewModel {
  // State
  selectedDataTypes: Set<DataType>;
  isClearing: boolean;
  clearProgress: number; // 0-100
  clearResults: ClearResult[];
  environment: Environment;
  isAllowedEnvironment: boolean;
  
  // Actions
  toggleDataType: (dataType: DataType) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearSelectedData: () => Promise<void>;
  resetResults: () => void;
  
  // Computed
  canClear: boolean;
  totalSelected: number;
  estimatedTotalRecords: number;
}

// Available data types with info
const DATA_TYPES: DataTypeInfo[] = [
  {
    id: 'patients',
    label: 'Patients',
    description: 'All patient records and medical history',
    warningLevel: 'critical',
    estimatedRecords: 0,
  },
  {
    id: 'users',
    label: 'Test Users',
    description: 'Non-admin user accounts (keeps admins)',
    warningLevel: 'high',
    estimatedRecords: 0,
  },
  {
    id: 'medical_orders',
    label: 'Medical Orders',
    description: 'All medical order records',
    warningLevel: 'high',
    estimatedRecords: 0,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'All notification records',
    warningLevel: 'medium',
    estimatedRecords: 0,
  },
  {
    id: 'images',
    label: 'Images',
    description: 'All uploaded images and attachments',
    warningLevel: 'high',
    estimatedRecords: 0,
  },
  {
    id: 'bot_messages',
    label: 'Bot Messages',
    description: 'All Telegram bot conversation logs',
    warningLevel: 'medium',
    estimatedRecords: 0,
  },
  {
    id: 'analytics_logs',
    label: 'Analytics Logs',
    description: 'All analytics and tracking data',
    warningLevel: 'low',
    estimatedRecords: 0,
  },
];

// Detect environment from API URL or config
const detectEnvironment = (): Environment => {
  const apiUrl = getApiUrl();
  
  if (__DEV__) {
    return 'development';
  }
  
  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    return 'development';
  }
  
  if (apiUrl.includes('staging') || apiUrl.includes('dev')) {
    return 'staging';
  }
  
  if (apiUrl.includes('prod')) {
    return 'production';
  }
  
  return 'unknown';
};

export const useClearTestDataViewModel = (): UseClearTestDataViewModel => {
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<DataType>>(new Set());
  const [isClearing, setIsClearing] = useState(false);
  const [clearProgress, setClearProgress] = useState(0);
  const [clearResults, setClearResults] = useState<ClearResult[]>([]);
  
  // Detect environment
  const environment = useMemo(() => detectEnvironment(), []);
  const isAllowedEnvironment = environment === 'development' || environment === 'staging';
  
  // Toggle data type selection
  const toggleDataType = useCallback((dataType: DataType) => {
    setSelectedDataTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataType)) {
        newSet.delete(dataType);
      } else {
        newSet.add(dataType);
      }
      return newSet;
    });
  }, []);
  
  // Select all data types
  const selectAll = useCallback(() => {
    const allTypes = new Set(DATA_TYPES.map(dt => dt.id));
    setSelectedDataTypes(allTypes);
  }, []);
  
  // Deselect all data types
  const deselectAll = useCallback(() => {
    setSelectedDataTypes(new Set());
  }, []);
  
  // Reset results
  const resetResults = useCallback(() => {
    setClearResults([]);
    setClearProgress(0);
  }, []);
  
  // Clear a single data type
  const clearDataType = useCallback(async (dataType: DataType): Promise<ClearResult> => {
    const startTime = Date.now();
    
    try {
      const token = storageUtils.getToken();
      const apiUrl = getApiUrl();
      
      const response = await axios.post(
        `${apiUrl}/api/admin/POST/clear-test-data`,
        { dataType },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const duration = Date.now() - startTime;
      
      return {
        dataType,
        success: true,
        recordsCleared: response.data.recordsCleared || 0,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'Failed to clear data';
      
      return {
        dataType,
        success: false,
        recordsCleared: 0,
        error: errorMessage,
        duration,
      };
    }
  }, []);
  
  // Clear selected data with progress tracking
  const clearSelectedData = useCallback(async () => {
    if (!isAllowedEnvironment) {
      Alert.alert(
        'Not Allowed',
        `This feature is only available in development and staging environments. Current environment: ${environment}`
      );
      return;
    }
    
    if (selectedDataTypes.size === 0) {
      Alert.alert('No Selection', 'Please select at least one data type to clear');
      return;
    }
    
    // First confirmation
    const dataTypeLabels = Array.from(selectedDataTypes)
      .map(dt => DATA_TYPES.find(d => d.id === dt)?.label)
      .filter(Boolean)
      .join(', ');
    
    return new Promise<void>((resolve) => {
      Alert.alert(
        '⚠️ Warning: Clear Test Data',
        `You are about to permanently delete:\n\n${dataTypeLabels}\n\nThis action cannot be undone!`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(),
          },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              // Second confirmation
              Alert.alert(
                '🚨 Final Confirmation',
                `Environment: ${environment.toUpperCase()}\n\nAre you absolutely sure you want to delete all selected test data?`,
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => resolve(),
                  },
                  {
                    text: 'Yes, Delete All',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        setIsClearing(true);
                        setClearProgress(0);
                        setClearResults([]);
                        
                        const dataTypesToClear = Array.from(selectedDataTypes);
                        const results: ClearResult[] = [];
                        
                        for (let i = 0; i < dataTypesToClear.length; i++) {
                          const dataType = dataTypesToClear[i];
                          
                          // Update progress
                          const progressPercent = ((i + 1) / dataTypesToClear.length) * 100;
                          setClearProgress(progressPercent);
                          
                          // Clear data type
                          const result = await clearDataType(dataType);
                          results.push(result);
                          
                          // Update results in real-time
                          setClearResults([...results]);
                        }
                        
                        // Show summary
                        const successCount = results.filter(r => r.success).length;
                        const failCount = results.filter(r => !r.success).length;
                        const totalRecords = results.reduce((sum, r) => sum + r.recordsCleared, 0);
                        
                        Alert.alert(
                          'Clear Complete',
                          `Successfully cleared: ${successCount}\nFailed: ${failCount}\nTotal records deleted: ${totalRecords}`,
                          [{ text: 'OK' }]
                        );
                        
                        // Clear selection
                        setSelectedDataTypes(new Set());
                      } catch (err) {
                        Alert.alert('Error', 'An unexpected error occurred while clearing data');
                        console.error('Clear data error:', err);
                      } finally {
                        setIsClearing(false);
                        setClearProgress(100);
                        resolve();
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    });
  }, [
    isAllowedEnvironment,
    environment,
    selectedDataTypes,
    clearDataType,
  ]);
  
  // Computed values
  const canClear = !isClearing && selectedDataTypes.size > 0 && isAllowedEnvironment;
  const totalSelected = selectedDataTypes.size;
  const estimatedTotalRecords = useMemo(() => {
    return Array.from(selectedDataTypes).reduce((sum, dataType) => {
      const info = DATA_TYPES.find(dt => dt.id === dataType);
      return sum + (info?.estimatedRecords || 0);
    }, 0);
  }, [selectedDataTypes]);
  
  return {
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
    estimatedTotalRecords,
  };
};

// Export data types for use in view
export { DATA_TYPES };
