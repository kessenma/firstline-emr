"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";
import { FilterSheet, useActiveFilterCount } from "./FilterSheet";
import type { PatientWithMessages } from "../viewModel/types";

interface Props {
  allPatients: PatientWithMessages[];
  accountType?: string;
}

export function FilterSheetTrigger({ allPatients, accountType }: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = useActiveFilterCount();

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {activeCount > 0 && (
          <Badge
            variant="default"
            className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
          >
            {activeCount}
          </Badge>
        )}
        <span className="sr-only">Filters</span>
      </Button>

      <FilterSheet
        open={open}
        onOpenChange={setOpen}
        allPatients={allPatients}
        accountType={accountType}
      />
    </>
  );
}
