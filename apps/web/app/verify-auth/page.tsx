// app/verify-auth/page.tsx
// Standalone, login-free page hosting the post-migration verification tool.
// This is the URL the mobile admin card opens in the system browser (where
// WebAuthn/passkeys actually work, unlike an embedded WebView).
import VerifyAuthPanel from "@/components/verify-auth/VerifyAuthPanel";

export const metadata = {
  title: "Verify Auth Migration",
};

export default function VerifyAuthPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 flex justify-center">
      <VerifyAuthPanel />
    </div>
  );
}
