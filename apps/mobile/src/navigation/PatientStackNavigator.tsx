// apps/mobile/src/navigation/PatientStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useThemeColors } from '../contexts/ThemeContext';
import PatientDashboardScreen from '../screens/PatientDashboardScreen';
import PatientChartScreen from '../screens/PatientChartScreen';

export type PatientStackParamList = {
  PatientDashboard: undefined;
  PatientChart: { patientId: string };
};

const Stack = createStackNavigator<PatientStackParamList>();

interface PatientStackNavigatorProps {}

export function PatientStackNavigator({}: PatientStackNavigatorProps) {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
      }}
    >
      <Stack.Screen
        name="PatientDashboard"
        component={PatientDashboardScreen}
        options={{
          title: 'Patient Dashboard',
          headerShown: false, // Hide header for dashboard - it has its own header
        }}
      />

      <Stack.Screen
        name="PatientChart"
        component={PatientChartScreen}
        options={{
          headerShown: false,
        }}
      />

    </Stack.Navigator>
  );
}
