"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { X } from "lucide-react";
import { useMissions, type MissionOption } from "@/hooks/useMissions";
import useDashboardStore from "@/stores/useDashboardStore";
import { classifyMissionStatus } from "@fajr/shared/patient-dashboard";
import type { PatientWithMessages } from "../viewModel/types";

interface Props {
  allPatients: PatientWithMessages[];
}

export function MissionFilterSection({ allPatients }: Props) {
  const { missions } = useMissions();
  const { filters, toggleMission, updateFilters } = useDashboardStore();
  const selectedMissions = filters.missionIds;

  // Group missions by status using shared classification
  const grouped = useMemo(() => {
    const active: MissionOption[] = [];
    const planned: MissionOption[] = [];
    const completed: MissionOption[] = [];

    for (const m of missions) {
      const group = classifyMissionStatus(m.status);
      if (group === "active") active.push(m);
      else if (group === "planned") planned.push(m);
      else completed.push(m);
    }

    return { active, planned, completed };
  }, [missions]);

  // Patient count per mission
  const countByMission = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allPatients) {
      if (p.missionId) {
        counts[p.missionId] = (counts[p.missionId] || 0) + 1;
      }
    }
    return counts;
  }, [allPatients]);

  if (missions.length === 0) return null;

  const renderMissionRow = (mission: MissionOption, dimmed = false) => (
    <label
      key={mission.id}
      className={`flex items-center gap-2.5 cursor-pointer py-2 px-2 rounded-md hover:bg-accent/50 transition-colors ${dimmed ? "opacity-50" : ""}`}
    >
      <Checkbox
        checked={selectedMissions.includes(mission.id)}
        onCheckedChange={() => toggleMission(mission.id)}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-foreground truncate">{mission.name}</span>
          {mission.isActiveIntake && (
            <Badge variant="success" className="text-[10px] px-1.5 py-0 shrink-0">
              Intake Open
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {mission.country}
          {mission.city ? ` \u2022 ${mission.city}` : ""}
        </span>
      </div>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
        {countByMission[mission.id] || 0}
      </Badge>
    </label>
  );

  // Default expanded sections
  const defaultOpen = ["active"];
  if (grouped.active.length === 0 && grouped.planned.length > 0) {
    defaultOpen.push("planned");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Missions
        </span>
        {selectedMissions.length > 0 && (
          <button
            onClick={() => updateFilters({ missionIds: [] })}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={defaultOpen}>
        {grouped.active.length > 0 && (
          <AccordionItem value="active" className="border-b-0">
            <AccordionTrigger className="py-1.5 text-xs font-medium">
              Active ({grouped.active.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col">
                {grouped.active.map((m) => renderMissionRow(m))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {grouped.planned.length > 0 && (
          <AccordionItem value="planned" className="border-b-0">
            <AccordionTrigger className="py-1.5 text-xs font-medium">
              Planned ({grouped.planned.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col">
                {grouped.planned.map((m) => renderMissionRow(m))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {grouped.completed.length > 0 && (
          <AccordionItem value="completed" className="border-b-0">
            <AccordionTrigger className="py-1.5 text-xs font-medium">
              Completed ({grouped.completed.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col">
                {grouped.completed.map((m) => renderMissionRow(m, true))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
