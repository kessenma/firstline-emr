"use client";

// components/adminDashboard/sections/verify-auth-migration/VerifyAuthMigrationView.tsx
// Admin-dashboard wrapper around the shared VerifyAuthPanel. Same interactive
// checks as the standalone /verify-auth page.
import VerifyAuthPanel from "@/components/verify-auth/VerifyAuthPanel";

export default function VerifyAuthMigrationView({
  isDialog: _isDialog,
}: {
  isDialog?: boolean;
}) {
  return (
    <div className="p-6 border-border border-l-2">
      <VerifyAuthPanel />
    </div>
  );
}
