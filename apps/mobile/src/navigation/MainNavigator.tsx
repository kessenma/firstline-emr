// apps/mobile/src/navigation/MainNavigator.tsx
// Main tab navigation component


import React, { useRef, useEffect, useState } from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  MessageCircle,
  Bell,
  Grid3x3,
  User,
  Shield,
} from 'lucide-react-native';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { getRoleColor } from '@fajr/shared/theme';

import { NavigationBar } from '../components/NavigationBar';
import { ConnectionStatusOverlay } from '../components/ConnectionStatusOverlay';
import { useConnectionToasts, ConnectionToastsProvider } from '../hooks/useConnectionToasts';
import { useDeviceType } from '../hooks/useDeviceType';
import { HomeStackNavigator } from './HomeStackNavigator';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { AdminStackNavigator } from './AdminStackNavigator';
import { PatientStackNavigator } from './PatientStackNavigator';
import { setNavigationRef } from '../services/PushNotificationService';
import { useSafeUnreadCount } from '../hooks/useSafeUnreadCount';
import { useVoipRegistration } from '../hooks/useVoipRegistration';
import { IncomingCallHost } from '../components/calls/IncomingCallHost';



const Tab = createBottomTabNavigator();

export interface SessionUser {
  id: string;
  email: string;
  accountType: 'Doctor' | 'Triage';
  firstName: string;
  lastName: string;
  city: string;
  countries: string[];
  languages: string[];
  doctorSpecialty?: string[];
  image?: string;
  isAdmin: boolean;
  dob?: string | Date;
  gender?: 'Male' | 'Female';
  token?: string;
  userSettings?: string;
  userNotifications?: string;
  userMessages?: string;
  // Authorization status (for WaitingRoom logic)
  authorized?: boolean;
}

interface MainNavigatorProps {
  user: SessionUser;
  onLogout: () => void;
}

// Create wrapper components to avoid React warnings
const createHomeWrapper = (onLogout: () => void) => {
  return function HomeWrapper() {
    return <HomeStackNavigator onLogout={onLogout} />;
  };
};

const createMessagesWrapper = (onLogout: () => void) => {
  return function MessagesWrapper() {
    return <MessagesScreen onBack={onLogout} />;
  };
};

const createNotificationsWrapper = () => {
  return function NotificationsWrapper() {
    return <NotificationsScreen />;
  };
};

const createDashboardWrapper = () => {
  return function DashboardWrapper() {
    return <PatientStackNavigator />;
  };
};

const createProfileWrapper = (onLogout: () => void) => {
  return function ProfileWrapper() {
    return <ProfileScreen onLogout={onLogout} />;
  };
};

const createAdminWrapper = () => {
  return function AdminWrapper() {
    return <AdminStackNavigator />;
  };
};

export const MainNavigator: React.FC<MainNavigatorProps> = ({
  user,
  onLogout,
}) => {
  const [isReady, setIsReady] = useState(false);
  const navigationRef = useRef(createNavigationContainerRef());

  // Connection toast notifications (fires toasts on offline/online transitions)
  const { notifyOfflineSave } = useConnectionToasts();

  // Register this device's PushKit token so colleagues can ring it. Reaching
  // MainNavigator means there is a session, which the endpoint requires.
  useVoipRegistration(!!user);

  // Delay initialization to avoid race conditions
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Set navigation ref after component is ready
  useEffect(() => {
    if (isReady && navigationRef.current) {
      setNavigationRef(navigationRef);
    }
  }, [isReady]);

  const { isTablet } = useDeviceType();

  // Use the safe unread count hook
  const { unreadCount } = useSafeUnreadCount(isReady ? user?.id : undefined);

  const HomeWrapper = React.useMemo(
    () => createHomeWrapper(onLogout),
    [onLogout],
  );

  const MessagesWrapper = React.useMemo(
    () => createMessagesWrapper(onLogout),
    [onLogout],
  );

  const NotificationsWrapper = React.useMemo(
    () => createNotificationsWrapper(),
    [],
  );

  const DashboardWrapper = React.useMemo(() => createDashboardWrapper(), []);

  const ProfileWrapper = React.useMemo(
    () => createProfileWrapper(onLogout),
    [onLogout],
  );

  const AdminWrapper = React.useMemo(() => createAdminWrapper(), []);

  // Guard must stay below every hook call: `user` goes falsy on logout, and an
  // early return above the hooks would change hook count between renders.
  if (!user || !user.id) {
    return null;
  }

  // Show loading while initializing
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../assets/fajr-triage-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={styles.spinner}
        />
      </View>
    );
  }

  return (
    <ConnectionToastsProvider value={{ notifyOfflineSave }}>
      <View style={styles.rootContainer}>
        {/* Mounted here rather than in App.tsx because MainNavigator only
            renders for an authenticated user, which is exactly when a device
            should be ringable. A call can arrive on any screen, so this cannot
            live under Messages. It renders nothing until a call is answered —
            CallKit owns the ringing UI. */}
        <IncomingCallHost />
        <NavigationContainer
          ref={navigationRef}
          linking={{
            prefixes: ['fajrmission://', 'https://fajrmission.org'],
            config: {
              screens: {
                Home: 'home',
                Messages: 'messages',
                Notifications: 'notifications',
                Dashboard: {
                  path: 'dashboard',
                  screens: {
                    PatientDashboard: 'patients',
                    PatientChart: 'patient/:patientId',
                  },
                },
                Profile: 'profile',
                ...(user.isAdmin && { Admin: 'admin' }),
              },
            },
          }}

        >
          <Tab.Navigator
            initialRouteName="Home"
            tabBar={props => <NavigationBar {...props} />}
            screenOptions={{
              tabBarActiveTintColor: getRoleColor(user.accountType),
              tabBarInactiveTintColor: '#8E8E93',
              headerShown: false,
              ...(isTablet && { tabBarPosition: 'left' }),
            }}
          >
            <Tab.Screen
              name="Home"
              component={HomeWrapper}
              options={{
                tabBarLabel: 'Home',
                tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
              }}
            />

            <Tab.Screen
              name="Messages"
              component={MessagesWrapper}
              options={{
                tabBarLabel: 'Messages',
                tabBarIcon: ({ color, size }) => (
                  <MessageCircle size={size} color={color} />
                ),
              }}
            />

            <Tab.Screen
              name="Notifications"
              component={NotificationsWrapper}
              options={{
                tabBarLabel: 'Notifications',
                tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
                tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
              }}
            />

            <Tab.Screen
              name="Dashboard"
              component={DashboardWrapper}
              options={{
                tabBarLabel: 'Dashboard',
                tabBarIcon: ({ color, size }) => (
                  <Grid3x3 size={size} color={color} />
                ),
              }}
            />

            <Tab.Screen
              name="Profile"
              component={ProfileWrapper}
              options={{
                tabBarLabel: 'Profile',
                tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
              }}
            />

            {user.isAdmin && (
              <Tab.Screen
                name="Admin"
                component={AdminWrapper}
                options={{
                  tabBarLabel: 'Admin',
                  tabBarIcon: ({ color, size }) => (
                    <Shield size={size} color={color} />
                  ),
                }}
              />
            )}
          </Tab.Navigator>
        </NavigationContainer>
        <ConnectionStatusOverlay />
      </View>

    </ConnectionToastsProvider>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 20,
  },
  spinner: {
    marginTop: 10,
  },
});
