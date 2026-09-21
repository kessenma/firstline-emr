# Notifications Caching Implementation

## Overview

The notifications page now uses proper React Query caching to prevent unnecessary refetches when navigating back to the page. This provides a better user experience and reduces server load.

## How It Works

### 1. Shared QueryClient

Instead of creating a new `QueryClient` on each page render, we now use the shared `QueryClient` from the app-level `Providers` component located in `apps/web/components/hooks/Providers.tsx`.

**Before:**
```tsx
// Creating a new QueryClient on every render - BAD
const queryClient = new QueryClient()
return (
  <QueryClientProvider client={queryClient}>
    <NotificationsView />
  </QueryClientProvider>
)
```

**After:**
```tsx
// Using the shared QueryClient from app-level provider - GOOD
return (
  <div className="m-24">
    <NotificationsView />
  </div>
)
```

### 2. Cache Configuration

The notifications query now has specific caching settings:

```typescript
{
  staleTime: 1000 * 60 * 5,        // Data is fresh for 5 minutes
  gcTime: 1000 * 60 * 30,          // Keep in cache for 30 minutes
  refetchOnWindowFocus: false,      // Don't refetch when tab regains focus
  refetchOnMount: false,            // Don't refetch when component remounts
}
```

### 3. Cache Invalidation

When a notification is marked as read, the cache is properly invalidated using `queryClient.invalidateQueries()` instead of `refetch()`. This ensures that all components using the same query are updated.

## Benefits

1. **No Unnecessary Refetches**: When navigating away from the notifications page and back, the data is served from cache (if still fresh)
2. **Better Performance**: Reduces API calls and improves page load times
3. **Consistent State**: All components sharing the same query see the same cached data
4. **Automatic Updates**: When notifications are marked as read, the cache is properly invalidated

## Cache Timing

- **Fresh for 5 minutes**: During this time, no refetch happens at all
- **Cached for 30 minutes**: After staleness, data can still be served from cache while refetching in the background
- **After 30 minutes**: Data is garbage collected and will be fetched fresh on next visit

## Manual Refresh

If you need to manually refresh notifications, the `refetch` function is still exposed from the `useNotificationsViewModel` hook and can be used for pull-to-refresh or manual refresh buttons.

## Testing

To verify caching is working:

1. Visit `/notifications` page
2. Open Network tab in DevTools
3. Note the API call to `/api/notifications/:userId`
4. Navigate away (e.g., to `/home`)
5. Navigate back to `/notifications`
6. **Expected**: No new API call should be made (data served from cache)
7. Wait 5 minutes and repeat steps 4-5
8. **Expected**: API call is made to refresh stale data

## Related Files

- `apps/web/app/notifications/page.tsx` - Main notifications page
- `apps/web/components/notifications/NotificationsViewModel.ts` - Query hook with cache configuration
- `apps/web/components/hooks/Providers.tsx` - Shared QueryClient provider with global cache settings