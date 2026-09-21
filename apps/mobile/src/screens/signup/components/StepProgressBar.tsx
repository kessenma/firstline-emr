import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSignupContext } from '../SignupContext';
import { palette } from '../../../utils/colors';

export const StepProgressBar: React.FC = () => {
  const { progress, formData } = useSignupContext();

  const primaryColor =
    formData.accountType === 'Doctor'
      ? palette.blue[500]
      : formData.accountType === 'Triage'
        ? palette.teal[500]
        : palette.teal[500];

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: progress >= 100 ? primaryColor : primaryColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});
