// apps/web/components/telegram-patient/container/intake-form/view/LoadinerSpinner.tsx
interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({
  message = "Validating access...",
}: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
