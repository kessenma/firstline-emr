"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Bookmark } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFilterPresets } from "@/hooks/useFilterPresets";

export function PresetChips() {
  const { presets, activePresetId, savePreset, deletePreset, applyPreset, canSaveMore } =
    useFilterPresets();
  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [saveError, setSaveError] = useState("");

  const handleSave = () => {
    const result = savePreset(presetName);
    if (result.success) {
      setPresetName("");
      setSaveOpen(false);
      setSaveError("");
    } else {
      setSaveError(result.error || "Failed to save");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 mb-2">
      <Bookmark className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {presets.map((preset) => (
        <div key={preset.id} className="flex items-center">
          <Button
            variant={activePresetId === preset.id ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2.5 rounded-r-none"
            onClick={() => applyPreset(preset)}
          >
            {preset.name}
          </Button>
          {!preset.isBuiltIn && (
            <Button
              variant={activePresetId === preset.id ? "default" : "outline"}
              size="sm"
              className="h-7 px-1 rounded-l-none border-l-0"
              onClick={() => deletePreset(preset.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {preset.isBuiltIn && (
            // Invisible spacer to match the rounded corner
            <span className="h-7 w-0" />
          )}
        </div>
      ))}

      {canSaveMore && (
        <Popover open={saveOpen} onOpenChange={setSaveOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground"
            >
              <Plus className="h-3 w-3 mr-1" />
              Save view
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              <span className="text-xs font-medium">Save current filters</span>
              <Input
                value={presetName}
                onChange={(e) => {
                  setPresetName(e.target.value);
                  setSaveError("");
                }}
                placeholder="Preset name..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              {saveError && (
                <p className="text-xs text-destructive">{saveError}</p>
              )}
              <Button size="sm" className="w-full h-7 text-xs" onClick={handleSave}>
                Save
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
