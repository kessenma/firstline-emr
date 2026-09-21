// apps/web/components/adminDashboard/AdminDashboardView.tsx
"use client";

import React, { useState, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Loader2,
  RefreshCw,
  Search,
  HelpCircle,
  LayoutGrid,
  List,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Tooltip from "@/components/form/Tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AdminConfigProvider } from "@/components/adminDashboard/context/AdminConfigContext";
import { useAdminSectionNav } from "./context/AdminSectionNavContext";
import { ExpandableSection } from "./shared/ExpandableSection";
import { ToastContext, useToastState } from "@/components/hooks/useToast";
import { ToastComponent } from "@/components/hooks/useToast";
import {
  sections,
  getSectionsByCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type SectionCategory,
  type SectionDefinition,
} from "./sectionRegistry";

// ─── Grid View ───────────────────────────────────────────────────────────────

function SectionGrid({
  sectionsByCategory,
  searchTerm,
  onSelectSection,
}: {
  sectionsByCategory: Map<SectionCategory, SectionDefinition[]>;
  searchTerm: string;
  onSelectSection: (section: SectionDefinition) => void;
}) {
  const lowerSearch = searchTerm.toLowerCase();
  let totalVisible = 0;

  return (
    <>
      {CATEGORY_ORDER.map((category) => {
        const categorySections = sectionsByCategory.get(category) ?? [];
        const visible = categorySections.filter((s) =>
          s.title.toLowerCase().includes(lowerSearch),
        );
        if (visible.length === 0) return null;
        totalVisible += visible.length;

        return (
          <div key={category}>
            <div className="flex items-center gap-3 mt-8 mb-4 first:mt-0">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {CATEGORY_LABELS[category]}
              </h2>
              <Separator className="flex-1" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {visible.map((section) => {
                const Icon = section.icon;
                return (
                  <Card
                    key={section.id}
                    className="group flex flex-col items-center justify-center gap-2 p-4 cursor-pointer border border-border bg-card hover:bg-muted/60 hover:border-primary/30 transition-colors"
                    onClick={() => onSelectSection(section)}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-center text-foreground leading-tight">
                      {section.title}
                    </span>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {totalVisible === 0 && (
        <p className="mt-8 text-center text-muted-foreground">
          No sections match your search.
        </p>
      )}
    </>
  );
}

// ─── Section Detail (inline full-width) ──────────────────────────────────────

function SectionDetail({
  section,
  onBack,
}: {
  section: SectionDefinition;
  onBack: () => void;
}) {
  const Icon = section.icon;
  const SectionComponent = section.component;

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </button>
      <Card className="border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">
            {section.title}
          </h2>
        </div>
        <SectionComponent isDialog={false} />
      </Card>
    </div>
  );
}

// ─── Accordion (list) View ───────────────────────────────────────────────────

function SectionAccordion({
  sectionsByCategory,
  searchTerm,
}: {
  sectionsByCategory: Map<SectionCategory, SectionDefinition[]>;
  searchTerm: string;
}) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const lowerSearch = searchTerm.toLowerCase();
  let totalVisible = 0;

  const handleToggleSection = (sectionId: string) => {
    setOpenSection((prev) => (prev === sectionId ? null : sectionId));
  };

  return (
    <>
      {CATEGORY_ORDER.map((category) => {
        const categorySections = sectionsByCategory.get(category) ?? [];
        const visible = categorySections.filter((s) =>
          s.title.toLowerCase().includes(lowerSearch),
        );
        if (visible.length === 0) return null;
        totalVisible += visible.length;

        return (
          <div key={category}>
            <div className="flex items-center gap-3 mt-8 mb-4 first:mt-0">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {CATEGORY_LABELS[category]}
              </h2>
              <Separator className="flex-1" />
            </div>
            {visible.map((section) => {
              const SectionComponent = section.component;
              return (
                <ExpandableSection
                  key={section.id}
                  id={section.id}
                  title={section.title}
                  icon={section.icon}
                  isOpen={openSection === section.id}
                  onToggle={() => handleToggleSection(section.id)}
                >
                  <SectionComponent isDialog={false} />
                </ExpandableSection>
              );
            })}
          </div>
        );
      })}

      {totalVisible === 0 && (
        <p className="mt-8 text-center text-muted-foreground">
          No sections match your search.
        </p>
      )}
    </>
  );
}

// ─── Main Dashboard Content ──────────────────────────────────────────────────

const AdminDashboardContent = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  const ctx = useAdminSectionNav()!;
  const { activeSection, selectSection, goBack } = ctx;

  const sectionsByCategory = useMemo(() => getSectionsByCategory(), []);

  const handleRefreshAll = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // When a grid tile is selected, show the section detail inline
  if (viewMode === "grid" && activeSection) {
    return (
      <div className="bg-background container px-4 py-8 mx-auto">
        <SectionDetail section={activeSection} onBack={goBack} />
      </div>
    );
  }

  return (
    <div className="bg-background container px-4 py-8 mx-auto">
      <div className="flex flex-col justify-between items-center mb-8 space-y-4 md:flex-row md:space-y-0">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search sections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4"
            />
            <Search className="absolute left-3 top-1/2 text-muted-foreground transform -translate-y-1/2" />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="rounded-r-none h-9 w-9"
              onClick={() => {
                setViewMode("grid");
                goBack();
              }}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="rounded-l-none h-9 w-9"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Tooltip tooltipText="Refresh all sections" showTooltip={showTooltip}>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </Tooltip>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Admin Dashboard Help</DialogTitle>
                <DialogDescription>
                  This dashboard allows you to manage various aspects of the
                  system. Click on each section to expand and view details. Use
                  the search bar to quickly find specific sections. Toggle
                  between grid and list views using the view switcher.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === "grid" ? (
        <SectionGrid
          sectionsByCategory={sectionsByCategory}
          searchTerm={searchTerm}
          onSelectSection={selectSection}
        />
      ) : (
        <SectionAccordion
          sectionsByCategory={sectionsByCategory}
          searchTerm={searchTerm}
        />
      )}
    </div>
  );
};

const AdminDashboardView = ({
  analyticsPassphrase,
}: {
  analyticsPassphrase?: string;
}) => {
  const [queryClient] = useState(() => new QueryClient());
  const toastState = useToastState();

  return (
    <ToastContext.Provider value={toastState}>
      <QueryClientProvider client={queryClient}>
        <AdminConfigProvider analyticsPassphrase={analyticsPassphrase}>
          <AdminDashboardContent />
          <ToastComponent />
        </AdminConfigProvider>
      </QueryClientProvider>
    </ToastContext.Provider>
  );
};

export default AdminDashboardView;
