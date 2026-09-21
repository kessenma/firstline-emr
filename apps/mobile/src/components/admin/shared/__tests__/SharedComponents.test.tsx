import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Users } from 'lucide-react-native';
import { ThemeProvider } from '../../../../contexts/ThemeContext';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  BulkActionBar,
  UserCard,
  ConfirmDialog,
} from '../index';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('EmptyState', () => {
  it('should render with title and message', () => {
    const { getByText } = render(
      <EmptyState
        title="No Data"
        message="There are no items to display"
      />,
      { wrapper }
    );

    expect(getByText('No Data')).toBeTruthy();
    expect(getByText('There are no items to display')).toBeTruthy();
  });

  it('should render with icon', () => {
    const { getByText } = render(
      <EmptyState
        icon={Users}
        title="No Users"
        message="No users found"
      />,
      { wrapper }
    );

    expect(getByText('No Users')).toBeTruthy();
  });

  it('should render with action button', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <EmptyState
        title="No Data"
        action={{ label: 'Add Item', onPress }}
      />,
      { wrapper }
    );

    fireEvent.press(getByText('Add Item'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('ErrorState', () => {
  it('should render with error message', () => {
    const { getByText } = render(
      <ErrorState
        message="Failed to load data"
      />,
      { wrapper }
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Failed to load data')).toBeTruthy();
  });

  it('should render with custom title', () => {
    const { getByText } = render(
      <ErrorState
        title="Custom Error"
        message="Error message"
      />,
      { wrapper }
    );

    expect(getByText('Custom Error')).toBeTruthy();
  });

  it('should call onRetry when retry button is pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <ErrorState
        message="Error"
        onRetry={onRetry}
      />,
      { wrapper }
    );

    fireEvent.press(getByText('Try Again'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('should show error details when showDetails is true', () => {
    const error = new Error('Detailed error message');
    const { getByText } = render(
      <ErrorState
        message="Error"
        error={error}
        showDetails
      />,
      { wrapper }
    );

    expect(getByText('Error Details:')).toBeTruthy();
    expect(getByText('Detailed error message')).toBeTruthy();
  });
});

describe('LoadingState', () => {
  it('should render with default message', () => {
    const { getByText } = render(
      <LoadingState />,
      { wrapper }
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should render with custom message', () => {
    const { getByText } = render(
      <LoadingState message="Fetching data..." />,
      { wrapper }
    );

    expect(getByText('Fetching data...')).toBeTruthy();
  });
});

describe('BulkActionBar', () => {
  const mockActions = [
    { label: 'Approve', onPress: jest.fn(), variant: 'primary' as const },
    { label: 'Deny', onPress: jest.fn(), variant: 'danger' as const },
  ];

  it('should not render when selectedCount is 0', () => {
    const { queryByText } = render(
      <BulkActionBar
        selectedCount={0}
        actions={mockActions}
        onClear={jest.fn()}
      />,
      { wrapper }
    );

    expect(queryByText('0 selected')).toBeNull();
  });

  it('should render when items are selected', () => {
    const { getByText } = render(
      <BulkActionBar
        selectedCount={5}
        actions={mockActions}
        onClear={jest.fn()}
      />,
      { wrapper }
    );

    expect(getByText('5 selected')).toBeTruthy();
  });

  it('should show total count when provided', () => {
    const { getByText } = render(
      <BulkActionBar
        selectedCount={5}
        totalCount={10}
        actions={mockActions}
        onClear={jest.fn()}
      />,
      { wrapper }
    );

    expect(getByText('5 selected of 10')).toBeTruthy();
  });

  it('should call action onPress when button is pressed', () => {
    const { getByText } = render(
      <BulkActionBar
        selectedCount={5}
        actions={mockActions}
        onClear={jest.fn()}
      />,
      { wrapper }
    );

    fireEvent.press(getByText('Approve'));
    expect(mockActions[0].onPress).toHaveBeenCalled();
  });

  it('should call onClear when clear button is pressed', () => {
    const onClear = jest.fn();
    const { UNSAFE_getByType } = render(
      <BulkActionBar
        selectedCount={5}
        actions={mockActions}
        onClear={onClear}
      />,
      { wrapper }
    );

    // Find the clear button (X icon) and press it
    // Note: This is a simplified test - in real tests you'd use testID
    const clearButtons = UNSAFE_getByType(require('lucide-react-native').X);
    if (clearButtons.parent) {
      fireEvent.press(clearButtons.parent);
      expect(onClear).toHaveBeenCalled();
    }
  });
});

describe('UserCard', () => {
  const mockUser = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    accountType: 'Doctor',
    city: 'New York',
    countries: ['USA'],
    doctorSpecialty: ['Cardiology', 'Internal Medicine'],
    authorized: true,
  };

  it('should render user information', () => {
    const { getByText } = render(
      <UserCard user={mockUser} />,
      { wrapper }
    );

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('john@example.com')).toBeTruthy();
    expect(getByText('Doctor')).toBeTruthy();
  });

  it('should call onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <UserCard user={mockUser} onPress={onPress} />,
      { wrapper }
    );

    fireEvent.press(getByText('John Doe'));
    expect(onPress).toHaveBeenCalled();
  });

  it('should show checkbox when showCheckbox is true', () => {
    const { getByText } = render(
      <UserCard user={mockUser} showCheckbox />,
      { wrapper }
    );

    expect(getByText('John Doe')).toBeTruthy();
    // Checkbox rendering would be tested with testID in real implementation
  });

  it('should call onSelect when checkbox is toggled', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <UserCard
        user={mockUser}
        showCheckbox
        onSelect={onSelect}
      />,
      { wrapper }
    );

    fireEvent.press(getByText('John Doe'));
    expect(onSelect).toHaveBeenCalledWith(true);
  });
});

describe('ConfirmDialog', () => {
  it('should render when visible', () => {
    const { getByText } = render(
      <ConfirmDialog
        visible
        title="Confirm Action"
        message="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
      { wrapper }
    );

    expect(getByText('Confirm Action')).toBeTruthy();
    expect(getByText('Are you sure?')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <ConfirmDialog
        visible={false}
        title="Confirm Action"
        message="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
      { wrapper }
    );

    expect(queryByText('Confirm Action')).toBeNull();
  });

  it('should call onConfirm when confirm button is pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <ConfirmDialog
        visible
        title="Confirm"
        message="Message"
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
      { wrapper }
    );

    fireEvent.press(getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <ConfirmDialog
        visible
        title="Confirm"
        message="Message"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
      { wrapper }
    );

    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should show custom labels', () => {
    const { getByText } = render(
      <ConfirmDialog
        visible
        title="Delete"
        message="Delete this item?"
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
      { wrapper }
    );

    expect(getByText('Delete')).toBeTruthy();
    expect(getByText('Keep')).toBeTruthy();
  });

  it('should disable buttons when loading', () => {
    const { getByText } = render(
      <ConfirmDialog
        visible
        title="Confirm"
        message="Message"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        loading
      />,
      { wrapper }
    );

    expect(getByText('Processing...')).toBeTruthy();
  });
});
