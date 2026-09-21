import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomSheet } from '../BottomSheet';
import { Tabs, TabsList, TabsTrigger } from '../ui/Tabs';
import { spacing } from '../../utils/theme';
import { SinglePatientForm } from './SinglePatientForm';
import { BulkPatientUpload } from './BulkPatientUpload';

interface CreatePatientSheetProps {
  visible: boolean;
  onClose: () => void;
  onPatientCreated?: () => void;
}

export function CreatePatientSheet({
  visible,
  onClose,
  onPatientCreated,
}: CreatePatientSheetProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  const handleSuccess = () => {
    onClose();
    onPatientCreated?.();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Create Patient"
      snapPoint={90}
      startExpanded
      showHandle
      showCloseButton
      rawContent
    >
      <View style={styles.wrapper}>
        <View style={styles.tabsContainer}>
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as 'single' | 'bulk')}
            variant="pills"
            style={styles.tabs}
          >
            <TabsList style={styles.tabsList}>
              <TabsTrigger value="single" label="Single Patient" />
              <TabsTrigger value="bulk" label="Bulk Upload" />
            </TabsList>
          </Tabs>
        </View>

        {mode === 'single' ? (
          <SinglePatientForm onSuccess={handleSuccess} />
        ) : (
          <BulkPatientUpload onSuccess={handleSuccess} />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  tabsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  tabs: {
    alignItems: 'center',
  },
  tabsList: {
    alignSelf: 'center',
  },
});
