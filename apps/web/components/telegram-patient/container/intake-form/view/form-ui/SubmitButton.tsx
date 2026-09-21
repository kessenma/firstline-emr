// apps/web/components/telegram-patient/container/intake-form/view/form-ui/SubmitButton.tsx
import { Button } from "@/components/ui/button";
import {
  translations,
  languageEnumToString,
} from "../../patient-form-translations";

interface SubmitButtonProps {
  language: string;
  submitting: boolean;
  isFormValid: boolean;
}

export function SubmitButton({
  language,
  submitting,
  isFormValid,
}: SubmitButtonProps) {
  // Convert language to a safe type
  const safeLanguage = languageEnumToString(language);

  // Get submit button text with proper typing
  const getSubmitButtonText = () => {
    const submittingTexts = translations.submitting[safeLanguage];
    if (Array.isArray(submittingTexts) && submittingTexts.length >= 2) {
      return submitting ? submittingTexts[1] : submittingTexts[0];
    }
    return submitting ? "Submitting..." : "Submit";
  };

  return (
    <div className="flex justify-center pt-4">
      <Button
        variant={"orange"}
        disabled={submitting || !isFormValid}
        className={`${
          isFormValid
            ? "bg-primary hover:bg-primary/90"
            : "bg-muted cursor-not-allowed"
        } text-primary-foreground rounded-full px-6 py-2 flex items-center`}
        type="submit"
      >
        {getSubmitButtonText()}
      </Button>
    </div>
  );
}
