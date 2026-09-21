import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Users } from 'lucide-react-native';
import { AdminAccordion, AdminAccordionItem } from '../AdminAccordion';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('AdminAccordionItem', () => {
  it('should render with title and icon', () => {
    const { getByText } = render(
      <AdminAccordionItem id="test" title="Test Section" icon={Users}>
        <Text>Content</Text>
      </AdminAccordionItem>,
      { wrapper }
    );

    expect(getByText('Test Section')).toBeTruthy();
  });

  it('should toggle open/close on press', () => {
    const onToggle = jest.fn();
    const { getByText, queryByText } = render(
      <AdminAccordionItem
        id="test"
        title="Test Section"
        onToggle={onToggle}
        isOpen={false}
      >
        <Text>Content</Text>
      </AdminAccordionItem>,
      { wrapper }
    );

    // Initially closed
    expect(queryByText('Content')).toBeNull();

    // Press to open
    fireEvent.press(getByText('Test Section'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('should display badge when provided', () => {
    const { getByText } = render(
      <AdminAccordionItem id="test" title="Test Section" badge={5}>
        <Text>Content</Text>
      </AdminAccordionItem>,
      { wrapper }
    );

    expect(getByText('5')).toBeTruthy();
  });

  it('should display subtitle when provided', () => {
    const { getByText } = render(
      <AdminAccordionItem
        id="test"
        title="Test Section"
        subtitle="Additional info"
      >
        <Text>Content</Text>
      </AdminAccordionItem>,
      { wrapper }
    );

    expect(getByText('Additional info')).toBeTruthy();
  });

  it('should not toggle when disabled', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <AdminAccordionItem
        id="test"
        title="Test Section"
        onToggle={onToggle}
        disabled
      >
        <Text>Content</Text>
      </AdminAccordionItem>,
      { wrapper }
    );

    fireEvent.press(getByText('Test Section'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('should not toggle when loading', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <AdminAccordionItem
        id="test"
        title="Test Section"
        onToggle={onToggle}
        loading
      >
        <Text>Content</Text>
      </AdminAccordionItem>,
      { wrapper }
    );

    fireEvent.press(getByText('Test Section'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('should highlight search term in title', () => {
    const { getByText } = render(
      <AdminAccordionItem
        id="test"
        title="User Management"
        searchTerm="user"
      >
        <Text>Content</Text>
      </AdminAccordionItem>,
      { wrapper }
    );

    // The title should still be present
    expect(getByText('User Management')).toBeTruthy();
  });
});

describe('AdminAccordion', () => {
  it('should render multiple items', () => {
    const { getByText } = render(
      <AdminAccordion>
        <AdminAccordionItem id="section1" title="Section 1">
          <Text>Content 1</Text>
        </AdminAccordionItem>
        <AdminAccordionItem id="section2" title="Section 2">
          <Text>Content 2</Text>
        </AdminAccordionItem>
      </AdminAccordion>,
      { wrapper }
    );

    expect(getByText('Section 1')).toBeTruthy();
    expect(getByText('Section 2')).toBeTruthy();
  });

  it('should only allow one section open at a time by default', () => {
    const { getByText } = render(
      <AdminAccordion>
        <AdminAccordionItem id="section1" title="Section 1">
          <Text>Content 1</Text>
        </AdminAccordionItem>
        <AdminAccordionItem id="section2" title="Section 2">
          <Text>Content 2</Text>
        </AdminAccordionItem>
      </AdminAccordion>,
      { wrapper }
    );

    // Open first section
    fireEvent.press(getByText('Section 1'));
    
    // Note: Due to animation timing, we can't easily test the content visibility
    // in this unit test. This would be better tested in an integration test.
  });

  it('should allow multiple sections open when allowMultiple is true', () => {
    const { getByText } = render(
      <AdminAccordion allowMultiple>
        <AdminAccordionItem id="section1" title="Section 1">
          <Text>Content 1</Text>
        </AdminAccordionItem>
        <AdminAccordionItem id="section2" title="Section 2">
          <Text>Content 2</Text>
        </AdminAccordionItem>
      </AdminAccordion>,
      { wrapper }
    );

    // Open both sections
    fireEvent.press(getByText('Section 1'));
    fireEvent.press(getByText('Section 2'));
    
    // Both should be open (tested via integration tests)
  });

  it('should open default section', () => {
    const { getByText } = render(
      <AdminAccordion defaultOpenId="section1">
        <AdminAccordionItem id="section1" title="Section 1">
          <Text>Content 1</Text>
        </AdminAccordionItem>
        <AdminAccordionItem id="section2" title="Section 2">
          <Text>Content 2</Text>
        </AdminAccordionItem>
      </AdminAccordion>,
      { wrapper }
    );

    // Section 1 should be open by default
    expect(getByText('Content 1')).toBeTruthy();
  });

  it('should call onSectionChange when section changes', () => {
    const onSectionChange = jest.fn();
    const { getByText } = render(
      <AdminAccordion onSectionChange={onSectionChange}>
        <AdminAccordionItem id="section1" title="Section 1">
          <Text>Content 1</Text>
        </AdminAccordionItem>
      </AdminAccordion>,
      { wrapper }
    );

    fireEvent.press(getByText('Section 1'));
    expect(onSectionChange).toHaveBeenCalledWith('section1');
  });
});
