import { Pencil, CircleMinus, Trash2, MapPin, Users, Stethoscope, Hospital, MessageCircle } from "lucide-react";
import useFilterStore from "@/stores/useDashboardStore";

export const FilterBar = () => {
  const { filters, updateFilters, clearFilters } = useFilterStore();

  const activeChips: { key: string; label: string; icon: React.ReactNode; onClear: () => void }[] = [];

  if (filters.priority) {
    activeChips.push({
      key: "priority",
      label: `Priority: ${filters.priority}`,
      icon: <Pencil className="h-3 w-3" />,
      onClear: () => updateFilters({ priority: undefined }),
    });
  }
  if (filters.status) {
    activeChips.push({
      key: "status",
      label: `Status: ${filters.status}`,
      icon: <Pencil className="h-3 w-3" />,
      onClear: () => updateFilters({ status: undefined }),
    });
  }
  if (filters.specialty) {
    activeChips.push({
      key: "specialty",
      label: `Specialty: ${filters.specialty}`,
      icon: <Stethoscope className="h-3 w-3" />,
      onClear: () => updateFilters({ specialty: undefined }),
    });
  }
  if (filters.hospital) {
    activeChips.push({
      key: "hospital",
      label: `Hospital: ${filters.hospital}`,
      icon: <Hospital className="h-3 w-3" />,
      onClear: () => updateFilters({ hospital: undefined }),
    });
  }
  if (filters.careTeamScope !== "all") {
    activeChips.push({
      key: "careTeamScope",
      label: filters.careTeamScope === "my-cases" ? "My Cases" : "I'm Lead",
      icon: <Users className="h-3 w-3" />,
      onClear: () => updateFilters({ careTeamScope: "all" }),
    });
  }
  if (filters.missionIds.length > 0) {
    activeChips.push({
      key: "mission",
      label: `Missions: ${filters.missionIds.length} selected`,
      icon: <MapPin className="h-3 w-3" />,
      onClear: () => updateFilters({ missionIds: [] }),
    });
  }
  if (filters.showFollowUps) {
    activeChips.push({
      key: "followups",
      label: "Follow-Ups",
      icon: <Pencil className="h-3 w-3" />,
      onClear: () => updateFilters({ showFollowUps: false }),
    });
  }
  if (filters.showUnassignedSpecialty) {
    activeChips.push({
      key: "unassigned",
      label: "Unassigned Specialty",
      icon: <Stethoscope className="h-3 w-3" />,
      onClear: () => updateFilters({ showUnassignedSpecialty: false }),
    });
  }
  if (filters.showConflictsOnly) {
    activeChips.push({
      key: "conflicts",
      label: "Conflicts Only",
      icon: <Users className="h-3 w-3" />,
      onClear: () => updateFilters({ showConflictsOnly: false }),
    });
  }
  if (filters.showTelegramOnly) {
    activeChips.push({
      key: "telegram",
      label: "Telegram Patients",
      icon: <MessageCircle className="h-3 w-3" />,
      onClear: () => updateFilters({ showTelegramOnly: false }),
    });
  }

  if (activeChips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2 px-4">
      {activeChips.map((chip) => (
        <div
          key={chip.key}
          className="bg-secondary text-secondary-foreground px-2 py-1 rounded flex items-center gap-1.5 text-sm"
        >
          {chip.icon}
          {chip.label}
          <CircleMinus
            className="h-3.5 w-3.5 cursor-pointer hover:text-destructive transition-colors"
            onClick={chip.onClear}
          />
        </div>
      ))}
      {activeChips.length >= 2 && (
        <div
          className="bg-muted text-destructive px-2 py-1 rounded cursor-pointer hover:bg-muted/80 flex items-center gap-1.5 text-sm"
          onClick={() => clearFilters()}
        >
          <Trash2 className="h-3 w-3" />
          Clear all
        </div>
      )}
    </div>
  );
};
