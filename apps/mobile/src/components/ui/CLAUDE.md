# Mobile UI Components

Pure React Native components — no Radix UI, no Tailwind, no web dependencies.

## Conventions

- **Theming**: All components use `useThemeColors()` from `../../contexts/ThemeContext` for colors and utilities from `../../utils/theme` (spacing, borderRadius, typography, shadows)
- **Styling**: `StyleSheet.create()` — never inline Tailwind or CSS classes
- **Icons**: `lucide-react-native` (NOT `lucide-react`)
- **Animations**: Use `react-native-reanimated` for performance. Avoid the built-in `Animated` API for new work
- **Refs**: ForwardRef pattern on Input, Label, Badge, Card, ScrollArea
- **Compound components**: Dialog, DropdownMenu, Tabs, RadioCard, Accordion use React Context for parent-child state

## Media components

- Types come from `@fajr/shared/media` (`MediaItem`, `MediaType`) — do not duplicate locally
- `MediaThumbnailItem` is deprecated — use `MediaItem` from `@fajr/shared/media`
- MediaGrid uses FlatList (supports swapping to BottomSheetFlatList via `FlatListComponent` prop)
- FullScreenMediaViewer supports images, video, and PDF (via `react-native-pdf`)

## Adding new components

1. Create the component file in this directory
2. Export it from `index.ts` (barrel file)
