# Mobile UI Components

This directory contains React Native UI components that match the web application's component API for consistency across platforms.

## 🎯 Overview

These components are designed to:
- **Match web API** where possible for code consistency
- **Use React Native primitives** for native performance
- **Support theming** via `useThemeColors` hook
- **Provide TypeScript types** for type safety
- **Follow web naming conventions** for easier migration

## 📦 Available Components

### Core UI Components

#### Input
Text input component matching web API.

```tsx
import { Input } from '@/components/ui';

<Input
  placeholder="Enter text"
  value={value}
  onChangeText={setValue}
  error={hasError}
  disabled={false}
/>
```

**Props:**
- `error?: boolean` - Shows error state
- `disabled?: boolean` - Disables input
- All standard `TextInputProps`

---

#### Label
Label component for form fields.

```tsx
import { Label } from '@/components/ui';

<Label required>Email Address</Label>
```

**Props:**
- `required?: boolean` - Shows asterisk (*)
- `disabled?: boolean` - Dims the label
- All standard `TextProps`

---

#### Dialog System
Modal dialog components matching web Radix UI API.

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui';

<Dialog>
  <DialogTrigger>
    <Button>Open</Button>
  </DialogTrigger>
  
  <DialogContent size="md">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <DialogClose>
        <Button>Close</Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**DialogContent Props:**
- `size?: 'sm' | 'md' | 'lg'` - Dialog size
- `scrollable?: boolean` - Enable scrolling (default: true)
- `noPadding?: boolean` - Remove padding
- `hideClose?: boolean` - Hide close button

**Controlled Mode:**
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  {/* ... */}
</Dialog>
```

---

#### Badge
Status badge component.

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success">Active</Badge>
```

**Variants:**
- `default` - Primary color
- `secondary` - Secondary color
- `destructive` - Error/danger color
- `outline` - Outlined style
- `success` - Green
- `warning` - Orange
- `info` - Blue

---

#### ScrollArea
Wrapper around ScrollView matching web API.

```tsx
import { ScrollArea } from '@/components/ui';

<ScrollArea orientation="vertical" style={{ height: 300 }}>
  {/* Scrollable content */}
</ScrollArea>
```

**Props:**
- `orientation?: 'vertical' | 'horizontal'`
- All standard `ScrollViewProps`

---

#### Card System
Already exists! Enhanced with sub-components.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    {/* Footer actions */}
  </CardFooter>
</Card>
```

---

#### Button
Already exists! Used throughout the app.

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" onPress={handlePress}>
  Click Me
</Button>
```

---

#### Accordion
Already exists! Collapsible content sections.

```tsx
import { Accordion, AccordionItem } from '@/components/ui';

<Accordion>
  <AccordionItem title="Section 1">
    Content 1
  </AccordionItem>
  <AccordionItem title="Section 2">
    Content 2
  </AccordionItem>
</Accordion>
```

---

## 🎨 Theming

All components use the `useThemeColors` hook for consistent theming:

```tsx
import { useThemeColors } from '@/contexts/ThemeContext';

const colors = useThemeColors();
// colors.primary, colors.text, colors.surface, etc.
```

## 🪝 Hooks

### useToast

Toast notification system matching web API.

**Setup:**
```tsx
import { ToastProvider } from '@/hooks/useToast';

function App() {
  return (
    <ToastProvider>
      {/* Your app */}
    </ToastProvider>
  );
}
```

**Usage:**
```tsx
import { useToast } from '@/hooks/useToast';

function MyComponent() {
  const { toast } = useToast();

  const showSuccess = () => {
    toast({
      title: 'Success!',
      description: 'Changes saved',
      variant: 'success',
      duration: 5000, // optional, defaults to 5000ms
    });
  };

  return <Button onPress={showSuccess}>Save</Button>;
}
```

**Toast Variants:**
- `default` - Default style
- `success` - Green success toast
- `error` / `destructive` - Red error toast
- `info` - Blue info toast

---

## 📝 Usage Examples

See [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) for comprehensive examples.

### Quick Example: Login Form

```tsx
import { View } from 'react-native';
import { Input, Label, Button, useToast } from '@/components/ui';
import { useState } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please fill all fields',
        variant: 'error',
      });
      return;
    }
    
    // Submit...
    toast({
      title: 'Success!',
      variant: 'success',
    });
  };

  return (
    <View style={{ padding: 16 }}>
      <Label required>Email</Label>
      <Input
        placeholder="email@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <Label required>Password</Label>
      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button onPress={handleSubmit}>Login</Button>
    </View>
  );
}
```

---

## 🔄 Web Parity

These components match the web API from:
- Web components: `apps/web/components/ui/`
- Radix UI primitives (Dialog, Label, etc.)
- shadcn/ui patterns

### API Compatibility

| Component | Web Match | Notes |
|-----------|-----------|-------|
| Input | ✅ 100% | Props match web |
| Label | ✅ 100% | Props match web |
| Dialog | ✅ 95% | Uses Modal instead of Radix |
| Badge | ✅ 100% | Same variants |
| ScrollArea | ✅ 90% | Simplified for mobile |
| useToast | ✅ 95% | Same API, mobile-optimized UI |
| Card | ✅ 100% | Already implemented |
| Button | ✅ 100% | Already implemented |
| Accordion | ✅ 100% | Already implemented |

---

## 🚀 Next Steps

### High Priority (from usage analysis)
- ✅ Input & Label
- ✅ Dialog system
- ✅ Badge
- ✅ ScrollArea
- ✅ useToast

### Medium Priority
- [ ] Popover
- [ ] Select/Dropdown enhancements
- [ ] Skeleton loader
- [ ] Avatar
- [ ] Tabs
- [ ] Drawer (or use React Navigation drawer)

### Form Components
- [ ] FormItem wrapper
- [ ] FormField with validation
- [ ] FormMessage for errors
- [ ] FormControl wrapper

---

## 💡 Best Practices

1. **Always use themed colors**
   ```tsx
   const colors = useThemeColors();
   // Use colors.primary, colors.text, etc.
   ```

2. **Match web props where possible**
   ```tsx
   // Good - matches web API
   <Input error={hasError} disabled={isDisabled} />
   
   // Avoid - custom mobile-only API
   <Input hasError={hasError} isDisabled={isDisabled} />
   ```

3. **Use forwardRef for advanced use cases**
   ```tsx
   const inputRef = useRef<TextInput>(null);
   <Input ref={inputRef} />
   ```

4. **Wrap app with providers**
   ```tsx
   <ToastProvider>
     <App />
   </ToastProvider>
   ```

5. **Keep components composable**
   ```tsx
   // Good - composable
   <Dialog>
     <DialogContent>
       <DialogHeader>
         <DialogTitle>Title</DialogTitle>
       </DialogHeader>
     </DialogContent>
   </Dialog>
   
   // Avoid - monolithic
   <Dialog title="Title" content="..." />
   ```

---

## 📚 Resources

- **Web Components:** `apps/web/components/ui/`
- **Usage Analysis:** `docs/web/component-analysis/`
- **Theme System:** `apps/mobile/src/contexts/ThemeContext.tsx`
- **Utilities:** `apps/mobile/src/utils/theme.ts`

---

## 🤝 Contributing

When adding new components:

1. Check web implementation first
2. Match the web API where possible
3. Use `useThemeColors` for theming
4. Add TypeScript types
5. Support `forwardRef` if needed
6. Update this README
7. Add usage examples to USAGE_EXAMPLES.md

---

**Status:** ✅ Phase 1 Complete (High Priority Components)

Last Updated: January 2, 2026