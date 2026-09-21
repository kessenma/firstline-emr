# Web UI Components

Next.js components using Tailwind CSS, Radix UI primitives, and shadcn patterns.

## Conventions

- **Styling**: Tailwind CSS classes merged with `cn()` from `@/lib/utils`
- **Variants**: `class-variance-authority` (cva) for component variant definitions
- **Icons**: `lucide-react` (NOT `lucide-react-native`)
- **Headless primitives**: Many components wrap Radix UI (Dialog, DropdownMenu, Select, Accordion, etc.) with Tailwind styling
- **Theme tokens**: CSS variables (`--primary`, `--foreground`, `--muted`, etc.) with `dark:` prefix for dark mode
- **Role theming**: Classes `role-doctor`, `role-triage` for role-based color schemes
- **Client components**: Add `"use client"` directive when using state, effects, or browser APIs
- **Forms**: Form components integrate with `react-hook-form` (FormField, FormItem, etc.)

## Media components

- Types come from `@fajr/shared/media` (`MediaItem`, `MediaType`) — do not duplicate locally
- MediaGrid uses CSS grid (responsive columns via Tailwind)
- MediaThumbnail uses Next.js `Image` component with `fill` layout

## Adding new components

- Import components directly by path (e.g., `from "@/components/ui/Button"`) — there is no barrel export file
