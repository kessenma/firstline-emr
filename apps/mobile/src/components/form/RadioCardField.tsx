// apps/mobile/src/components/form/RadioCardField.tsx
// Wrapper for RadioCardSelector to match the form field pattern

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { RadioCardSelector } from './RadioCardSelector';

interface RadioCardOption {
  label: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface RadioCardFieldProps {
  label?: string;
  options: RadioCardOption[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  direction?: 'vertical' | 'horizontal';
  size?: 'small' | 'medium' | 'large';
  /** Show only this many options initially, with a "Show more" toggle for the rest */
  collapsedCount?: number;
  /** Number of columns for a grid layout */
  columns?: number;
  /** Auto-fit columns: short labels share a row, long labels take full width */
  autoFitColumns?: boolean;
}

/**
 * RadioCardField - A wrapper around RadioCardSelector for form consistency
 *
 * @example
 * ```tsx
 * <RadioCardField
 *   label="Gender"
 *   value={formData.gender}
 *   onChange={(value) => onFieldChange('gender', value)}
 *   options={[
 *     { label: 'Male', value: 'Male' },
 *     { label: 'Female', value: 'Female' },
 *   ]}
 *   required
 *   error={errors.gender}
 * />
 * ```
 */
export const RadioCardField: React.FC<RadioCardFieldProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  required = false,
  containerStyle,
  direction = 'vertical',
  size = 'medium',
  collapsedCount,
  columns,
  autoFitColumns,
}) => {
  // Convert undefined to null for RadioCardSelector
  const normalizedValue = value === undefined ? null : value;

  return (
    <RadioCardSelector
      label={label}
      options={options}
      value={normalizedValue}
      onChange={onChange}
      error={error}
      helperText={helperText}
      required={required}
      containerStyle={containerStyle}
      direction={direction}
      size={size}
      collapsedCount={collapsedCount}
      columns={columns}
      autoFitColumns={autoFitColumns}
    />
  );
};
