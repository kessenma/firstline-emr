# Error Handling Guide for Mobile App

Complete guide for handling errors in the Fajr EMR mobile app.

## Components Created

### 1. `ErrorCard` Component
A reusable card component for displaying errors with copy functionality.

**Location:** `src/components/ErrorCard.tsx`

**Features:**
- ✅ Displays error message and stack trace
- ✅ Copy error to clipboard
- ✅ Optional retry button
- ✅ Optional dismiss button
- ✅ Visual feedback when copied
- ✅ Collapsible stack trace

### 2. `ErrorBoundary` Component
A React error boundary that catches JavaScript errors anywhere in the component tree.

**Location:** `src/components/ErrorBoundary.tsx`

**Features:**
- ✅ Catches rendering errors
- ✅ Displays full error details
- ✅ Shows component stack
- ✅ Reset functionality
- ✅ Custom fallback support

### 3. `useErrorHandler` Hook
A custom hook for managing errors in functional components.

**Location:** `src/hooks/useErrorHandler.ts`

**Features:**
- ✅ Error state management
- ✅ Async function wrapper
- ✅ Clear/reset errors
- ✅ Type-safe error handling

## Usage Examples

### Using ErrorCard Directly

```tsx
import { ErrorCard } from '../components/ErrorCard';

function MyScreen() {
  const [error, setError] = useState<Error | null>(null);

  const handleRetry = () => {
    setError(null);
    // Retry logic
  };

  if (error) {
    return (
      <ErrorCard
        error={error}
        onRetry={handleRetry}
        onDismiss={() => setError(null)}
        title="Failed to Load Data"
      />
    );
  }

  return <View>...</View>;
}
```

### Using useErrorHandler Hook

```tsx
import { useErrorHandler } from '../hooks/useErrorHandler';
import { ErrorCard } from '../components/ErrorCard';

function MyScreen() {
  const { error, hasError, handleError, clearError, wrapAsync } = useErrorHandler();

  const loadData = async () => {
    await wrapAsync(async () => {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Failed to fetch');
      return await response.json();
    });
  };

  if (hasError && error) {
    return <ErrorCard error={error} onRetry={loadData} onDismiss={clearError} />;
  }

  return <View>...</View>;
}
```

### Using ErrorBoundary

Already implemented in `App.tsx`:

```tsx
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <YourAppContent />
    </ErrorBoundary>
  );
}
```

### Custom ErrorBoundary Fallback

```tsx
<ErrorBoundary
  fallback={(error, resetError) => (
    <View style={styles.customError}>
      <Text>Oops! Something went wrong.</Text>
      <ErrorCard error={error} onRetry={resetError} />
    </View>
  )}
>
  <YourComponent />
</ErrorBoundary>
```

## Error Types

### Network Errors
```tsx
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
} catch (error) {
  handleError(error);
}
```

### Validation Errors
```tsx
if (!email.includes('@')) {
  setError(new Error('Please enter a valid email address'));
  return;
}
```

### API Errors
```tsx
const loadData = async () => {
  try {
    const data = await apiCall();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      handleError(error);
    } else {
      handleError(new Error('An unexpected error occurred'));
    }
  }
};
```

## Best Practices

### 1. Always Wrap Async Operations

```tsx
// ✅ Good
const loadData = async () => {
  await wrapAsync(async () => {
    // Your async code
  });
};

// ❌ Bad - errors not caught
const loadData = async () => {
  await fetch(url); // Unhandled error
};
```

### 2. Provide Clear Error Messages

```tsx
// ✅ Good
throw new Error('Failed to load messages. Please check your internet connection.');

// ❌ Bad
throw new Error('Error');
```

### 3. Handle Different Error States

```tsx
// ✅ Good
if (!response.ok) {
  if (response.status === 401) {
    throw new Error('Please log in again');
  } else if (response.status === 404) {
    throw new Error('Data not found');
  } else {
    throw new Error('Failed to load data');
  }
}

// ❌ Bad
if (!response.ok) {
  throw new Error('Error');
}
```

### 4. Log Errors for Debugging

```tsx
try {
  // Your code
} catch (error) {
  console.error('Detailed error:', error);
  handleError(error);
}
```

### 5. Provide Retry Functionality

```tsx
<ErrorCard
  error={error}
  onRetry={loadData} // Allow user to retry
  title="Failed to Load"
/>
```

