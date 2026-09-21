// apps/mobile/src/navigation/LoadingNavigator.tsx
// Loading screen navigator to show while app initializes

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/fajr-triage-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
      <Text style={styles.title}>Fajr EMR</Text>
      <Text style={styles.subtitle}>Loading your workspace...</Text>
    </View>
  );
};

export const LoadingNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Loading" component={LoadingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  spinner: {
    marginVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
