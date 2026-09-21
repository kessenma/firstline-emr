# About Page Components

This directory contains all components related to the About page, refactored from a monolithic page structure into a component-based MVVM architecture.

## 📁 Directory Structure

```
aboutPage/
├── AboutPageView.tsx                 # Main orchestrator component
├── AboutPageViewModel.ts             # Centralized data and business logic
├── types.ts                          # Shared TypeScript interfaces
├── index.ts                          # Public API exports
├── README.md                         # This file
│
├── sections/                         # Major page sections
│   ├── HeroSection.tsx              # Hero text and introduction
│   ├── StatisticsSection.tsx        # Animated counters with dialogs
│   ├── StatisticsSectionViewModel.ts # Counter animation logic
│   ├── UserRolesSection.tsx         # User type cards grid
│   ├── WorkflowSection.tsx          # Patient care workflow
│   └── FeaturesSection.tsx          # Available functionality grid
│
├── cards/                            # Reusable card components
│   ├── UserRoleCard.tsx             # User role display card
│   ├── WorkflowStep.tsx             # Numbered workflow step
│   └── FeatureItem.tsx              # Feature display item
│
├── animations/                       # Animation components
│   ├── PatientRoleAnimation.tsx     # Patient ball animation
│   ├── TriageRoleAnimation.tsx      # Triage meeting animation
│   ├── DoctorRoleAnimation.tsx      # Doctor heartrate animation
│   ├── EvacRoleAnimation.tsx        # Med evac animation
│   └── ConnectionAnimation.tsx      # Top connection animation
│
└── [Existing Files]
    ├── AnimatedBackgroundCircle.tsx  # Background animation
    ├── CountriesServedDialog.tsx     # Countries dialog
    └── DoctorSpecialtiesDialog.tsx   # Specialties dialog
```

## 🎯 Architecture Pattern

This refactor follows the **MVVM (Model-View-ViewModel)** pattern:

- **Views** (`.tsx` components): Handle UI rendering and user interactions
- **ViewModels** (`.ts` files): Manage business logic, data, and state
- **Models** (`types.ts`): Define data structures and interfaces

## 🔧 Usage

### Basic Usage

```tsx
import { AboutPageView } from '@/components/aboutPage';

export default function AboutPage() {
  return <AboutPageView />;
}
```

### Using Individual Components

```tsx
import { 
  HeroSection, 
  StatisticsSection, 
  UserRolesSection 
} from '@/components/aboutPage';

function CustomAboutPage() {
  return (
    <div>
      <HeroSection 
        title="Custom Title"
        subtitle="Custom Subtitle"
        description="Custom description..."
      />
      <StatisticsSection statistics={myStats} />
      <UserRolesSection />
    </div>
  );
}
```

### Using Animations Independently

```tsx
import { 
  PatientRoleAnimation, 
  DoctorRoleAnimation 
} from '@/components/aboutPage';

function MyComponent() {
  return (
    <div className="relative h-64">
      <PatientRoleAnimation 
        config={{ enabled: true }} 
      />
    </div>
  );
}
```

## 📦 Component Descriptions

### Main Components

#### `AboutPageView`
The main orchestrator component that composes all sections together. Handles global layout and styling.

**Props:** None (uses internal ViewModel)

#### `AboutPageViewModel`
Custom hook that provides all data for the about page:
- Features list
- Statistics data
- Hero content

**Returns:** `{ features, statistics, heroContent }`

### Section Components

#### `HeroSection`
Displays the hero title, subtitle, and description.

**Props:**
- `title?: string` - Main heading
- `subtitle?: string` - Subtitle text
- `description?: string` - Detailed description
- `className?: string` - Additional CSS classes

#### `StatisticsSection`
Displays animated counters that trigger on scroll.

**Props:**
- `statistics: Statistic[]` - Array of statistics to display
- `className?: string` - Additional CSS classes

**Statistic Type:**
```typescript
{
  id: string;
  label: string;
  targetValue: number;
  suffix?: string;
  dialogComponent?: React.ReactNode;
}
```

#### `UserRolesSection`
Displays the four user role cards with animations.

