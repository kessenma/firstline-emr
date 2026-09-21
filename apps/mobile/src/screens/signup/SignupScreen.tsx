import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { AnimatedGradientBackground } from '../../components/ui/AnimatedGradientBackground';
import { SignupProvider, useSignupContext } from './SignupContext';
import { StepProgressBar } from './components/StepProgressBar';
import { StepNavigationBar } from './components/StepNavigationBar';
import { TermsDrawer } from './components/TermsDrawer';
import { UserTypeStep } from './steps/UserTypeStep';
import { CredentialsStep } from './steps/CredentialsStep';
import { TwoFactorSetupStep } from './steps/TwoFactorSetupStep';
import { ProfileStep } from './steps/ProfileStep';
import { LicenseUploadStep } from './steps/LicenseUploadStep';
import { MissionSelectStep } from './steps/MissionSelectStep';
import { authService } from '../../services/AuthService';
import { usePasskey } from '../../hooks/usePasskey';
import { useOptionalToast } from '../../hooks/useToast';

interface SignupScreenProps {
  onSignupComplete: (user: any) => void;
  onBackToLogin: () => void;
}

const SignupScreenInner: React.FC<SignupScreenProps> = ({
  onSignupComplete,
  onBackToLogin,
}) => {
  const {
    currentStep,
    formData,
    isSubmitting,
    setSubmitting,
    setEmailExists,
    goNext,
    goBack,
  } = useSignupContext();

  const [termsOpen, setTermsOpen] = useState(false);
  const { register: registerPasskey, isSupported: passkeySupported } = usePasskey();
  const scrollRef = useRef<ScrollView>(null);
  const pendingUserRef = useRef<any>(null);

  // Exit animation (signup success only — nav transitions handled by App.tsx)
  const exitOpacity = useSharedValue(1);
  const exitTranslateY = useSharedValue(0);

  // ToastProvider may not be mounted yet during signup
  const toastFunction = useOptionalToast()?.toast;

  const finishSignup = useCallback(() => {
    if (pendingUserRef.current) {
      onSignupComplete(pendingUserRef.current);
      pendingUserRef.current = null;
    }
  }, [onSignupComplete]);

  const playExitAnimation = useCallback(
    (user: any) => {
      pendingUserRef.current = user;
      exitOpacity.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      });
      exitTranslateY.value = withTiming(
        -60,
        {
          duration: 400,
          easing: Easing.out(Easing.ease),
        },
        () => {
          runOnJS(finishSignup)();
        },
      );
    },
    [exitOpacity, exitTranslateY, finishSignup],
  );

  const exitAnimatedStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
    transform: [{ translateY: exitTranslateY.value }],
  }));

  // Handle "Next" with email check on step 1
  const handleNext = async () => {
    if (currentStep === 1) {
      // Check email availability before proceeding
      const result = await authService.checkEmailExists(formData.email);
      if (result.exists) {
        setEmailExists(true);
        if (toastFunction) {
          toastFunction({
            title: 'Account already exists. Please sign in instead.',
            variant: 'destructive',
          });
        }
        return;
      }
      setEmailExists(false);
    }
    goNext();
    // Scroll to top on step change
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBack = () => {
    goBack();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Submit handler
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setSubmitting(true);

    try {
      // 1. Create account
      console.log('[Signup] Creating account...');
      const signupResult = await authService.signup({
        email: formData.email,
        password: formData.password,
        accountType: formData.accountType!,
        totpCredentialData: formData.totpCredentialData || undefined,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob,
        doctorSpecialty: formData.doctorSpecialty,
        languages: formData.languages,
        countries: formData.countries,
        gender: formData.gender || undefined,
        missionIds: formData.missionIds,
      });

      if (!signupResult.success || !signupResult.userId) {
        Alert.alert('Signup Failed', signupResult.error || 'An error occurred');
        setSubmitting(false);
        return;
      }

      console.log('[Signup] Account created:', signupResult.userId);

      // 2. Upload medical licenses (Doctor only)
      if (
        formData.accountType === 'Doctor' &&
        formData.medicalLicenses.length > 0
      ) {
        console.log('[Signup] Uploading medical licenses...');
        for (const license of formData.medicalLicenses) {
          try {
            await authService.uploadLicense(
              { uri: license.uri, name: license.name, type: license.type },
              formData.firstName,
              formData.lastName,
              license.specialty,
              signupResult.userId,
            );
          } catch (uploadErr) {
            console.error('[Signup] License upload failed for', license.specialty, uploadErr);
            // Continue even if individual uploads fail
          }
        }
      }

      // 3. Register passkey (if enabled)
      if (formData.passkeyEnabled && passkeySupported) {
        try {
          console.log('[Signup] Registering passkey...');
          await registerPasskey(formData.email, signupResult.userId);
          console.log('[Signup] Passkey registered successfully');
        } catch (passkeyErr) {
          console.warn('[Signup] Passkey registration failed (non-blocking):', passkeyErr);
          // Continue - user can add passkey later from profile
        }
      }

      // 4. Auto-login to get tokens
      console.log('[Signup] Auto-logging in...');
      const loginResult = await authService.login({
        email: formData.email,
        password: formData.password,
      });

      if (loginResult.success && loginResult.user) {
        console.log('[Signup] Auto-login successful, transitioning...');
        playExitAnimation(loginResult.user);
      } else {
        // If auto-login fails, still tell user account was created
        Alert.alert(
          'Account Created',
          'Your account was created successfully! Please sign in.',
          [{ text: 'OK', onPress: onBackToLogin }],
        );
        setSubmitting(false);
      }
    } catch (error) {
      console.error('[Signup] Submit error:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'An error occurred during signup',
      );
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <UserTypeStep />;
      case 1:
        return <CredentialsStep onOpenTerms={() => setTermsOpen(true)} />;
      case 2:
        return <TwoFactorSetupStep />;
      case 3:
        return <ProfileStep />;
      case 4:
        return formData.accountType === 'Doctor'
          ? <LicenseUploadStep />
          : <MissionSelectStep />;
      case 5:
        return <MissionSelectStep />;
      default:
        return null;
    }
  };

  return (
    <Animated.View style={[styles.container, exitAnimatedStyle]}>
      <AnimatedGradientBackground />

      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backToLogin}
            onPress={onBackToLogin}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.backToLoginText}>Sign In</Text>
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <Image
              source={require('../../assets/fajr-triage-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={{ width: 70 }} />
        </View>

        <Text style={styles.screenTitle}>Create Account</Text>

        <StepProgressBar />

        {/* Step Content */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        {/* Navigation Bar */}
        <StepNavigationBar
          onSubmit={handleSubmit}
          onNext={handleNext}
          onBack={handleBack}
        />
      </KeyboardAvoidingView>

      {/* Terms Drawer */}
      <TermsDrawer isOpen={termsOpen} onClose={() => setTermsOpen(false)} />
    </Animated.View>
  );
};

export default function SignupScreen(props: SignupScreenProps) {
  return (
    <SignupProvider>
      <SignupScreenInner {...props} />
    </SignupProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
  },
  backToLoginText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 2,
  },
  logoRow: {
    alignItems: 'center',
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 4,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
});
