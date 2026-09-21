// apps/web/components/auth/adminDashboard/sections/ChangeAccountTypeView.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StackedLoader from "@/components/ui/StackedLoader";
import { RoleIcon, getRoleButtonVariant } from "@/components/ui/RoleIcon";
import { getRoleTheme } from "@fajr/shared/theme";

type AccountType = "Doctor" | "Triage";

interface ChangeAccountTypeViewProps {
  onClose?: () => void;
  isDialog?: boolean;
  onAccountTypeChanged?: (newType: AccountType, oldType: AccountType) => void;
}

export default function ChangeAccountTypeView({
  onClose,
  isDialog = false,
  onAccountTypeChanged,
}: ChangeAccountTypeViewProps) {
  const { data: session, update } = useSession();
  const [accountType, setAccountType] = useState<AccountType | undefined>(
    session?.user?.accountType as AccountType,
  );
  const [isLoading, setIsLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAccountType(session?.user?.accountType as AccountType);
  }, [session?.user?.accountType]);

  useEffect(() => {
    if (isDialog) {
      function handleClickOutside(event: MouseEvent) {
        if (
          cardRef.current &&
          !cardRef.current.contains(event.target as Node)
        ) {
          onClose?.();
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [onClose, isDialog]);

  const handleTypeChange = async (newType: AccountType) => {
    if (!session?.user?._id || newType === accountType) return;

    const oldType = accountType;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/${session.user._id}`, {
        method: "PATCH",
        body: JSON.stringify({ accountType: newType }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to update account type");
      }

      const updatedUser = await response.json();

      await update({
        ...session,
        user: { ...session.user, accountType: updatedUser.accountType },
      });

      setAccountType(updatedUser.accountType as AccountType);

      // Notify parent component about the change
      if (onAccountTypeChanged && oldType) {
        onAccountTypeChanged(newType, oldType);
      }

      onClose?.();
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to update account type. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const labelFor = (type: AccountType) => getRoleTheme(type).label;

  const content = isDialog ? (
    // Dialog mode: Compact list view
    <div className="space-y-2 relative">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center bg-card z-50 rounded-lg"
          >
            <StackedLoader
              accountType={accountType}
              size={60}
              show={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {(["Doctor", "Triage"] as const).map((type) => {
        const role = getRoleTheme(type);
        const isSelected = accountType === type;
        const variant = isSelected
          ? (getRoleButtonVariant(type, "background") as any)
          : "ghost";

        return (
          <motion.div
            key={type}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              variant={variant}
              className="w-full justify-start text-sm h-auto py-3 relative"
              onClick={() => handleTypeChange(type)}
              disabled={isLoading}
            >
              <RoleIcon
                accountType={type}
                colored={!isSelected}
                className="mr-3 h-5 w-5 shrink-0"
              />
              <div className="flex-1 text-left">
                <div className="font-semibold">{role.label}</div>
              </div>
              {isSelected && <Check className="ml-2 h-4 w-4 shrink-0" />}
            </Button>
          </motion.div>
        );
      })}
    </div>
  ) : (
    // Full page mode: Card-based view
    <div className="container mx-auto px-4 relative">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center bg-background z-50"
          >
            <div className="flex flex-col items-center gap-4">
              <StackedLoader
                accountType={accountType}
                size={100}
                show={true}
              />
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-foreground font-medium"
              >
                Switching to {accountType ? labelFor(accountType) : ""}...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Switch Account Type
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a role to switch your account type. Current:{" "}
          <span className="font-semibold text-foreground">
            {accountType ? labelFor(accountType) : "not set"}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {(["Doctor", "Triage"] as const).map((type) => {
          const role = getRoleTheme(type);
          const isSelected = accountType === type;

          return (
            <motion.button
              key={type}
              onClick={() => setAccountType(type)}
              disabled={isLoading}
              className="w-full text-left"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-primary"
                    : "hover:border-primary"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? "bg-primary-foreground/20" : "bg-muted"
                        }`}
                      >
                        <RoleIcon
                          accountType={type}
                          colored={!isSelected}
                          className={`h-6 w-6 ${
                            isSelected ? "text-primary-foreground" : ""
                          }`}
                        />
                      </div>
                      <span
                        className={
                          isSelected
                            ? "text-primary-foreground"
                            : "text-foreground"
                        }
                      >
                        {role.label}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary-foreground" />
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
            </motion.button>
          );
        })}
      </div>

      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() =>
            setAccountType(session?.user?.accountType as AccountType)
          }
          disabled={isLoading || accountType === session?.user?.accountType}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={() => handleTypeChange(accountType as AccountType)}
          disabled={isLoading || accountType === session?.user?.accountType}
        >
          {isLoading ? "Switching..." : "Switch Role"}
        </Button>
      </div>
    </div>
  );

  if (isDialog) {
    return (
      <div ref={cardRef} className="w-48">
        {content}
      </div>
    );
  }

  return content;
}
