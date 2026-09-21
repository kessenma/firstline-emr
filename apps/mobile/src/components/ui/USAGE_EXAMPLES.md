# UI Components Usage Examples

This guide shows how to use the newly created mobile UI components that match the web API.

## Input & Label

```tsx
import { Input, Label } from '@/components/ui';
import { View } from 'react-native';

function MyForm() {
  const [email, setEmail] = useState('');

  return (
    <View>
      <Label required>Email Address</Label>
      <Input
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
    </View>
  );
}
```

### Input with Error State

```tsx
<View>
  <Label>Password</Label>
  <Input
    placeholder="Enter password"
    secureTextEntry
    error={!!errorMessage}
  />
  {errorMessage && (
    <Text style={{ color: colors.error, fontSize: 12 }}>
      {errorMessage}
    </Text>
  )}
</View>
```

### Disabled Input

```tsx
<View>
  <Label disabled>Username</Label>
  <Input
    value="john_doe"
    disabled
  />
</View>
```

## Dialog System

### Basic Dialog

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui';
import { Button } from '@/components/ui';

function MyComponent() {
  return (
    <Dialog>
      <DialogTrigger>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <DialogClose>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Controlled Dialog

```tsx
function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onPress={() => setOpen(true)}>
        Show Dialog
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md" scrollable>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your preferences
            </DialogDescription>
          </DialogHeader>
          
          {/* Your content here */}
          
          <DialogFooter>
            <Button onPress={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Dialog Sizes

```tsx
// Small dialog
<DialogContent size="sm">...</DialogContent>

// Medium dialog (default)
<DialogContent size="md">...</DialogContent>

// Large dialog
<DialogContent size="lg">...</DialogContent>
```

### Non-scrollable Dialog with No Padding

```tsx
<DialogContent scrollable={false} noPadding>
  <View style={{ padding: 16 }}>
    {/* Custom layout */}
  </View>
</DialogContent>
```

### Hide Close Button

```tsx
<DialogContent hideClose>
  {/* Content without close button */}
</DialogContent>
```

## Badge

### Basic Badge

```tsx
import { Badge } from '@/components/ui';

function MyComponent() {
  return (
    <Badge>New</Badge>
  );
}
```

### Badge Variants

```tsx
// Default (primary color)
<Badge variant="default">Default</Badge>

// Secondary
<Badge variant="secondary">Secondary</Badge>

// Destructive/Error
<Badge variant="destructive">Error</Badge>

// Success
<Badge variant="success">Success</Badge>

// Warning
<Badge variant="warning">Warning</Badge>

// Info
<Badge variant="info">Info</Badge>

// Outline
<Badge variant="outline">Outline</Badge>
```

### Badge in Use

```tsx
import { View, Text } from 'react-native';
import { Badge } from '@/components/ui';

function UserCard() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text>John Doe</Text>
      <Badge variant="success" style={{ marginLeft: 8 }}>
        Active
      </Badge>
    </View>
  );
}
```

## ScrollArea

### Basic Vertical Scroll

```tsx
import { ScrollArea } from '@/components/ui';

function MyList() {
  return (
    <ScrollArea style={{ height: 300 }}>
      {items.map(item => (
        <View key={item.id}>
          <Text>{item.name}</Text>
        </View>
      ))}
    </ScrollArea>
  );
}
```

### Horizontal Scroll

```tsx
<ScrollArea orientation="horizontal" style={{ height: 100 }}>
  <View style={{ flexDirection: 'row' }}>
    {items.map(item => (
      <View key={item.id} style={{ width: 100, marginRight: 8 }}>
        <Text>{item.name}</Text>
      </View>
    ))}
  </View>
</ScrollArea>
```

### Custom Indicators

```tsx
<ScrollArea
  showsVerticalScrollIndicator={false}
  showsHorizontalScrollIndicator={false}
>
  {/* Content */}
</ScrollArea>
```

## useToast Hook

### Setup

First, wrap your app with the ToastProvider:

```tsx
import { ToastProvider } from '@/hooks/useToast';

function App() {
  return (
    <ToastProvider>
      {/* Your app content */}
    </ToastProvider>
  );
}
```

### Basic Usage

```tsx
import { useToast } from '@/hooks/useToast';

function MyComponent() {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: 'Success!',
      description: 'Your changes have been saved.',
      variant: 'success',
    });
  };

  return (
    <Button onPress={handleSuccess}>
      Save Changes
    </Button>
  );
}
```

### Toast Variants

```tsx
// Default toast
toast({
  title: 'Notification',
  description: 'Something happened',
  variant: 'default',
});

// Success toast
toast({
  title: 'Success!',
  description: 'Operation completed successfully',
  variant: 'success',
});

// Error toast
toast({
  title: 'Error',
  description: 'Something went wrong',
  variant: 'error',
});

// Destructive toast (same as error)
toast({
  title: 'Deleted',
  description: 'Item has been removed',
  variant: 'destructive',
});

// Info toast
toast({
  title: 'Info',
  description: 'Here is some information',
  variant: 'info',
});
```

### Toast with Custom Duration

```tsx
// Short duration (2 seconds)
toast({
  title: 'Quick message',
  variant: 'default',
  duration: 2000,
});

// Long duration (10 seconds)
toast({
  title: 'Important message',
  description: 'Please read carefully',
  variant: 'info',
  duration: 10000,
});

// No auto-dismiss (set duration to 0)
toast({
  title: 'Persistent message',
  variant: 'default',
  duration: 0,
});
```

### Title Only Toast

```tsx
toast({
  title: 'Copied to clipboard',
  variant: 'success',
});
```

## Complete Form Example

```tsx
import { View, StyleSheet } from 'react-native';
import { Input, Label, Button, Dialog, DialogContent, DialogHeader, DialogTitle, useToast } from '@/components/ui';
import { useState } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'error',
      });
      return;
    }

    // Submit logic here
    toast({
      title: 'Success!',
      description: 'You have been logged in',
      variant: 'success',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Label required>Email</Label>
        <Input
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.field}>
        <Label required>Password</Label>
        <Input
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <Button onPress={handleSubmit} style={styles.button}>
        Login
      </Button>

      <Button 
        variant="ghost" 
        onPress={() => setShowDialog(true)}
      >
        Forgot Password?
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <View>
            <Label>Email Address</Label>
            <Input
              placeholder="Enter your email"
              keyboardType="email-address"
            />
          </View>
          <Button onPress={() => setShowDialog(false)}>
            Send Reset Link
          </Button>
        </DialogContent>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});
```

## Status Card with Badge Example

```tsx
import { Card, CardHeader, CardTitle, CardContent, Badge, ScrollArea } from '@/components/ui';
import { View, Text } from 'react-native';

function PatientCard({ patient }) {
  return (
    <Card>
      <CardHeader>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <CardTitle>{patient.name}</CardTitle>
          <Badge variant={patient.status === 'active' ? 'success' : 'secondary'}>
            {patient.status}
          </Badge>
        </View>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight: 200 }}>
          <Text>Age: {patient.age}</Text>
          <Text>Condition: {patient.condition}</Text>
          {/* More details */}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

## Notes

- All components support theming via `useThemeColors` hook
- Components match the web API where possible for consistency
- Dialog uses React Native's Modal under the hood
- Toast notifications appear at the bottom of the screen
- All components are TypeScript-ready with proper type definitions
- Refs are supported via `forwardRef` for advanced use cases