import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ChevronLeft, ArrowRight, Send } from 'lucide-react-native';
import { useSignupContext } from '../SignupContext';
import { palette } from '../../../utils/colors';

interface StepNavigationBarProps {
  onSubmit: () => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepNavigationBar: React.FC<StepNavigationBarProps> = ({
  onSubmit,
  onNext,
  onBack,
}) => {
  const { currentStep, isLastStep, isSubmitting, isStepValid } = useSignupContext();

  const canProceed = isStepValid(currentStep);

  const handlePress = () => {
    if (isLastStep) {
      onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      {currentStep > 0 ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          disabled={isSubmitting}
        >
          <ChevronLeft size={22} color="rgba(255,255,255,0.7)" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* Next / Submit Button */}
      <TouchableOpacity
        style={[
          styles.nextButton,
          !canProceed && styles.nextButtonDisabled,
          isLastStep && styles.submitButton,
        ]}
        onPress={handlePress}
        disabled={!canProceed || isSubmitting}
        activeOpacity={0.7}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : isLastStep ? (
          <>
            <Text style={styles.nextText}>Create Account</Text>
            <Send size={16} color="#fff" />
          </>
        ) : (
          <>
            <Text style={styles.nextText}>Next</Text>
            <ArrowRight size={16} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 16,
  },
  backText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 2,
  },
  placeholder: {
    width: 70,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.teal[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  submitButton: {
    backgroundColor: palette.teal[600],
  },
  nextText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