## Testing Errors

### Test ErrorBoundary

Add a button to trigger an error:

```tsx
function TestErrorButton() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('Test error from component');
  }

  return (
    <TouchableOpacity onPress={() => setShouldError(true)}>
      <Text>Trigger Error</Text>
    </TouchableOpacity>
  );
}
```

### Test ErrorCard

```tsx
function TestScreen() {
  const [showError, setShowError] = useState(false);

  if (showError) {
    return (
      <ErrorCard
        error={new Error('This is a test error with a stack trace')}
        onRetry={() => setShowError(false)}
        onDismiss={() => setShowError(false)}
      />
    );
  }

  return (
    <TouchableOpacity onPress={() => setShowError(true)}>
      <Text>Show Error</Text>
    </TouchableOpacity>
  );
}
```

## Copying Errors

Users can tap the "📋 Copy Error" button to copy the full error (including stack trace) to their clipboard. This is helpful for:

- Reporting bugs to developers
- Sharing error details with support team
- Saving error logs for later review

The copied text includes:
- Error message
- Full stack trace (if available)
- Component stack (from ErrorBoundary)

## Error Display

### ErrorCard Layout

```
┌─────────────────────────────────────┐
│ ⚠️  Error Title                     │
│                                     │
│ Error message goes here...          │
│                                     │
│ Stack Trace:                        │
│ ┌─────────────────────────────────┐ │
│ │ at Component (file.tsx:123)     │ │
│ │ at App (App.tsx:45)             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [📋 Copy Error] [🔄 Retry] [✕ Dismiss]│
└─────────────────────────────────────┘
```

### ErrorBoundary Layout

```
┌─────────────────────────────────────┐
│ Something went wrong                │
│ The app encountered an unexpected   │
│ error. You can copy the error...    │
│                                     │
│ [ErrorCard Component]               │
│                                     │
│ Component Stack:                    │
│ ┌─────────────────────────────────┐ │
│ │ in ErrorComponent               │ │
│ │ in Screen                       │ │
│ │ in App                          │ │
│ └─────────────────────────────────┘ │
│                                     │
│      [🔄 Try Again]                 │
└─────────────────────────────────────┘
```

## Integration Points

### Already Integrated

- ✅ `App.tsx` - Wrapped with ErrorBoundary
- ✅ `MessagesScreen.tsx` - Uses ErrorCard for fetch errors
- ✅ `ThreadDetailScreen.tsx` - Uses ErrorCard for message loading errors

### Recommended Integration

1. **LoginScreen** - Add ErrorCard for login failures
2. **HomeScreen** - Add ErrorBoundary around content
3. **API calls** - Wrap with useErrorHandler
4. **Database operations** - Add error handling
5. **Media loading** - Display ErrorCard on media fetch failures

## Troubleshooting

### ErrorCard Not Showing

Check that:
- Error state is set correctly
- Component is rendering the ErrorCard conditionally
- Error prop is not null/undefined

### Copy Button Not Working

Ensure:
- `Clipboard` is imported from 'react-native'
- User has granted clipboard permissions (iOS)
- Error actually has content to copy

### ErrorBoundary Not Catching Errors

ErrorBoundary only catches:
- ✅ Rendering errors
- ✅ Lifecycle method errors
- ✅ Constructor errors

It does NOT catch:
- ❌ Event handler errors (use try/catch)
- ❌ Async errors (use useErrorHandler)
- ❌ Server errors (handle in fetch)

## Future Enhancements

- [ ] Error reporting service integration (Sentry, Bugsnag)
- [ ] Automatic error screenshots
- [ ] Error history/log viewer
- [ ] Network status detection
- [ ] Offline error queueing
- [ ] Error analytics
- [ ] Custom error themes
- [ ] Error notification badges

## Related Files

- `src/components/ErrorCard.tsx` - Error display component
- `src/components/ErrorBoundary.tsx` - React error boundary
- `src/hooks/useErrorHandler.ts` - Error handling hook
- `App.tsx` - Root error boundary setup
- `src/screens/MessagesScreen.tsx` - Example usage
- `src/screens/ThreadDetailScreen.tsx` - Example usage

## Support

For questions or issues with error handling:
1. Check console logs for error details
2. Use ErrorCard's copy feature to share error
3. Review stack trace for error source
4. Test with ErrorBoundary to catch rendering errors