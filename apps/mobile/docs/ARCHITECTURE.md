# Fajr Mobile EMR - Architecture Documentation

## Overview

The Fajr Mobile EMR app follows the **MVVM (Model-View-ViewModel)** architecture pattern with a comprehensive theming system that supports both light and dark modes. This document outlines the architecture, design patterns, and best practices used throughout the application.

## Table of Contents

1. [Architecture Pattern](#architecture-pattern)
2. [Theme System](#theme-system)
3. [Project Structure](#project-structure)
4. [Design Patterns](#design-patterns)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

## Architecture Pattern

### MVVM (Model-View-ViewModel)

We use the MVVM pattern to separate concerns and improve testability:

```
┌──────────┐         ┌──────────────┐         ┌───────────┐
│   View   │ ◄─────► │  ViewModel   │ ◄─────► │   Model   │
│ (React)  │         │ (Business    │         │  (Data)   │
│          │         │   Logic)     │         │           │
└──────────┘         └──────────────┘         └───────────┘
```

#### Components

**View (Screens/Components)**
- React Native components
- Responsible for UI rendering only
- Uses hooks to interact with ViewModels
- Should contain minimal logic

**ViewModel**
- Contains business logic and presentation logic
- Manages state transformations
- Coordinates between Model and View
- Can be unit tested independently
- Implements the `ViewModel` interface

**Model**
- Data structures and types
- API calls and database operations
- Business domain logic
- Validation rules

### ViewModel Interface

All ViewModels must implement the base interface:

```typescript
interface ViewModel {
  cleanup?: () => void;
}
```

## Theme System

### Color Scheme

The app uses a comprehensive color system based on the web application's design:

#### Primary Colors

**Eastern Blue** - Primary brand color
```typescript
easternBlue: {
  50: '#f2f9f9',   // Lightest
  100: '#ddeff0',
  200: '#bfe0e2',
  300: '#92c9ce',
  400: '#5eaab2',
  500: '#4b9fa9',
  600: '#3a7580',  // Primary
  700: '#356069',
  800: '#315159',
  900: '#2d454c',
  950: '#1a2c32',  // Darkest
}
```

**Cello** - Secondary brand color
```typescript
cello: {
  50: '#eff8ff',   // Lightest
  100: '#dbeffe',
  200: '#c0e4fd',
  300: '#95d4fb',
  400: '#62bbf8',
  500: '#3e9df3',
  600: '#2880e8',  // Secondary
  700: '#2069d5',
  800: '#2056ad',
  900: '#204a88',
  950: '#1d3865',  // Darkest
}
```

#### Semantic Colors

- **Success**: Green palette (`#008387`)
- **Error**: Red palette (`#FF2121`)
- **Warning**: Orange palette (`#ff5722`)
- **Info**: Cello palette

### Theme Modes

The app follows the device's system appearance setting (light/dark) automatically — there is no manual theme switcher. This matches the web app's approach.

1. **Light Mode** — white backgrounds, dark text, vibrant colors
2. **Dark Mode** — dark backgrounds, light text, adjusted colors for contrast

See `docs/mobile/DARK_MODE_UPGRADE.md` for the full migration plan and color token reference.

### Using Themes

#### In Components

```typescript
import { useTheme, useThemeColors } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, themeMode, toggleTheme } = useTheme();
  const colors = useThemeColors();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
}
```

#### Accessing Theme Values

```typescript
import { spacing, borderRadius, typography, shadows } from '../utils/theme';

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
});
```

#### Using Helper Functions

```typescript
import { helpers } from '../utils/theme';

function Card() {
  const { theme } = useTheme();

  return (
    <View style={helpers.card(theme)}>
      <Text>Card content</Text>
    </View>
  );
}
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   └── CustomTabBar.tsx
├── contexts/           # React contexts
│   ├── DatabaseContext.tsx
│   └── ThemeContext.tsx
├── hooks/              # Custom React hooks
│   ├── useViewModel.ts
│   └── useMessages.ts
├── screens/            # Screen components (Views)
│   ├── LoginScreen.tsx
│   ├── MessagesScreen.tsx
│   ├── NotificationsScreen.tsx
│   ├── PatientDashboardScreen.tsx
│   └── ProfileScreen.tsx
├── viewmodels/         # ViewModels (Business Logic)
│   └── ProfileViewModel.ts
├── services/           # API and external services
│   └── DatabaseService.ts
├── types/              # TypeScript type definitions
│   └── messages.ts
├── utils/              # Utility functions and constants
│   ├── colors.ts       # Color definitions
│   └── theme.ts        # Theme configuration
└── config/             # App configuration
```

## Design Patterns

### 1. ViewModel Pattern

**When to use:**
- Complex business logic
- State transformations
- Reusable logic across multiple screens

**Example:**

```typescript
// viewmodels/ProfileViewModel.ts
export class ProfileViewModel implements ViewModel {
  constructor(private user: User) {}

  getFullName(): string {
    return `${this.user.firstName} ${this.user.lastName}`;
  }

  cleanup(): void {
    // Cleanup logic
  }
}

// screens/ProfileScreen.tsx
function ProfileScreen({ user }: Props) {
  const viewModel = useViewModel(() => new ProfileViewModel(user));

  return <Text>{viewModel.getFullName()}</Text>;
}
```

### 2. Context Pattern

**When to use:**
- Global state (theme, auth, etc.)
- Avoiding prop drilling
- Shared functionality

**Example:**

```typescript
// contexts/ThemeContext.tsx
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(lightTheme);
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Usage
function MyComponent() {
  const { theme } = useTheme();
  return <View style={{ backgroundColor: theme.colors.background }} />;
}
```

### 3. Hooks Pattern

**When to use:**
- Reusable stateful logic
- Side effects
- Connecting to external data sources

**Example:**

```typescript
// hooks/useMessages.ts
export function useMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages().then(setMessages);
  }, []);

  return { messages, loading };
}
```

## Best Practices

### Component Organization

1. **Keep Views Simple**
   - Minimal logic in components
   - Delegate to ViewModels
   - Focus on presentation

2. **Use ViewModels for:**
   - Business logic
   - Data transformations
   - Complex computations
   - API interactions

3. **Use Hooks for:**
   - Side effects
   - Data fetching
   - Subscriptions
   - Event handlers

### Styling Best Practices

1. **Use Theme Colors**
   ```typescript
   // ✅ Good
   const colors = useThemeColors();
   <View style={{ backgroundColor: colors.background }} />

   // ❌ Bad
   <View style={{ backgroundColor: '#FFFFFF' }} />
   ```

2. **Use Theme Constants**
   ```typescript
   // ✅ Good
   <View style={{ padding: spacing.md }} />

   // ❌ Bad
   <View style={{ padding: 16 }} />
   ```

3. **Organize Styles**
   ```typescript
   const styles = StyleSheet.create({
     container: {
       flex: 1,
       padding: spacing.base,
     },
     title: {
       fontSize: typography.fontSize.xl,
       fontWeight: typography.fontWeight.bold,
     },
   });
   ```

### TypeScript Best Practices

1. **Define Interfaces**
   ```typescript
   interface User {
     id: string;
     name: string;
     email: string;
   }
   ```

2. **Type Props**
   ```typescript
   interface ProfileScreenProps {
     user: User;
     onLogout?: () => void;
   }
   ```

3. **Use Type Inference**
   ```typescript
   const colors = useThemeColors(); // Type is inferred
   ```

## Examples

### Creating a New Screen with ViewModel

#### 1. Define the ViewModel

```typescript
// viewmodels/DashboardViewModel.ts
import { ViewModel } from '../hooks/useViewModel';

export class DashboardViewModel implements ViewModel {
  constructor(private userId: string) {}

  async fetchStats() {
    // Fetch dashboard statistics
  }

  cleanup() {
    // Cleanup subscriptions
  }
}
```

#### 2. Create the View

```typescript
// screens/DashboardScreen.tsx
import { useViewModel } from '../hooks/useViewModel';
import { useThemeColors } from '../contexts/ThemeContext';
import { DashboardViewModel } from '../viewmodels/DashboardViewModel';

export default function DashboardScreen({ userId }) {
  const colors = useThemeColors();
  const viewModel = useViewModel(() => new DashboardViewModel(userId));

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Dashboard</Text>
    </View>
  );
}
```

### Creating a Themed Component

```typescript
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius } from '../utils/theme';

function ThemedCard({ children }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        padding: spacing.base,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      {children}
    </View>
  );
}
```

### Adding a New Color

```typescript
// utils/colors.ts

// 1. Add to palette
export const palette = {
  // ... existing colors
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    // ... more shades
    950: '#3b0764',
  },
};

// 2. Add semantic color to light/dark themes
export const lightColors = {
  // ... existing colors
  accent: palette.purple[600],
};

export const darkColors = {
  // ... existing colors
  accent: palette.purple[400],
};
```

## Testing

### Testing ViewModels

```typescript
describe('ProfileViewModel', () => {
  it('should return full name', () => {
    const user = { firstName: 'John', lastName: 'Doe' };
    const viewModel = new ProfileViewModel(user);
    expect(viewModel.getFullName()).toBe('John Doe');
  });
});
```

### Testing Components

```typescript
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('ProfileScreen', () => {
  it('should render user name', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ProfileScreen user={mockUser} />
      </ThemeProvider>
    );
    expect(getByText('John Doe')).toBeTruthy();
  });
});
```

## Future Enhancements

1. **Persistence**
   - Save theme preference to storage
   - Restore on app launch

2. **Custom Themes**
   - Allow user-defined color schemes
   - Theme marketplace

3. **Accessibility**
   - High contrast mode
   - Font size adjustments
   - Screen reader optimization

4. **Performance**
   - Memoization of theme values
   - Lazy loading of ViewModels
   - Optimize re-renders

## Resources

- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MVVM Pattern](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93viewmodel)
- [React Hooks](https://react.dev/reference/react)

## Contributing

When adding new features:

1. Follow the MVVM pattern
2. Use the theme system for all colors and spacing
3. Create ViewModels for business logic
4. Write unit tests for ViewModels
5. Document new patterns or utilities
6. Keep components focused and simple

## Questions?

For questions or clarifications, please refer to the existing code examples or reach out to the development team.