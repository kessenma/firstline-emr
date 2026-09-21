# Bottom Tab Navigation

This document describes the bottom tab navigation implementation in the Fajr Mobile EMR app.

## Overview

The mobile app now features a bottom tab navigation bar similar to the web application's bottom menu. This provides easy access to the main sections of the app while maintaining a consistent user experience across platforms.

## Structure

### Navigation Tabs

The app includes four main tabs:

1. **Messages** 📱
   - View and manage message threads
   - Access internal group messages and Telegram threads
   - Real-time message updates

2. **Notifications** 🔔
   - View system notifications
   - Get alerts about appointments and updates
   - Currently displays an empty state placeholder

3. **Patient Dashboard** 📊
   - Quick overview of patient statistics
   - Access recent patients, appointments, and critical cases
   - Quick action buttons for common tasks

4. **Profile** 👤
   - View user profile information
   - Access personal and professional details
   - Logout functionality

## Implementation Details

### Dependencies

The following packages were added to support navigation:

```json
"@react-navigation/native": "^7.1.20",
"@react-navigation/bottom-tabs": "^7.8.5",
"react-native-safe-area-context": "^5.6.2",
"react-native-screens": "^4.18.0",
"react-native-gesture-handler": "^2.29.1",
"lucide-react-native": "^0.544.0",
"react-native-svg": "^15.15.0"
```

**Important:** The `rspack.config.mjs` excludes `lucide-react-native`'s `infinity.js` file to avoid Hermes parser conflicts with the global `Infinity` constant. See the config file for the exclusion pattern.

### Key Components

#### CustomTabBar (`src/components/CustomTabBar.tsx`)
- Custom tab bar component with rounded pill design
- Matches the web application's bottom menu styling
- Features active state indicator and smooth transitions
- Positioned as a floating bar at the bottom of the screen

#### Screen Components
- `MessagesScreen` - Existing component, updated to work with tabs
- `NotificationsScreen` - New placeholder screen
- `PatientDashboardScreen` - New placeholder screen with quick stats
- `ProfileScreen` - New screen with user details and logout

### Styling

The custom tab bar features:
- **Rounded pill design** - 99px border radius for a modern look
- **Floating appearance** - Positioned 48px from bottom with shadow
- **Active state** - Navy blue background (#003D82) for active tabs
- **Icons** - Lucide icons for consistent visual language
- **Smooth animations** - Transitions between tabs

### App Structure

```
App.tsx
├── GestureHandlerRootView
├── SafeAreaProvider
│   └── DatabaseProvider
│       ├── LoginScreen (if not authenticated)
│       └── NavigationContainer (if authenticated)
│           └── MainTabs
│               ├── MessagesScreen
│               ├── NotificationsScreen
│               ├── PatientDashboardScreen
│               └── ProfileScreen
```

## Color Scheme

- **Primary Blue**: `#003D82` - Active tab background, primary actions
- **Secondary Blue**: `#007AFF` - Icons, statistics, links
- **Background**: `#F8F9FA` - Screen backgrounds
- **White**: `#FFFFFF` - Cards, tab bar background
- **Text**: `#1A1A1A` - Primary text
- **Gray**: `#666666` - Secondary text
- **Border**: `#E5E5E5` - Borders and dividers

## Usage

### Navigation
Users can switch between tabs by tapping on the icons in the bottom tab bar. The active tab is highlighted with a navy blue background and white icon.

### Logout
The logout functionality has been moved from the Messages screen to the Profile screen for better organization.

## Future Enhancements

Potential improvements for the navigation:

1. **Badge notifications** - Show unread count on Messages and Notifications tabs
2. **Haptic feedback** - Add tactile feedback on tab press
3. **Swipe gestures** - Allow swiping between tabs
4. **Deep linking** - Support URL-based navigation
5. **Admin tab** - Add conditional admin dashboard tab for admin users
6. **Search** - Add global search functionality

## Known Issues

- React warnings about components defined during render - These are performance warnings but don't affect functionality. Can be resolved by using navigation params or context for passing user data.
- **lucide-react-native Infinity icon** - The `infinity.js` file is excluded in `rspack.config.mjs` to prevent Hermes parser conflicts with the global `Infinity` constant

## Testing

To test the navigation:

1. Run the app: `pnpm ios` or `pnpm android`
2. Log in with valid credentials
3. Tap each tab to verify navigation works
4. Check that user data is passed correctly to each screen
5. Test logout from Profile screen

## References

- Inspired by the web app's `bottom-menu.tsx` component
- Uses similar structure to the rag-mobile app's navigation
- Icons from lucide-react-native for consistency with web