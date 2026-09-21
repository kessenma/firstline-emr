# Form Components Library

A comprehensive collection of reusable, accessible form components for React Native applications.

## Table of Contents

- [Installation](#installation)
- [Components](#components)
  - [TextInputField](#textinputfield)
  - [DatePickerField](#datepickerfield)
  - [SwitchField](#switchfield)
  - [CheckboxField](#checkboxfield)
  - [RadioCardSelector](#radiocardselector)
  - [SelectField](#selectfield)
- [Usage Examples](#usage-examples)
- [Styling](#styling)
- [Accessibility](#accessibility)
- [Best Practices](#best-practices)

## Installation

All components are built with React Native and require the following dependencies:

```bash
npm install lucide-react-native date-fns @react-native-community/datetimepicker
```

## Components

### TextInputField

A text input component with label, error handling, and icon support.

**Props:**

```typescript
interface TextInputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  variant?: 'default' | 'outlined' | 'filled';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
}
```

**Example:**

```tsx
import { TextInputField } from './components/form';
import { User } from 'lucide-react-native';

<TextInputField
  label="Full Name"
  placeholder="Enter your name"
  value={name}
  onChangeText={setName}
  required
  error={errors.name}
  leftIcon={<User size={20} color="#666" />}
/>

<TextInputField
  label="Password"
  placeholder="Enter password"
  value={password}
  onChangeText={setPassword}
  isPassword
  required
  helperText="Must be at least 8 characters"
/>
```

**Features:**
- Built-in password toggle (eye icon)
- Left/right icon support
- Error state with custom message
- Helper text
- Required field indicator
- Multiple variants (outlined, filled)

---

### DatePickerField

A date/time picker component with native platform support.

**Props:**

```typescript
interface DatePickerFieldProps {
  label?: string;
  value?: Date | null;
  onChange?: (date: Date) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  type?: 'future' | 'past' | 'any';
}
```

**Example:**

```tsx
import { DatePickerField } from './components/form';

<DatePickerField
  label="Date of Birth"
  value={birthDate}
  onChange={setBirthDate}
  type="past"
  placeholder="Select your birth date"
  required
/>

<DatePickerField
  label="Appointment Date"
  value={appointmentDate}
  onChange={setAppointmentDate}
  type="future"
  mode="datetime"
  minimumDate={new Date()}
/>
```

**Features:**
- iOS modal picker with custom header
- Android native date picker
- Past/future date constraints
- Date, time, or datetime modes
- Min/max date constraints
- Clear button
- Formatted date display

---

### SwitchField

A toggle switch component with label and description.

**Props:**

```typescript
interface SwitchFieldProps {
  label?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelPosition?: 'left' | 'right';
  description?: string;
}
```

**Example:**

```tsx
import { SwitchField } from './components/form';

<SwitchField
  label="Push Notifications"
  description="Receive notifications for important updates"
  value={notifications}
  onValueChange={setNotifications}
/>
```

**Features:**
- Native switch component
- Label positioning (left/right)
- Description text support
- Disabled state
- Error handling

---

### CheckboxField

Checkbox component with label, description, and group support.

**Props:**

```typescript
interface CheckboxFieldProps {
  label?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  description?: string;
  size?: 'small' | 'medium' | 'large';
}

interface CheckboxGroupProps {
  label?: string;
  options: Array<{
    label: string;
    value: string;
    description?: string;
    disabled?: boolean;
  }>;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  required?: boolean;
}
```

**Example:**

```tsx
import { CheckboxField, CheckboxGroup } from './components/form';

// Single Checkbox
<CheckboxField
  label="I accept the terms and conditions"
  value={terms}
  onValueChange={setTerms}
  required
/>

// Checkbox Group
<CheckboxGroup
  label="Select Services"
  options={[
    { label: 'Telemedicine', value: 'telemedicine' },
    { label: 'In-Person', value: 'in-person' },
    { label: 'Emergency', value: 'emergency' },
  ]}
  value={selectedServices}
  onChange={setSelectedServices}
/>
```

**Features:**
- Custom checkmark icon
- Multiple sizes
- Group selection support
- Individual option descriptions
- Disabled state per option

---

### RadioCardSelector

Radio button component with card-based UI and icon support.

**Props:**

```typescript
interface RadioCardSelectorProps {
  label?: string;
  options: Array<{
    label: string;
    value: string;
    description?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  direction?: 'vertical' | 'horizontal';
  size?: 'small' | 'medium' | 'large';
}

// Also includes RadioGroup for simple radio buttons
```

**Example:**

```tsx
import { RadioCardSelector, RadioGroup } from './components/form';

// Card-based Radio
<RadioCardSelector
  label="Priority Level"
  options={[
    {
      label: 'High',
      value: 'high',
      description: 'Urgent attention required',
      icon: <AlertCircle size={20} color="red" />,
    },
    {
      label: 'Medium',
      value: 'medium',
      description: 'Normal priority',
    },
  ]}
  value={priority}
  onChange={setPriority}
/>

// Simple Radio Group
<RadioGroup
  label="Gender"
  options={[
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
  ]}
  value={gender}
  onChange={setGender}
/>
```

**Features:**
- Card-based visual design
- Icon support
- Option descriptions
- Horizontal/vertical layouts
- Simple radio group alternative
- Size variations

---

### SelectField

Single and multi-select dropdown components with search.

**Props:**

```typescript
interface SelectOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

interface SingleSelectFieldProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

interface MultiSelectFieldProps {
  // ... similar to SingleSelect
  value: string[];
  onChange: (value: string[]) => void;
  maxSelections?: number;
}
```

**Example:**

```tsx
import { SingleSelectField, MultiSelectField } from './components/form';

// Single Select
<SingleSelectField
  label="Country"
  placeholder="Select your country"
  options={countryOptions}
  value={country}
  onChange={setCountry}
  searchable
  required
/>

// Multi Select
<MultiSelectField
  label="Languages"
  placeholder="Select languages"
  options={languageOptions}
  value={languages}
  onChange={setLanguages}
  searchable
  maxSelections={3}
  helperText="Select up to 3 languages"
/>
```

**Features:**
- Modal-based selection UI
- Search/filter functionality
- Selected items displayed as tags (multi)
- Max selections limit (multi)
- Clear button
- Option descriptions
- Disabled options
- Empty state handling

---

## Usage Examples

### Complete Form Example

```tsx
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import {
  TextInputField,
  DatePickerField,
  SwitchField,
  CheckboxField,
  RadioCardSelector,
  SingleSelectField,
  MultiSelectField,
} from './components/form';

export function PatientForm() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!dob) newErrors.dob = 'Date of birth is required';
    if (!gender) newErrors.gender = 'Gender is required';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      // Submit form
      console.log({ name, dob, notifications, gender, country, languages });
    }
  };

  return (
    <ScrollView>
      <TextInputField
        label="Full Name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        required
      />

      <DatePickerField
        label="Date of Birth"
        value={dob}
        onChange={setDob}
        type="past"
        error={errors.dob}
        required
      />

      <SwitchField
        label="Enable Notifications"
        value={notifications}
        onValueChange={setNotifications}
      />

      <RadioCardSelector
        label="Gender"
        options={[
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
        ]}
        value={gender}
        onChange={setGender}
        error={errors.gender}
        required
      />

      <SingleSelectField
        label="Country"
        options={countryOptions}
        value={country}
        onChange={setCountry}
        searchable
      />

      <MultiSelectField
        label="Languages"
        options={languageOptions}
        value={languages}
        onChange={setLanguages}
        searchable
      />

      <TouchableOpacity onPress={handleSubmit}>
        <Text>Submit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

## Styling

All components use the app's theme system:

```typescript
import { lightTheme, spacing, borderRadius, typography } from '../../utils/theme';
import { palette } from '../../utils/colors';
```

### Custom Styling

Override styles using the `containerStyle` and `inputStyle` props:

```tsx
<TextInputField
  label="Custom Styled"
  containerStyle={{ marginBottom: 20 }}
  inputStyle={{ fontSize: 18 }}
/>
```

### Theme Customization

Modify the theme files to change the global appearance:

- `utils/theme.ts` - Spacing, typography, borders, shadows
- `utils/colors.ts` - Color palette

## Accessibility

All components are built with accessibility in mind:

- ✅ Screen reader support
- ✅ Semantic labels
- ✅ Touch target sizes (minimum 44x44)
- ✅ Color contrast ratios (WCAG AA)
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Error announcements

### Accessibility Props

```tsx
<TextInputField
  label="Email"
  accessibilityLabel="Email address input"
  accessibilityHint="Enter your email address"
/>
```

## Best Practices

### 1. Always Provide Labels

```tsx
// ✅ Good
<TextInputField label="Email" value={email} onChangeText={setEmail} />

// ❌ Bad
<TextInputField placeholder="Email" value={email} onChangeText={setEmail} />
```

### 2. Handle Errors Properly

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

const validate = () => {
  const newErrors: Record<string, string> = {};
  if (!email) newErrors.email = 'Email is required';
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

<TextInputField
  label="Email"
  value={email}
  onChangeText={setEmail}
  error={errors.email}
  required
/>
```

### 3. Use Helper Text

```tsx
<TextInputField
  label="Password"
  value={password}
  onChangeText={setPassword}
  isPassword
  helperText="Must be at least 8 characters with one number"
/>
```

### 4. Appropriate Input Types

```tsx
<TextInputField
  label="Email"
  keyboardType="email-address"
  autoCapitalize="none"
  autoComplete="email"
/>

<TextInputField
  label="Phone"
  keyboardType="phone-pad"
/>

<TextInputField
  label="Age"
  keyboardType="numeric"
/>
```

### 5. Searchable Selects for Long Lists

```tsx
// ✅ Good for 10+ options
<SingleSelectField
  label="Country"
  options={200Countries}
  searchable
/>

// ✅ Good for < 10 options
<RadioGroup
  label="Gender"
  options={genderOptions}
/>
```

### 6. Use Multi-Select Limits

```tsx
<MultiSelectField
  label="Specialties"
  options={specialtyOptions}
  value={specialties}
  onChange={setSpecialties}
  maxSelections={3}
  helperText="Select up to 3 specialties"
/>
```

### 7. Date Constraints

```tsx
// Birth date
<DatePickerField
  label="Date of Birth"
  type="past"
  maximumDate={new Date()}
/>

// Appointment
<DatePickerField
  label="Appointment"
  type="future"
  minimumDate={new Date()}
/>
```

## Testing

Example test for TextInputField:

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { TextInputField } from './TextInputField';

describe('TextInputField', () => {
  it('renders with label', () => {
    const { getByText } = render(
      <TextInputField label="Email" value="" onChangeText={() => {}} />
    );
    expect(getByText('Email')).toBeTruthy();
  });

  it('shows error message', () => {
    const { getByText } = render(
      <TextInputField
        label="Email"
        value=""
        onChangeText={() => {}}
        error="Email is required"
      />
    );
    expect(getByText('Email is required')).toBeTruthy();
  });

  it('calls onChangeText when typing', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <TextInputField
        label="Email"
        placeholder="Enter email"
        value=""
        onChangeText={onChangeText}
      />
    );
    
    fireEvent.changeText(getByPlaceholderText('Enter email'), 'test@example.com');
    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
  });
});
```

## Troubleshooting

### DatePicker Not Showing on Android

Install the required package:

```bash
npm install @react-native-community/datetimepicker
```

### Icons Not Rendering

Ensure lucide-react-native is installed:

```bash
npm install lucide-react-native
```

### TypeScript Errors

Make sure your tsconfig.json includes:

```json
{
  "compilerOptions": {
    "jsx": "react-native",
    "lib": ["es2019"],
    "moduleResolution": "node"
  }
}
```

## Contributing

When adding new form components:

1. Follow the existing component structure
2. Include proper TypeScript types
3. Add error handling
4. Support accessibility features
5. Add to the index.ts export
6. Update this README

## License

[Your License Here]