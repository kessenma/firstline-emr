"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Loader2, X, MessageSquare, UserPlus } from "lucide-react";
import { DoctorSpecialties } from "@/data/doctorSpecialty.enum";
import { PatientStatuses } from "@/data/patientStatus.enum";
import { PRIORITIES } from "@/components/ui/Table/filters";

export interface PatientSearchResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
  priority: string | null;
  specialties: string[] | null;
  hospital: string | null;
  createdAt: string;
  hasTelegram: boolean;
  chiefComplaint: string | null;
  diagnosis: string | null;
}

interface PatientSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPatient: (patient: PatientSearchResult) => void;
}

export function PatientSearchDialog({
  open,
  onOpenChange,
  onSelectPatient,
}: PatientSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [source, setSource] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [idSearch, setIdSearch] = useState("");

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPatients = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQuery.trim().length >= 2) params.set("q", searchQuery.trim());
    if (idSearch.trim()) params.set("id", idSearch.trim());
    if (source) params.set("source", source);
    if (specialty) params.set("specialty", specialty);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    // Don't search if no params at all
    if (params.toString() === "") {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/patients/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.patients || []);
      }
    } catch (err) {
      console.error("Patient search failed:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, idSearch, source, specialty, status, priority, dateFrom, dateTo]);

  // Debounced search on text input change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchPatients]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setResults([]);
      setShowFilters(false);
      setSource("");
      setSpecialty("");
      setStatus("");
      setPriority("");
      setDateFrom("");
      setDateTo("");
      setIdSearch("");
    }
  }, [open]);

  const clearFilters = () => {
    setSource("");
    setSpecialty("");
    setStatus("");
    setPriority("");
    setDateFrom("");
    setDateTo("");
    setIdSearch("");
  };

  const hasActiveFilters = source || specialty || status || priority || dateFrom || dateTo || idSearch;

  const handleSelect = (patient: PatientSearchResult) => {
    onSelectPatient(patient);
    onOpenChange(false);
  };

  const getStatusColor = (s: string | null) => {
    if (!s) return "secondary";
    if (s.includes("Pre-Op / Not Cleared")) return "destructive";
    if (s.includes("Pre-Op / Cleared")) return "default";
    if (s.includes("Peri-Op")) return "default";
    if (s.includes("Post-Op / In-Patient")) return "default";
    if (s.includes("Discharged")) return "secondary";
    return "secondary";
  };

  const getPriorityColor = (p: string | null) => {
    if (!p) return "secondary";
    if (p === "Emergency") return "destructive";
    if (p === "Urgent") return "destructive";
    if (p === "Moderate") return "default";
    if (p === "Routine") return "secondary";
    return "secondary";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Patients</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
            )}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* ID Search */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Patient ID</label>
              <Input
                placeholder="UUID..."
                value={idSearch}
                onChange={(e) => setIdSearch(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Source */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Source</label>
              <div className="flex gap-2">
                <Button
                  variant={source === "telegram" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSource(source === "telegram" ? "" : "telegram")}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Telegram
                </Button>
                <Button
                  variant={source === "manual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSource(source === "manual" ? "" : "manual")}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Manual
                </Button>
              </div>
            </div>

            {/* Row: Specialty, Status, Priority */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Specialty</label>
                <Select value={specialty} onValueChange={(v) => setSpecialty(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {DoctorSpecialties.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {PatientStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <Select value={priority} onValueChange={(v) => setPriority(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery.length >= 2 || hasActiveFilters
                ? "No patients found"
                : "Type a name or apply filters to search"}
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {results.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelect(patient)}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {patient.firstName} {patient.lastName}
                      </div>
                      {patient.chiefComplaint && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {patient.chiefComplaint}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {patient.status && (
                          <Badge variant={getStatusColor(patient.status)} className="text-[10px] px-1.5 py-0">
                            {patient.status}
                          </Badge>
                        )}
                        {patient.priority && patient.priority !== "Not Selected" && (
                          <Badge variant={getPriorityColor(patient.priority)} className="text-[10px] px-1.5 py-0">
                            {patient.priority}
                          </Badge>
                        )}
                        {patient.hasTelegram && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
                            TG
                          </Badge>
                        )}
                      </div>
                      {patient.specialties && patient.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {patient.specialties.map((s) => (
                            <span key={s} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
