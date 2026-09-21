import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import CreatePatientScreen from '../screens/CreatePatientScreen';

export type HomeStackParamList = {
  HomeMain: undefined;
  CreatePatient: undefined;
};

const Stack = createStackNavigator<HomeStackParamList>();

interface HomeStackNavigatorProps {
  onLogout: () => void;
}

export function HomeStackNavigator({ onLogout }: HomeStackNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain">
        {() => <HomeScreen onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen
        name="CreatePatient"
        component={CreatePatientScreen}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
}