**Props:**
- `className?: string` - Additional CSS classes

#### `WorkflowSection`
Displays the step-by-step patient care workflow.

**Props:**
- `className?: string` - Additional CSS classes

#### `FeaturesSection`
Displays available features in a grid layout.

**Props:**
- `features: Feature[]` - Array of features to display
- `className?: string` - Additional CSS classes

### Card Components

#### `UserRoleCard`
Reusable card component for displaying user roles.

**Props:**
- `icon: React.ReactNode` - Icon to display
- `title: string` - Card title
- `description: string` - Card description
- `animationComponent: React.ReactNode` - Animation to display
- `className?: string` - Additional CSS classes
- `headerClassName?: string` - Header-specific CSS classes

#### `WorkflowStep`
Displays a numbered workflow step.

**Props:**
- `stepNumber: number` - Step number to display
- `title: string` - Step title
- `description: string` - Step description

#### `FeatureItem`
Displays a feature with icon and text.

**Props:**
- `icon: LucideIcon` - Lucide icon component
- `title: string` - Feature title
- `description: string` - Feature description

### Animation Components

All animation components accept:

**Props:**
- `config?: AnimationConfig` - Animation configuration
- `className?: string` - Additional CSS classes

**AnimationConfig:**
```typescript
{
  duration?: number;
  delay?: number;
  enabled?: boolean;
  playOnce?: boolean;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}
```

#### `PatientRoleAnimation`
Displays animated balls moving horizontally (patient intake flow).

#### `TriageRoleAnimation`
Displays animated balls that meet in the center (triage coordination).

#### `DoctorRoleAnimation`
Displays animated heartrate monitor visualization.

#### `EvacRoleAnimation`
Displays animated items moving toward a form (med evac).

#### `ConnectionAnimation`
Displays animated balls connecting different sections.

## 🎨 Styling

### CSS Custom Properties

The components use these CSS custom properties for theming:

```css
.about-root {
  --about-doctor: hsl(205 55% 56%);   /* Blue */
  --about-evac: hsl(172 45% 41%);     /* Teal */
  --about-triage: hsl(222 30% 28%);   /* Dark blue */
}
```

### Tailwind Classes

All components use Tailwind CSS and theme tokens:
- `text-foreground` / `text-muted-foreground`
- `bg-background` / `bg-card`
- `border-border`
- `text-primary` / `bg-primary`

## ♿ Accessibility

- All animations respect `prefers-reduced-motion`
- Semantic HTML structure
- Proper heading hierarchy
- ARIA labels where needed
- Keyboard navigation support

## 🔄 Migration from Old Structure

The original `apps/web/app/about/page.jsx` has been simplified to:

```jsx
import { AboutPageView } from '@/components/aboutPage';

export default function AboutPage() {
  return <AboutPageView />;
}
```

All logic, animations, and styles have been moved to components.

## 📝 Key Benefits of Refactor

1. **Separation of Concerns**: UI, logic, and data are separated
2. **Reusability**: Components can be used elsewhere
3. **Maintainability**: Easier to find and modify code
4. **Testability**: Components can be tested in isolation
5. **Type Safety**: Full TypeScript support
6. **Performance**: Potential for better code splitting
7. **Composition**: Mix and match components as needed

## 🧪 Testing

To test individual components:

```tsx
import { render } from '@testing-library/react';
import { HeroSection } from '@/components/aboutPage';

test('renders hero section', () => {
  const { getByText } = render(
    <HeroSection title="Test Title" />
  );
  expect(getByText('Test Title')).toBeInTheDocument();
});
```

## 📚 Further Reading

- See `apps/docs/theme-refactor/about-page-refactor-checklist.md` for refactor checklist
- See existing component patterns in `components/patient-dashboard/` for similar architecture

## 🤝 Contributing

When adding new features to the About page:

1. Create components in appropriate subdirectories
2. Update `index.ts` with new exports
3. Add TypeScript types to `types.ts`
4. Update this README with new component documentation
5. Follow existing naming conventions (PascalCase for components)
6. Use MVVM pattern for complex logic