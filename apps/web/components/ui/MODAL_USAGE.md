# Modal Component Usage Guide

## Overview

The `Modal` component is a reusable, flexible dialog component built on top of Radix UI Dialog. It provides a consistent way to display modal content across the application with built-in support for headers, footers, external links, and various sizes.

## Basic Usage

```tsx
import { Modal } from "@/components/ui/modal";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="My Modal Title"
        description="This is a description of what this modal does"
      >
        <p>Your modal content goes here</p>
      </Modal>
    </>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Controls modal open/close state |
| `onClose` | `() => void` | required | Callback when modal should close |
| `title` | `string` | - | Modal title displayed in header |
| `description` | `string` | - | Modal description/subtitle |
| `children` | `React.ReactNode` | required | Main content of the modal |
| `footer` | `React.ReactNode` | - | Footer content (buttons, actions, etc) |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"lg"` | Size of the modal |
| `className` | `string` | - | Custom class for content area |
| `headerActions` | `React.ReactNode` | - | Custom actions in header (buttons, etc) |
| `showExternalLink` | `boolean` | `false` | Show external link button in header |
| `externalLinkUrl` | `string` | - | URL for external link button |
| `externalLinkText` | `string` | `"Open Full Page"` | Text for external link button |
| `onExternalLinkClick` | `() => void` | - | Callback when external link is clicked |
| `hideClose` | `boolean` | `false` | Hide the close X button |
| `scrollable` | `boolean` | `true` | Enable scrolling for tall content |
| `noPadding` | `boolean` | `false` | Remove default padding from content |

## Size Options

- `sm` - 400px max width (good for small confirmations)
- `md` - 512px max width (good for forms)
- `lg` - 672px max width (default, good for most content)
- `xl` - 896px max width (good for data tables)
- `full` - 1280px max width (good for complex UIs)

## Examples

### Simple Modal

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Welcome"
  description="Welcome to our application"
>
  <p>This is a simple modal with just content.</p>
</Modal>
```

### Modal with Footer Actions

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  description="Are you sure you want to proceed?"
  footer={
    <div className="flex justify-end gap-2 w-full">
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>
        Confirm
      </Button>
    </div>
  }
>
  <p>This action cannot be undone.</p>
</Modal>
```

### Modal with External Link

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Quick View"
  description="Preview of the content"
  showExternalLink
  externalLinkText="Open Full Dashboard"
  onExternalLinkClick={() => router.push("/dashboard")}
>
  <p>Quick preview content here.</p>
</Modal>
```

### Modal with Custom Header Actions

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="User Settings"
  headerActions={
    <>
      <Button variant="ghost" size="sm">
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Share className="h-4 w-4" />
      </Button>
    </>
  }
>
  <SettingsForm />
</Modal>
```

### Full Width Modal with Complex Content

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="New User Signups"
  description="Review and approve pending registrations"
  size="full"
  showExternalLink
  externalLinkText="Open Full Dashboard"
  onExternalLinkClick={() => router.push("/admin")}
  noPadding={false}
>
  <NewSignupsView isDialog={true} />
</Modal>
```

### Modal with Custom Styling

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Custom Styled Modal"
  className="bg-gradient-to-br from-blue-50 to-purple-50"
  size="xl"
>
  <CustomComponent />
</Modal>
```

### Non-Scrollable Modal

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Fixed Height Content"
  scrollable={false}
  size="md"
>
  <div className="h-64 flex items-center justify-center">
    Fixed height content
  </div>
</Modal>
```

## ConfirmModal Component

For simple confirmation dialogs, use the `ConfirmModal` convenience wrapper:

```tsx
import { ConfirmModal } from "@/components/ui/modal";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleConfirm = () => {
    // Do something
    console.log("Confirmed!");
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Delete Item"
      message="Are you sure you want to delete this item? This action cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
      confirmVariant="destructive"
      onConfirm={handleConfirm}
    />
  );
}
```

### ConfirmModal with Loading State

```tsx
const [isDeleting, setIsDeleting] = useState(false);

const handleDelete = async () => {
  setIsDeleting(true);
  try {
    await deleteItem();
    setIsOpen(false);
  } finally {
    setIsDeleting(false);
  }
};

<ConfirmModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Delete Item"
  message="Are you sure?"
  onConfirm={handleDelete}
  isLoading={isDeleting}
  confirmText={isDeleting ? "Deleting..." : "Delete"}
  confirmVariant="destructive"
/>
```

### ConfirmModal with Custom Message

```tsx
<ConfirmModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  message={
    <div>
      <p className="font-semibold mb-2">This will:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Delete all associated data</li>
        <li>Remove user access</li>
        <li>Archive historical records</li>
      </ul>
    </div>
  }
  onConfirm={handleConfirm}
/>
```

## Best Practices

1. **Always provide a title** - Helps users understand what the modal is for
2. **Use appropriate sizes** - Don't use `full` for simple confirmations
3. **Handle loading states** - Show loading indicators during async operations
4. **Keyboard accessibility** - Modal automatically handles Escape key to close
5. **Mobile responsive** - Modal is 90% width on mobile, max-width on desktop
6. **External links for complex views** - When showing a preview, offer a "full page" option
7. **Close on success** - Remember to close the modal after successful actions

## Common Use Cases

### Notification Action Modal
When a user clicks a notification, show related content in a modal with option to go to full page:

```tsx
const [isModalOpen, setIsModalOpen] = useState(false);

const handleNotificationClick = (notification) => {
  if (notification.type === "new_user_signup") {
    setIsModalOpen(true);
  } else {
    router.push(notification.redirectTo);
  }
};

<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="New User Signups"
  description="Review pending registrations"
  size="full"
  showExternalLink
  externalLinkText="Open Full Dashboard"
  onExternalLinkClick={() => router.push("/admin")}
>
  <SignupsView />
</Modal>
```

### Form Modal
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create New User"
  size="md"
  footer={
    <div className="flex justify-end gap-2 w-full">
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create"}
      </Button>
    </div>
  }
>
  <UserForm />
</Modal>
```

### Preview Modal
```tsx
<Modal
  isOpen={isPreviewOpen}
  onClose={() => setIsPreviewOpen(false)}
  title="Document Preview"
  size="xl"
  showExternalLink
  externalLinkText="Open in New Tab"
  onExternalLinkClick={() => window.open(documentUrl, "_blank")}
>
  <DocumentViewer url={documentUrl} />
</Modal>
```

## Styling

The Modal component uses Tailwind CSS and respects your theme configuration:
- Background: `bg-background`
- Border: `border`
- Text: `text-foreground`
- Muted text: `text-muted-foreground`

All colors automatically adapt to light/dark mode.

## Accessibility

- ✅ Keyboard navigation (Escape to close)
- ✅ Focus trap (keeps focus within modal)
- ✅ ARIA labels and roles
- ✅ Screen reader friendly
- ✅ Click outside to close

## Related Components

- `Dialog` - Base dialog primitive (lower level)
- `Sheet` - Slide-in panel from side
- `AlertDialog` - Simple alert dialogs
- `Drawer` - Bottom drawer for mobile