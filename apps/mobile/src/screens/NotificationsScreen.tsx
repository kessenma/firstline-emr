import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  useNotificationsViewModel,
  type Notification,
} from '../viewModels/NotificationsViewModel';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';
import { useAuth } from '../contexts/AuthContext';
import { useThemeColors } from '../contexts/ThemeContext';
import { Card, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { getApiUrl, setEnvironment, getEnvironment } from '../config';
import { storageUtils } from '../utils/storage';
import { Alert } from 'react-native';
import { NotificationSheetRouter } from '../components/notification-sheets/NotificationSheetRouter';
import {
  shouldOpenSheet,
  getNotificationRoute,
  getNotificationActionText,
  type NotificationRoute,
} from '../utils/notificationRouting';

import {
  MessageSquare,
  AlertTriangle,
  UserCheck,
  UserX,
  UserCog,
  FileText,
  Settings,
  PhoneMissed,
  UserPlus,
  Heart,
  List,
  ListCollapse,
  ListChecks,
  Bell,
  CheckCircle2,
  Megaphone,
  ShieldAlert,
} from 'lucide-react-native';

type TabValue = 'all' | 'unread' | 'read' | 'admin';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'announcement':
      return Megaphone;
    case 'reminder':
      return Bell;
    case 'alert':
      return AlertTriangle;
    case 'profile_update_approved':
      return UserCheck;
    case 'profile_update_denied':
      return UserX;
    case 'profile_update_request':
      return UserCog;
    case 'patient_update':
      return FileText;
    case 'system_notification':
      return Settings;
    case 'missed_call':
      return PhoneMissed;
    case 'new_user_signup':
      return UserPlus;
    case 'specialty_no_doctors':
      return Heart;
    case 'message':
    default:
      return MessageSquare;
  }
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const isAdmin = !!user?.isAdmin;

  const [activeTab, setActiveTab] = useState<TabValue>('all');

  const {
    notificationsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
    handleNotificationClick,
    handleMarkAllAsRead,
    isMarkingAllAsRead,
    error: notificationsError,
  } = useNotificationsViewModel();

  const { unreadCount } = useUnreadNotificationCount(user?.id);

  // Filtered notifications based on active tab
  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notificationsPages.filter(n => !n.read);
      case 'read':
        return notificationsPages.filter(n => n.read);
      case 'admin':
        return notificationsPages.filter(n => !!n.isAdminNotification);
      default:
        return notificationsPages;
    }
  }, [notificationsPages, activeTab]);

  // Counts for tab badges
  const readCount = useMemo(
    () => notificationsPages.filter(n => n.read).length,
    [notificationsPages],
  );
  const localUnreadCount = useMemo(
    () => notificationsPages.filter(n => !n.read).length,
    [notificationsPages],
  );

  // Sheet state
  const [activeNotification, setActiveNotification] =
    useState<Notification | null>(null);

  const navigateToRoute = useCallback(
    (route: NotificationRoute) => {
      if (!route) return;
      switch (route.tab) {
        case 'Dashboard':
          (navigation as any).navigate('Dashboard', {
            screen: route.screen,
            params: route.params,
          });
          break;
        case 'Admin':
          (navigation as any).navigate('Admin', {
            screen: route.screen,
            params: route.params,
          });
          break;
        case 'Messages':
          (navigation as any).navigate('Messages', route.params);
          break;
        case 'Profile':
          (navigation as any).navigate('Profile');
          break;
      }
    },
    [navigation],
  );

  const handleNotificationTap = useCallback(
    (notification: Notification) => {
      handleNotificationClick(notification);
      if (shouldOpenSheet(notification, isAdmin)) {
        setActiveNotification(notification);
      } else {
        const route = getNotificationRoute(notification);
        if (route) {
          navigateToRoute(route);
        }
      }
    },
    [handleNotificationClick, isAdmin, navigateToRoute],
  );

  const handleSheetClose = useCallback(() => {
    setActiveNotification(null);
  }, []);

  const handleSheetNavigate = useCallback(
    (route: NotificationRoute) => {
      setActiveNotification(null);
      if (route) {
        navigateToRoute(route);
      }
    },
    [navigateToRoute],
  );

  useEffect(() => {
    if (user?.id) {
      const token = storageUtils.getToken();
      const notifUrl = getApiUrl(`/notifications/${user.id}`);
      const countUrl = getApiUrl(`/notifications/unread-count/${user.id}`);
      console.log('[NotificationsScreen] Diagnostic Info:');
      console.log('  User ID:', user.id);
      console.log('  Token exists:', !!token);
      console.log('  Notifications URL:', notifUrl);
      console.log('  Unread count URL:', countUrl);
    }
  }, [user?.id]);

  const handleSwitchToProduction = () => {
    Alert.alert(
      'Switch to Production',
      'This will switch your API calls to fajrmission.org and reload the app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: () => {
            setEnvironment('production');
            Alert.alert(
              'Environment Changed',
              'Please restart the app or pull to refresh.',
              [{ text: 'OK' }],
            );
          },
        },
      ],
    );
  };

  // Badge component for tab counts
  const CountBadge = ({ count, isActive }: { count: number; isActive: boolean }) => (
    <View
      style={[
        styles.countBadge,
        {
          backgroundColor: isActive ? colors.primary + '20' : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.countBadgeText,
          {
            color: isActive ? colors.primary : colors.textSecondary,
          },
        ]}
      >
        {count}
      </Text>
    </View>
  );

  // Tab trigger content
  const TabTriggerContent = ({
    icon: Icon,
    label,
    count,
    isActive,
  }: {
    icon: React.ComponentType<any>;
    label: string;
    count: number;
    isActive: boolean;
  }) => (
    <View style={styles.tabTriggerContent}>
      <Icon
        size={16}
        color={isActive ? colors.primary : colors.textSecondary}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: isActive ? colors.primary : colors.textSecondary },
          isActive && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
      <CountBadge count={count} isActive={isActive} />
    </View>
  );

  const renderNotification = ({ item }: { item: Notification }) => {
    const Icon = getNotificationIcon(item.type);
    const actionText = getNotificationActionText(item, isAdmin);
    const isAdminNotif = !!item.isAdminNotification;
    const accentColor = isAdminNotif ? colors.warning : colors.primary;

    return (
      <TouchableOpacity
        onPress={() => handleNotificationTap(item)}
        activeOpacity={0.7}
      >
        <Card
          style={[
            styles.notificationCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            (isAdminNotif || !item.read) && {
              borderLeftWidth: 3,
              borderLeftColor: accentColor,
            },
          ]}
        >
          <CardContent style={styles.notificationContent}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: (isAdminNotif || !item.read)
                    ? accentColor + '15'
                    : colors.surfaceSecondary,
                },
              ]}
            >
              <Icon
                size={18}
                color={(isAdminNotif || !item.read) ? accentColor : colors.textSecondary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.message,
                  { color: colors.textSecondary },
                  (isAdminNotif || !item.read) && { fontWeight: '600', color: colors.text },
                ]}
              >
                {item.message}
              </Text>
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              {actionText && (
                <Text style={[styles.linkText, { color: accentColor }]}>
                  {actionText}
                </Text>
              )}
            </View>
            {!item.read && !isAdminNotif && (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: colors.primary },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (activeTab === 'unread') {
      return (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: colors.primary + '15' },
            ]}
          >
            <CheckCircle2 size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            All caught up!
          </Text>
          <Text
            style={[styles.emptyDescription, { color: colors.textSecondary }]}
          >
            You have no unread notifications. Great job staying on top of
            things.
          </Text>
        </View>
      );
    }
    if (activeTab === 'admin') {
      return (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: colors.warning + '15' },
            ]}
          >
            <ShieldAlert size={40} color={colors.warning} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No admin notifications
          </Text>
          <Text
            style={[styles.emptyDescription, { color: colors.textSecondary }]}
          >
            Admin notifications will appear here when there are items requiring
            your attention.
          </Text>
        </View>
      );
    }
    if (activeTab === 'read') {
      return (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <ListChecks size={40} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No read notifications
          </Text>
          <Text
            style={[styles.emptyDescription, { color: colors.textSecondary }]}
          >
            Notifications you've already viewed will appear here.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: colors.primary + '15' },
          ]}
        >
          <Bell size={40} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No notifications yet
        </Text>
        <Text
          style={[styles.emptyDescription, { color: colors.textSecondary }]}
        >
          You'll see notifications about appointments, messages, and important
          updates here.
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      {/* Title row with mark-all action */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            disabled={isMarkingAllAsRead}
            activeOpacity={0.6}
            style={[
              styles.markAllButton,
              {
                backgroundColor: colors.primary + '12',
                opacity: isMarkingAllAsRead ? 0.5 : 1,
              },
            ]}
          >
            <ListChecks
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.markAllText, { color: colors.primary }]}>
              {isMarkingAllAsRead ? 'Marking...' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBarRow}>
        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as TabValue)}
          variant="underline"
          style={[styles.tabsContainer, { flex: 1 }]}
        >
          <TabsList style={styles.tabsList}>
            <TabsTrigger value="all">
              <TabTriggerContent
                icon={List}
                label="All"
                count={notificationsPages.length}
                isActive={activeTab === 'all'}
              />
            </TabsTrigger>
            <TabsTrigger value="unread">
              <TabTriggerContent
                icon={ListCollapse}
                label="Unread"
                count={unreadCount || localUnreadCount}
                isActive={activeTab === 'unread'}
              />
            </TabsTrigger>
            <TabsTrigger value="read">
              <TabTriggerContent
                icon={ListChecks}
                label="Read"
                count={readCount}
                isActive={activeTab === 'read'}
              />
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <TouchableOpacity
          onPress={() => setActiveTab(activeTab === 'admin' ? 'all' : 'admin')}
          style={[
            styles.adminButton,
            {
              borderColor: activeTab === 'admin' ? colors.warning : colors.warning + '80',
              backgroundColor: activeTab === 'admin' ? colors.warning + '15' : 'transparent',
            },
          ]}
        >
          <ShieldAlert
            size={16}
            color={activeTab === 'admin' ? colors.warning : colors.warning + 'B3'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} style={styles.skeletonItem} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        {notificationsError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIconText}>⚠️</Text>
            <Text style={[styles.errorTitle, { color: colors.error || '#DC2626' }]}>
              Unable to Load Notifications
            </Text>
            <Text
              style={[
                styles.errorDescription,
                { color: colors.textSecondary },
              ]}
            >
              Cannot connect to the backend server. Please ensure:
            </Text>
            <View
              style={[
                styles.errorList,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Text
                style={[styles.errorListItem, { color: colors.text }]}
              >
                • Backend server is running on port 3000
              </Text>
              <Text
                style={[styles.errorListItem, { color: colors.text }]}
              >
                • Run: cd apps/web && pnpm dev
              </Text>
              <Text
                style={[styles.errorListItem, { color: colors.text }]}
              >
                • Check your environment setting in Login screen
              </Text>
              <Text
                style={[styles.errorListItem, { color: colors.text }]}
              >
                • Current: {getEnvironment()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSwitchToProduction}
              style={[
                styles.switchButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Switch to Production (fajrmission.org)
              </Text>
            </TouchableOpacity>
            <Text
              style={[styles.errorDetails, { color: colors.textSecondary }]}
            >
              Error: {notificationsError.message}
            </Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={item => item._id}
            renderItem={renderNotification}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.loadingMore}>
                  <Skeleton style={styles.skeletonItem} />
                </View>
              ) : null
            }
            style={styles.flatList}
            contentContainerStyle={styles.flatListContent}
          />
        )}
      </View>

      <NotificationSheetRouter
        notification={activeNotification}
        onClose={handleSheetClose}
        onNavigate={handleSheetNavigate}
        isAdmin={isAdmin}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabsContainer: {
    marginBottom: -1, // Overlap with header border
  },
  adminButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
    marginBottom: -1,
  },
  tabsList: {
    borderBottomWidth: 0,
  },
  tabTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingVertical: 4,
  },
  notificationCard: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 12,
  },
  skeletonItem: {
    height: 76,
    marginBottom: 8,
    borderRadius: 12,
  },
  loadingMore: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorList: {
    alignSelf: 'stretch',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorListItem: {
    fontSize: 13,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorDetails: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 8,
  },
  switchButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
