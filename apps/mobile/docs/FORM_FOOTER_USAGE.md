# FormFooter Component - Usage Guide

## Quick Start

The `FormFooter` component is a reusable footer for multi-step forms with navigation buttons and completion tracking.

## Import

```typescript
import { FormFooter } from '../components/FormFooter';
import type { FormCompletion } from '../types';
```

## Basic Usage

```tsx
<FormFooter
  currentStep={0}
  totalSteps={5}
  completion={completion}
  isSaving={false}
  onPrevious={() => handlePrevious()}
  onNext={() => handleNext()}
  onSaveDraft={() => handleSaveDraft()}
  onSubmit={() => handleSubmit()}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `currentStep` | `number` | ✅ | Current step index (0-based) |
| `totalSteps` | `number` | ✅ | Total number of steps |
| `completion` | `FormCompletion` | ✅ | Form completion data |
| `isSaving` | `boolean` | ✅ | Loading state for buttons |
| `onPrevious` | `() => void` | ✅ | Previous button handler |
| `onNext` | `() => void` | ✅ | Next button handler |
| `onSaveDraft` | `() => void` | ✅ | Save draft handler |
| `onSubmit` | `() => void` | ✅ | Submit form handler |

## FormCompletion Type

```typescript
interface FormCompletion {
  sections: {
    basic: SectionCompletion;
    medical: SectionCompletion;
    logistics: SectionCompletion;
    documentation: SectionCompletion;
    approvals: SectionCompletion;
  };
  overall: SectionCompletion;
}

interface SectionCompletion {
  total: number;
  completed: number;
  percentage: number;
  isComplete: boolean;
  missingRequired: string[];
  totalRequired: number;
  completedRequired: number;
  missingOptional: string[];
}
```

## Complete Example

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormFooter } from './components/FormFooter';
import { useFormCompletion } from './hooks/useFormCompletion';

function MyFormScreen() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [formData, setFormData] = React.useState(initialData);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const completion = useFormCompletion(formData);
  const totalSteps = 5;

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await saveDraft(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await submitForm(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.content}>
        {/* Your form content */}
      </SafeAreaView>
      
      <SafeAreaView edges={['bottom']}>
        <FormFooter
          currentStep={currentStep}
          totalSteps={totalSteps}
          completion={completion}
          isSaving={isSaving}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
```

## Button Behavior

### Previous Button
- Only shown when `currentStep > 0`
- Calls `onPrevious` when pressed
- Disabled when `isSaving` is true

### Save Draft Button
- Always visible
- Shows spinner when `isSaving` is true
- Compact size to save space
- Calls `onSaveDraft` when pressed

### Next/Submit Button
- Shows "Next" when not on last step
- Shows "Submit Form" when on last step and form is complete
- Shows "Submit (X%)" when on last step but form incomplete
- Displays checkmark icon when complete
- Calls `onNext` or `onSubmit` depending on step
- Disabled when `isSaving` is true

## Completion Status Display

The footer shows overall completion at the bottom:
```
Overall: 42/60 fields • 70% complete
```

This updates in real-time as the user fills out the form.

## Layout Integration

### With SafeAreaView

```tsx
<View style={{ flex: 1 }}>
  <SafeAreaView edges={['top']} style={{ flex: 1 }}>
    {/* Content */}
  </SafeAreaView>
  
  <SafeAreaView edges={['bottom']}>
    <FormFooter {...props} />
  </SafeAreaView>
</View>
```

### Scroll View Padding

Make sure your ScrollViews have bottom padding to prevent content from being hidden:

```tsx
import { FORM_SCROLL_BOTTOM_PADDING } from './constants';

<ScrollView style={styles.container}>
  {/* Form fields */}
  <View style={{ height: FORM_SCROLL_BOTTOM_PADDING }} />
</ScrollView>
```

## Styling

The footer uses theme colors from `useThemeColors()`:
- `surface` - Background color
- `border` - Border color
- `primary` - Primary buttons
- `backgroundSecondary` - Secondary buttons
- `text` - Text color
- `textSecondary` - Secondary text
- `white` - Button text on primary

## Touch Targets

All buttons meet iOS Human Interface Guidelines:
- Minimum height: 44px
- Proper spacing between elements
- Clear active/pressed states

## States

### Loading State
```tsx
<FormFooter
  isSaving={true}
  {/* ... other props */}
/>
```
- Shows spinner in Save Draft button
- Shows spinner in Next/Submit button
- All buttons disabled

### First Step
```tsx
<FormFooter
  currentStep={0}
  {/* ... other props */}
/>
```
- Previous button hidden
- Save Draft and Next buttons visible

### Last Step (Incomplete)
```tsx
<FormFooter
  currentStep={4}
  totalSteps={5}
  completion={{ overall: { percentage: 70, isComplete: false } }}
  {/* ... other props */}
/>
```
- Shows "Submit (70%)" button

### Last Step (Complete)
```tsx
<FormFooter
  currentStep={4}
  totalSteps={5}
  completion={{ overall: { percentage: 100, isComplete: true } }}
  {/* ... other props */}
/>
```
- Shows "Submit Form" with checkmark icon

## Accessibility

The component includes:
- Proper touch targets (44px)
- Clear visual feedback
- Loading indicators
- Disabled states
- Theme-aware colors

## Performance

The component:
- Uses theme colors efficiently
- Minimal re-renders
- Optimized button states
- No expensive calculations

## Common Patterns

### Validation Before Next

```tsx
const handleNext = () => {
  const errors = validateCurrentStep(currentStep, formData);
  if (Object.keys(errors).length === 0) {
    setCurrentStep(currentStep + 1);
  }
};
```

### Confirm Before Submit

```tsx
const handleSubmit = () => {
  Alert.alert(
    'Submit Form',
    'Are you sure you want to submit?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', onPress: submitForm },
    ]
  );
};
```

### Auto-save Draft

```tsx
React.useEffect(() => {
  const timer = setTimeout(() => {
    handleSaveDraft();
  }, 30000); // Auto-save every 30 seconds

  return () => clearTimeout(timer);
}, [formData]);
```

## Troubleshooting

### Footer Overlaps Content
- Make sure ScrollViews have bottom padding
- Use `FORM_SCROLL_BOTTOM_PADDING` constant
- Check SafeAreaView edges are set correctly

### Buttons Not Working
- Check `isSaving` state is updating correctly
- Verify handlers are passed correctly
- Check for disabled states

### Completion Not Updating
- Ensure `completion` prop is reactive
- Verify `useFormCompletion` hook is working
- Check form data is updating

## Related Files

- `FormFooter.tsx` - Component implementation
- `constants.ts` - Layout constants
- `useFormCompletion.ts` - Completion tracking hook
- `types.ts` - TypeScript types

## Related Documentation

- `FOOTER_LAYOUT_FIXES.md` - Implementation details
- `PROGRESS_BAR_PARITY.md` - Progress tracking