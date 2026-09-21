// apps/mobile/src/components/form/FormComponentsExample.tsx
// Comprehensive example showing usage of all form components

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { User, Mail, Phone } from 'lucide-react-native';
import {
  TextInputField,
  DatePickerField,
  SwitchField,
  CheckboxField,
  CheckboxGroup,
  RadioCardSelector,
  RadioGroup,
  SingleSelectField,
  MultiSelectField,
  SelectOption,
} from './index';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { palette } from '../../utils/colors';

export const FormComponentsExample: React.FC = () => {
  const colors = useThemeColors();
  // Text Input States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Date Picker States
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);

  // Switch States
  const [notifications, setNotifications] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(true);

  // Checkbox States
  const [terms, setTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Radio States
  const [gender, setGender] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);

  // Select States
  const [country, setCountry] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  // Form Errors (demo)
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Options Data
  const countryOptions: SelectOption[] = [
    { label: 'United States', value: 'US' },
    { label: 'Canada', value: 'CA' },
    { label: 'United Kingdom', value: 'UK' },
    { label: 'Australia', value: 'AU' },
    { label: 'Germany', value: 'DE' },
    { label: 'France', value: 'FR' },
    { label: 'Japan', value: 'JP' },
    { label: 'Brazil', value: 'BR' },
    { label: 'India', value: 'IN' },
    { label: 'Mexico', value: 'MX' },
  ];

  const languageOptions: SelectOption[] = [
    { label: 'English', value: 'en' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'German', value: 'de' },
    { label: 'Chinese', value: 'zh' },
    { label: 'Japanese', value: 'ja' },
    { label: 'Arabic', value: 'ar' },
    { label: 'Hindi', value: 'hi' },
  ];

  const specialtyOptions: SelectOption[] = [
    {
      label: 'Cardiology',
      value: 'cardiology',
      description: 'Heart and cardiovascular system',
    },
    {
      label: 'Neurology',
      value: 'neurology',
      description: 'Brain and nervous system',
    },
    {
      label: 'Orthopedics',
      value: 'orthopedics',
      description: 'Bones and muscles',
    },
    {
      label: 'Pediatrics',
      value: 'pediatrics',
      description: "Children's health",
    },
    {
      label: 'Dermatology',
      value: 'dermatology',
      description: 'Skin conditions',
    },
  ];

  const serviceOptions = [
    {
      label: 'Telemedicine',
      value: 'telemedicine',
      description: 'Virtual consultations',
    },
    { label: 'In-Person Visits', value: 'in-person' },
    {
      label: 'Emergency Care',
      value: 'emergency',
      description: '24/7 urgent care',
    },
    { label: 'Lab Tests', value: 'lab-tests' },
  ];

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'non-binary' },
    { label: 'Prefer not to say', value: 'not-specified' },
  ];

  const priorityOptions = [
    {
      label: 'High',
      value: 'high',
      description: 'Urgent attention required',
      icon: (
        <View
          style={[styles.priorityDot, { backgroundColor: palette.red[600] }]}
        />
      ),
    },
    {
      label: 'Medium',
      value: 'medium',
      description: 'Normal priority',
      icon: (
        <View
          style={[styles.priorityDot, { backgroundColor: palette.orange[600] }]}
        />
      ),
    },
    {
      label: 'Low',
      value: 'low',
      description: 'Can wait if needed',
      icon: (
        <View
          style={[styles.priorityDot, { backgroundColor: palette.green[600] }]}
        />
      ),
    },
  ];

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    // Validation
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password.trim()) newErrors.password = 'Password is required';
    if (!birthDate) newErrors.birthDate = 'Date of birth is required';
    if (!terms) newErrors.terms = 'You must accept the terms and conditions';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      console.log('Form submitted successfully!');
      console.log({
        name,
        email,
        phone,
        birthDate,
        appointmentDate,
        notifications,
        emailUpdates,
        terms,
        newsletter,
        selectedServices,
        gender,
        priority,
        country,
        languages,
        specialties,
      });
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setBirthDate(null);
    setAppointmentDate(null);
    setNotifications(false);
    setEmailUpdates(true);
    setTerms(false);
    setNewsletter(false);
    setSelectedServices([]);
    setGender(null);
    setPriority(null);
    setCountry(null);
    setLanguages([]);
    setSpecialties([]);
    setErrors({});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Form Components Demo
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Comprehensive examples of all available form components
        </Text>

        {/* Text Input Examples */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, borderBottomColor: colors.divider },
            ]}
          >
            Text Inputs
          </Text>

          <TextInputField
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
            required
            error={errors.name}
            leftIcon={<User size={20} color={colors.textSecondary} />}
          />

          <TextInputField
            label="Email Address"
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            required
            error={errors.email}
            leftIcon={<Mail size={20} color={colors.textSecondary} />}
          />

          <TextInputField
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            isPassword
            required
            error={errors.password}
            helperText="Must be at least 8 characters"
          />

          <TextInputField
            label="Phone Number"
            placeholder="+1 (555) 123-4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon={<Phone size={20} color={colors.textSecondary} />}
          />

          <TextInputField
            label="Bio"
            placeholder="Tell us about yourself"
            value=""
            multiline
            numberOfLines={4}
            helperText="Maximum 500 characters"
          />
        </View>

        {/* Date Picker Examples */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, borderBottomColor: colors.divider },
            ]}
          >
            Date Pickers
          </Text>

          <DatePickerField
            label="Date of Birth"
            value={birthDate}
            onChange={setBirthDate}
            type="past"
            required
            error={errors.birthDate}
            placeholder="Select your birth date"
          />

          <DatePickerField
            label="Appointment Date"
            value={appointmentDate}
            onChange={setAppointmentDate}
            type="future"
            placeholder="Select appointment date"
            helperText="Choose a date for your next appointment"
          />
        </View>

        {/* Switch Examples */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, borderBottomColor: colors.divider },
            ]}
          >
            Switches
          </Text>

          <SwitchField
            label="Push Notifications"
            description="Receive push notifications for important updates"
            value={notifications}
            onValueChange={setNotifications}
          />

          <SwitchField
            label="Email Updates"
            description="Get weekly email updates about your account"
            value={emailUpdates}
            onValueChange={setEmailUpdates}
          />
        </View>

        {/* Checkbox Examples */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, borderBottomColor: colors.divider },
            ]}
          >
            Checkboxes
          </Text>

          <CheckboxField
            label="I agree to the terms and conditions"
            value={terms}
            onValueChange={setTerms}
            error={errors.terms}
          />

          <CheckboxField
            label="Subscribe to newsletter"
            description="Receive monthly newsletters with health tips and updates"
            value={newsletter}
            onValueChange={setNewsletter}
          />

          <CheckboxGroup
            label="Select Services"
            options={serviceOptions}
            value={selectedServices}
            onChange={setSelectedServices}
            helperText="Choose all services you're interested in"
          />
        </View>

        {/* Radio Group Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Radio Buttons</Text>

          <RadioGroup
            label="Gender"
            options={genderOptions}
            value={gender}
            onChange={setGender}
            required
          />
        </View>

        {/* Radio Examples */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, borderBottomColor: colors.divider },
            ]}
          >
            Radio Buttons
          </Text>

          <RadioCardSelector
            label="Priority Level"
            options={priorityOptions}
            value={priority}
            onChange={setPriority}
            required
            helperText="Select the urgency level for your case"
          />
        </View>

        {/* Single Select Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Single Select</Text>

          <SingleSelectField
            label="Country"
            placeholder="Select your country"
            options={countryOptions}
            value={country || ''}
            onChange={setCountry}
            searchable
            required
            helperText="Search and select your country"
          />
        </View>

        {/* Multi Select Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Multi Select</Text>

          <MultiSelectField
            label="Languages"
            placeholder="Select languages you speak"
            options={languageOptions}
            value={languages}
            onChange={setLanguages}
            searchable
            helperText="You can select multiple languages"
          />

          <MultiSelectField
            label="Medical Specialties"
            placeholder="Select specialties"
            options={specialtyOptions}
            value={specialties}
            onChange={setSpecialties}
            maxSelections={3}
            searchable
            required
            helperText="Select up to 3 specialties"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.surface }]}>
              Submit Form
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              { borderWidth: 2, borderColor: colors.primary },
            ]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              Reset Form
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form State Display (for debugging) */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, borderBottomColor: colors.divider },
            ]}
          >
            Form State (Debug)
          </Text>
          <View
            style={[
              styles.debugBox,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Name: {name || '(empty)'}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Email: {email || '(empty)'}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Birth Date: {birthDate ? birthDate.toDateString() : '(not set)'}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Notifications: {notifications ? 'Enabled' : 'Disabled'}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Terms Accepted: {terms ? 'Yes' : 'No'}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Gender: {gender || '(not selected)'}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Priority: {priority || '(not selected)'}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Country: {country || '(not selected)'}
            </Text>
            <Text style={[styles.debugText, { color: colors.textSecondary }]}>
              Languages:{' '}
              {languages.length > 0 ? languages.join(', ') : '(none)'}
            </Text>
            <Text style={styles.debugText}>
              Services:{' '}
              {selectedServices.length > 0
                ? selectedServices.join(', ')
                : '(none)'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.massive,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  debugBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  debugText: {
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
  },
});

export default FormComponentsExample;
