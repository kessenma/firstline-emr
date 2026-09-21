// apps/mobile/src/screens/PatientChartScreen.tsx
// Screen component for patient chart - wraps chart view with context provider
// Hides tab bar when viewing patient chart for immersive experience

import { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { PatientChartProvider } from '../components/patient-chart/PatientChartContext';
import { PatientChartView } from '../components/patient-chart/PatientChartView';
import { useTabBarVisibility } from '../contexts/TabBarVisibilityContext';

type RootStackParamList = {
  PatientChart: { patientId: string; initialTab?: string; returnTo?: string };
};

type PatientChartScreenRouteProp = RouteProp<
  RootStackParamList,
  'PatientChart'
>;

export default function PatientChartScreen() {
  const navigation = useNavigation();
  const navigationAny = navigation as any;
  const route = useRoute<PatientChartScreenRouteProp>();
  const { patientId, initialTab, returnTo } = route.params;
  const { hideTabBar, showTabBar } = useTabBarVisibility();

  // Hide tab bar when this screen is focused, show when leaving
  useFocusEffect(
    useCallback(() => {
      // Hide tab bar when screen comes into focus
      console.log('📱 [PatientChart] Screen focused - hiding tab bar');
      hideTabBar();

      // Show tab bar when screen loses focus (going back)
      return () => {
        console.log('📱 [PatientChart] Screen unfocused - showing tab bar');
        showTabBar();
      };
    }, [hideTabBar, showTabBar])
  );

  const handleBack = () => {
    if (returnTo) {
      // Navigate back to the originating tab (e.g. Notifications)
      (navigation as any).navigate(returnTo);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <PatientChartProvider patientId={patientId} initialTab={initialTab}>
        <PatientChartView
          onBack={handleBack}
          onGoToChatAfterSend={(threadId) =>
            navigationAny.navigate('Messages', { openThreadId: threadId })
          }
        />
      </PatientChartProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
