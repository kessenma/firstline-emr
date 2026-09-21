// apps/web/components/telegram-patient/container/intake-form/view/form-ui/LoadingState.tsx
import {
  languageEnumToString,
  translations,
} from "../../patient-form-translations";

interface LoadingStateProps {
  language: string;
}

export function LoadingState({ language }: LoadingStateProps) {
  const safeLanguage = languageEnumToString(language);
  return (
    <div className="flex items-center justify-center min-h-[400px] bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">
          {translations.loading[safeLanguage]}
        </p>
      </div>
    </div>
  );
}
