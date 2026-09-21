"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import {
  getDashboardHelpSections,
  getDashboardHelpTitle,
  type DashboardHelpView,
} from "@fajr/shared/patient-dashboard";

interface DashboardHelpDialogProps {
  accountType?: string;
  view?: DashboardHelpView;
  className?: string;
}

/**
 * The "how does this work" explainer. Content is shared with mobile via
 * `@fajr/shared/patient-dashboard` so the two cannot drift.
 */
export function DashboardHelpDialog({
  accountType,
  view = "dashboard",
  className,
}: DashboardHelpDialogProps) {
  const [open, setOpen] = React.useState(false);
  const sections = getDashboardHelpSections(accountType, view);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="How this dashboard works"
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDashboardHelpTitle(view)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.id}>
              <h3 className="text-sm font-semibold text-foreground mb-1.5">
                {section.title}
              </h3>
              <ul className="space-y-1.5">
                {section.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex gap-2"
                  >
                    <span aria-hidden className="text-primary">
                      •
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
