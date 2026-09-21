"use client";

import React, { useState, useRef, useMemo } from "react";
import { Table } from "@/components/ui/Table/Table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Users,
  Zap,
  ZapOff,
  Pencil,
  UserMinus,
  UserPlus,
  Trash2,
  MessageCircle,
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  ExternalLink,
  Hospital,
  ChevronDown,
  ChevronUp,
  Globe,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmModal } from "@/components/ui/modal";
import { DatePicker } from "@/components/form/DatePickerFormField";
import {
  useMissionsManagementViewModel,
  type MissionWithCount,
  type MissionMember,
  type MissionUrl,
  type MissionHospital,
  type MissionHospitalImage,
} from "./MissionsManagementViewModel";
import type { MissionAttachment } from "@/db/schema/missionAttachments";
import type { TableColumn } from "@/components/ui/Table/types";

export default function MissionsManagementView() {
  const {
    missionsData,
    isLoading,
    isMutating,
    selectedMissionMembers,
    selectedMissionId,
    allUsers,
    isLoadingUsers,
    fetchAllUsers,
    handleCreateMission,
    handleUpdateMission,
    handleDeleteMission,
    handleSetActiveIntake,
    fetchMissionMembers,
    handleAssignMembers,
    handleRemoveMember,
    handleUploadAttachment,
    handleDeleteAttachment,
    fetchMissionAttachments,
    handleUploadHospitalImage,
    handleDeleteHospitalImage,
  } = useMissionsManagementViewModel();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<MissionWithCount | null>(null);
  const [deletingMission, setDeletingMission] = useState<MissionWithCount | null>(null);
  const [archiveChat, setArchiveChat] = useState(true);
  const [editConfirmChanges, setEditConfirmChanges] = useState<string[] | null>(null);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<Array<{ id: string; firstName: string | null; lastName: string | null; email: string; accountType: string | null }>>([]);
  const [addMemberQuery, setAddMemberQuery] = useState("");

  // Full roster filtered client-side — empty query lists everyone;
  // users already in the mission are excluded
  const addableUsers = useMemo(() => {
    const memberIds = new Set(selectedMissionMembers.map((m) => m.id));
    const q = addMemberQuery.trim().toLowerCase();
    return allUsers.filter((user) => {
      if (memberIds.has(user.id)) return false;
      if (!q) return true;
      const name = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
      return (
        name.includes(q) ||
        (user.email || "").toLowerCase().includes(q) ||
        (user.accountType || "").toLowerCase().includes(q)
      );
    });
  }, [allUsers, selectedMissionMembers, addMemberQuery]);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: "",
    country: "",
    city: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [createHospitals, setCreateHospitals] = useState<MissionHospital[]>([]);
  const [createHospitalInput, setCreateHospitalInput] = useState("");
  const [createHospitalExpanded, setCreateHospitalExpanded] = useState<number | null>(null);
  const [createPendingHospitalImages, setCreatePendingHospitalImages] = useState<Record<number, File[]>>({});
  const [createUrls, setCreateUrls] = useState<MissionUrl[]>([]);
  const [createPendingFiles, setCreatePendingFiles] = useState<Array<{ file: File; displayName: string }>>([]);
  const [createProgress, setCreateProgress] = useState<string | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    country: "",
    city: "",
    description: "",
    status: "planned" as string,
    startDate: "",
    endDate: "",
  });
  const [editHospitals, setEditHospitals] = useState<MissionHospital[]>([]);
  const [editHospitalInput, setEditHospitalInput] = useState("");
  const [editHospitalExpanded, setEditHospitalExpanded] = useState<number | null>(null);
  const [editUrls, setEditUrls] = useState<MissionUrl[]>([]);
  const [editAttachments, setEditAttachments] = useState<MissionAttachment[]>([]);
  const editFileRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!createForm.name || !createForm.country) return;
    await handleCreateMission(
      { ...createForm, hospitals: createHospitals.length > 0 ? createHospitals : undefined, urls: createUrls.length > 0 ? createUrls : undefined },
      createPendingFiles.length > 0 ? createPendingFiles : undefined,
      setCreateProgress,
    );
    setCreateForm({ name: "", country: "", city: "", description: "", startDate: "", endDate: "" });
    setCreateHospitals([]);
    setCreateHospitalInput("");
    setCreateHospitalExpanded(null);
    setCreatePendingHospitalImages({});
    setCreateUrls([]);
    setCreatePendingFiles([]);
    setCreateProgress(null);
    setIsCreateOpen(false);
  };

  const computeEditChanges = (): string[] => {
    if (!editingMission) return [];
    const changes: string[] = [];
    if (editForm.name !== editingMission.name) changes.push(`Rename to "${editForm.name}"`);
    if (editForm.description !== (editingMission.description || "")) changes.push("Update description");
    if (editForm.country !== editingMission.country) changes.push(`Change country to ${editForm.country}`);
    if (editForm.city !== (editingMission.city || "")) changes.push(editForm.city ? `Change city to ${editForm.city}` : "Remove city");
    if (editForm.status !== editingMission.status) changes.push(`Change status to ${editForm.status}`);

    // Compare hospitals
    const oldHospitals: MissionHospital[] = ((editingMission.hospitals || []) as any[]).map((h: any) => typeof h === "string" ? { name: h } : h);
    const oldNames = new Set(oldHospitals.map((h) => h.name));
    const newNames = new Set(editHospitals.map((h) => h.name));
    const added = editHospitals.filter((h) => !oldNames.has(h.name));
    const removed = oldHospitals.filter((h) => !newNames.has(h.name));
    if (added.length > 0) changes.push(`Add hospital${added.length > 1 ? "s" : ""}: ${added.map((h) => h.name).join(", ")}`);
    if (removed.length > 0) changes.push(`Remove hospital${removed.length > 1 ? "s" : ""}: ${removed.map((h) => h.name).join(", ")}`);
    for (const h of editHospitals) {
      const old = oldHospitals.find((oh) => oh.name === h.name);
      if (!old) continue;
      const diffs: string[] = [];
      if ((h.url || "") !== (old.url || "")) diffs.push("URL");
      if ((h.mapLink || "") !== (old.mapLink || "")) diffs.push("map link");
      if ((h.website || "") !== (old.website || "")) diffs.push("website");
      if ((h.description || "") !== (old.description || "")) diffs.push("description");
      if ((h.visibility || "public") !== (old.visibility || "public")) diffs.push("visibility");
      if ((h.images?.length || 0) !== (old.images?.length || 0)) diffs.push("images");
      if (diffs.length > 0) changes.push(`Update ${diffs.join(", ")} for ${h.name}`);
    }

    return changes;
  };

  const handleEditClick = () => {
    const changes = computeEditChanges();
    if (changes.length === 0) {
      // No changes detected, just close
      setIsEditOpen(false);
      setEditingMission(null);
      return;
    }
    setEditConfirmChanges(changes);
  };

  const handleEditConfirmed = async () => {
    if (!editingMission) return;
    setEditConfirmChanges(null);
    await handleUpdateMission(editingMission.id, { ...editForm, hospitals: editHospitals, urls: editUrls });
    setIsEditOpen(false);
    setEditingMission(null);
    setEditHospitalExpanded(null);
  };

  const openEdit = async (mission: MissionWithCount) => {
    setEditingMission(mission);
    setEditForm({
      name: mission.name,
      country: mission.country,
      city: mission.city || "",
      description: mission.description || "",
      status: mission.status,
      startDate: mission.startDate ? new Date(mission.startDate).toISOString().split("T")[0] : "",
      endDate: mission.endDate ? new Date(mission.endDate).toISOString().split("T")[0] : "",
    });
    // Handle both legacy string[] and new MissionHospital[] formats
    const rawHospitals = mission.hospitals || [];
    const parsed: MissionHospital[] = rawHospitals.map((h: any) =>
      typeof h === "string" ? { name: h } : h
    );
    setEditHospitals(parsed);
    setEditHospitalInput("");
    setEditHospitalExpanded(null);
    setEditUrls(mission.urls || []);
    setIsEditOpen(true);
    const attachments = await fetchMissionAttachments(mission.id);
    setEditAttachments(attachments);
  };

  const handleEditUploadFile = async () => {
    const fileInput = editFileRef.current;
    if (!fileInput?.files?.[0] || !editingMission) return;
    const file = fileInput.files[0];
    const displayName = prompt("Display name for this file:", file.name);
    if (!displayName) return;
    const attachment = await handleUploadAttachment(editingMission.id, file, displayName);
    if (attachment) {
      setEditAttachments((prev) => [...prev, attachment]);
    }
    fileInput.value = "";
  };

  const handleEditDeleteAttachment = async (attachmentId: string) => {
    if (!editingMission) return;
    await handleDeleteAttachment(editingMission.id, attachmentId);
    setEditAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const handleCreateAddFile = () => {
    const fileInput = createFileRef.current;
    if (!fileInput?.files?.[0]) return;
    const file = fileInput.files[0];
    const displayName = prompt("Display name for this file:", file.name);
    if (!displayName) { fileInput.value = ""; return; }
    setCreatePendingFiles((prev) => [...prev, { file, displayName }]);
    fileInput.value = "";
  };

  const openMembers = (missionId: string) => {
    fetchMissionMembers(missionId);
    setIsMembersOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMission) return;
    await handleDeleteMission(deletingMission.id, archiveChat);
    setDeletingMission(null);
    setArchiveChat(true);
  };

  const toggleUserSelection = (user: { id: string; firstName: string | null; lastName: string | null; email: string; accountType: string | null }) => {
    setSelectedUsersToAdd((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) return prev.filter((u) => u.id !== user.id);
      return [...prev, user];
    });
  };

  const handleBulkAddMembers = async () => {
    if (!selectedMissionId || selectedUsersToAdd.length === 0) return;
    await handleAssignMembers(
      selectedMissionId,
      selectedUsersToAdd.map((u) => u.id),
    );
    setSelectedUsersToAdd([]);
    setAddMemberQuery("");
    setIsAddMemberOpen(false);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      planned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      completed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.planned}`}>
        {status}
      </span>
    );
  };

  const columns: TableColumn<MissionWithCount>[] = [
    {
      key: "name",
      header: "Mission Name",
      width: "w-40",
    },
    {
      key: "country",
      header: "Country",
      width: "w-28",
    },
    {
      key: "city",
      header: "City",
      width: "w-28",
      render: (value) => (value as string) || "-",
    },
    {
      key: "status",
      header: "Status",
      width: "w-24",
      render: (value) => statusBadge(value as string),
    },
    {
      key: "startDate",
      header: "Start Date",
      width: "w-28",
      render: (value) => value ? new Date(value as string).toLocaleDateString("en-US") : "-",
    },
    {
      key: "endDate",
      header: "End Date",
      width: "w-28",
      render: (value) => value ? new Date(value as string).toLocaleDateString("en-US") : "-",
    },
    {
      key: "memberCount",
      header: "Members",
      width: "w-20",
      render: (value, mission) => (
        <button
          onClick={() => openMembers(mission.id)}
          className="text-blue-600 hover:underline cursor-pointer"
        >
          {value as number}
        </button>
      ),
    },
    {
      key: "isActiveIntake",
      header: "Active Intake",
      width: "w-44",
      render: (value, mission) => (
        <div className="space-y-1.5">
          <Button
            size="sm"
            variant={value ? "default" : "outline"}
            onClick={() => handleSetActiveIntake(value ? null : mission.id)}
            className={value ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {value ? (
              <>
                <Zap className="w-4 h-4 mr-1" /> Active
              </>
            ) : (
              <>
                <ZapOff className="w-4 h-4 mr-1" /> Set
              </>
            )}
          </Button>
          {value && (mission.hospitals || []).length > 0 && (
            <Select
              value={mission.defaultIntakeHospital || "none"}
              onValueChange={(val) =>
                handleUpdateMission(mission.id, {
                  defaultIntakeHospital: val === "none" ? null : val,
                })
              }
            >
              <SelectTrigger className="w-full h-7 text-xs">
                <SelectValue placeholder="No default hospital" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default hospital</SelectItem>
                {(mission.hospitals || []).map((h: any) => {
                  const name = typeof h === "string" ? h : h.name;
                  return (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "w-40",
      render: (_value, mission) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(mission)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => openMembers(mission.id)}>
            <Users className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeletingMission(mission)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Missions Management</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Create Mission
            </Button>
          </DialogTrigger>
          <DialogContent className="shadow-sm max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Mission</DialogTitle>
            </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Name *</label>
                  <Input
                    placeholder="e.g. Jordan Mission 2025"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Country *</label>
                    <Input
                      placeholder="e.g. Jordan"
                      value={createForm.country}
                      onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">City</label>
                    <Input
                      placeholder="e.g. Amman"
                      value={createForm.city}
                      onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    />
                  </div>
                </div>
                {/* Hospitals Section */}
                <div className="bg-muted/40 border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Hospital className="w-4 h-4 text-muted-foreground" />
                    <label className="text-sm font-medium text-foreground">Hospitals</label>
                  </div>
                  <div className="space-y-2">
                    {createHospitals.length > 0 && (
                        <div className="space-y-2">
                          {createHospitals.map((hospital, i) => (
                            <div key={i} className="border border-border rounded-lg overflow-hidden bg-background">
                              <button
                                type="button"
                                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                                onClick={() => setCreateHospitalExpanded(createHospitalExpanded === i ? null : i)}
                              >
                                <div className="flex items-center gap-2">
                                  <Hospital className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{hospital.name || "Unnamed Hospital"}</span>
                                  {hospital.visibility === "private" && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">Private</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setCreateHospitals((prev) => prev.filter((_, idx) => idx !== i)); }}
                                    className="p-1 hover:text-destructive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  {createHospitalExpanded === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </button>
                              {createHospitalExpanded === i && (
                                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                                  <div>
                                    <label className="text-xs text-muted-foreground">Name *</label>
                                    <Input
                                      value={hospital.name}
                                      onChange={(e) => {
                                        const updated = [...createHospitals];
                                        updated[i] = { ...updated[i], name: e.target.value };
                                        setCreateHospitals(updated);
                                      }}
                                      placeholder="Hospital name"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-muted-foreground">Visibility:</label>
                                    <button
                                      type="button"
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        hospital.visibility === "private"
                                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                                          : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                      }`}
                                      onClick={() => {
                                        const updated = [...createHospitals];
                                        updated[i] = { ...updated[i], visibility: hospital.visibility === "private" ? "public" : "private" };
                                        setCreateHospitals(updated);
                                      }}
                                    >
                                      {hospital.visibility === "private" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      {hospital.visibility === "private" ? "Private" : "Public"}
                                    </button>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">URL</label>
                                    <Input
                                      value={hospital.url || ""}
                                      onChange={(e) => {
                                        const updated = [...createHospitals];
                                        updated[i] = { ...updated[i], url: e.target.value || undefined };
                                        setCreateHospitals(updated);
                                      }}
                                      placeholder="https://hospital-website.com"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Map Link</label>
                                    <Input
                                      value={hospital.mapLink || ""}
                                      onChange={(e) => {
                                        const updated = [...createHospitals];
                                        updated[i] = { ...updated[i], mapLink: e.target.value || undefined };
                                        setCreateHospitals(updated);
                                      }}
                                      placeholder="https://maps.google.com/..."
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Website</label>
                                    <Input
                                      value={hospital.website || ""}
                                      onChange={(e) => {
                                        const updated = [...createHospitals];
                                        updated[i] = { ...updated[i], website: e.target.value || undefined };
                                        setCreateHospitals(updated);
                                      }}
                                      placeholder="https://..."
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Description</label>
                                    <Textarea
                                      value={hospital.description || ""}
                                      onChange={(e) => {
                                        const updated = [...createHospitals];
                                        updated[i] = { ...updated[i], description: e.target.value || undefined };
                                        setCreateHospitals(updated);
                                      }}
                                      placeholder="Brief description of this hospital"
                                      rows={2}
                                      className="resize-y min-h-[60px]"
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    <ImageIcon className="w-3 h-3 inline mr-1" />
                                    Images can be added after mission is created (via Edit).
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. Al-Bashir Hospital"
                        value={createHospitalInput}
                        onChange={(e) => setCreateHospitalInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && createHospitalInput.trim()) {
                            e.preventDefault();
                            const newIdx = createHospitals.length;
                            setCreateHospitals((prev) => [...prev, { name: createHospitalInput.trim() }]);
                            setCreateHospitalInput("");
                            setCreateHospitalExpanded(newIdx);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!createHospitalInput.trim()}
                        onClick={() => {
                          const newIdx = createHospitals.length;
                          setCreateHospitals((prev) => [...prev, { name: createHospitalInput.trim() }]);
                          setCreateHospitalInput("");
                          setCreateHospitalExpanded(newIdx);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    placeholder="Mission description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="resize-y min-h-[80px]"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DatePicker
                    label="Start Date"
                    type="future"
                    value={createForm.startDate}
                    onChange={(v) => setCreateForm({ ...createForm, startDate: v })}
                  />
                  <DatePicker
                    label="End Date"
                    type="future"
                    value={createForm.endDate}
                    onChange={(v) => setCreateForm({ ...createForm, endDate: v })}
                  />
                </div>

                {/* URLs Section */}
                <div>
                  <label className="text-sm font-medium text-foreground">Links</label>
                  <div className="space-y-2 mt-1">
                    {createUrls.map((urlItem, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-1">
                          <Input
                            placeholder="Display name"
                            value={urlItem.displayName}
                            onChange={(e) => {
                              const updated = [...createUrls];
                              updated[i] = { ...updated[i], displayName: e.target.value };
                              setCreateUrls(updated);
                            }}
                          />
                          <Input
                            placeholder="https://..."
                            value={urlItem.url}
                            onChange={(e) => {
                              const updated = [...createUrls];
                              updated[i] = { ...updated[i], url: e.target.value };
                              setCreateUrls(updated);
                            }}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCreateUrls((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCreateUrls((prev) => [...prev, { url: "", displayName: "" }])}
                    >
                      <LinkIcon className="w-4 h-4 mr-2" /> Add Link
                    </Button>
                  </div>
                </div>

                {/* Staged Attachments Section */}
                <div>
                  <label className="text-sm font-medium text-foreground">Attachments</label>
                  <div className="space-y-2 mt-1">
                    {createPendingFiles.map((pf, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border border-border">
                        {pf.file.type.startsWith("image/") ? (
                          <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{pf.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{pf.file.name}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCreatePendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <input
                      ref={createFileRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleCreateAddFile}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createFileRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" /> Add File
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      PDF, PNG, JPG (max 10MB). Files will be uploaded after mission is created.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={!createForm.name || !createForm.country || isMutating}
                  className="w-full"
                >
                  {isMutating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {createProgress || "Creating..."}
                    </>
                  ) : (
                    "Create Mission"
                  )}
                </Button>
              </div>
          </DialogContent>
        </Dialog>
      </div>

      {missionsData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No missions yet.</p>
          <p className="text-sm mt-1">Create your first mission to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden border border-border">
          <Table
            data={missionsData}
            columns={columns}
            backgroundColor="background"
            textColor="foreground"
            borderColor="border"
            headerBackgroundColor="muted"
            headerTextColor="muted-foreground"
            hoverBackgroundColor="muted/50"
            hoverTextColor="foreground"
            stickyHeader={true}
          />
        </div>
      )}

      {/* Edit Mission Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="shadow-sm max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Mission</DialogTitle>
          </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Country</label>
                  <Input
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">City</label>
                  <Input
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  />
                </div>
              </div>
              {/* Hospitals Section */}
              <div className="bg-muted/40 border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Hospital className="w-4 h-4 text-muted-foreground" />
                  <label className="text-sm font-medium text-foreground">Hospitals</label>
                </div>
                <div className="space-y-2">
                  {editHospitals.length > 0 && (
                      <div className="space-y-2">
                        {editHospitals.map((hospital, i) => (
                          <div key={i} className="border border-border rounded-lg overflow-hidden bg-background">
                            <button
                              type="button"
                              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                              onClick={() => setEditHospitalExpanded(editHospitalExpanded === i ? null : i)}
                            >
                              <div className="flex items-center gap-2">
                                <Hospital className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{hospital.name || "Unnamed Hospital"}</span>
                                {hospital.visibility === "private" && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">Private</span>
                                )}
                                {(hospital.images?.length ?? 0) > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                                    {hospital.images!.length} img
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setEditHospitals((prev) => prev.filter((_, idx) => idx !== i)); }}
                                  className="p-1 hover:text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {editHospitalExpanded === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </button>
                            {editHospitalExpanded === i && (
                              <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">Name *</label>
                                  <Input
                                    value={hospital.name}
                                    onChange={(e) => {
                                      const updated = [...editHospitals];
                                      updated[i] = { ...updated[i], name: e.target.value };
                                      setEditHospitals(updated);
                                    }}
                                    placeholder="Hospital name"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-muted-foreground">Visibility:</label>
                                  <button
                                    type="button"
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      hospital.visibility === "private"
                                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                                        : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                    }`}
                                    onClick={() => {
                                      const updated = [...editHospitals];
                                      updated[i] = { ...updated[i], visibility: hospital.visibility === "private" ? "public" : "private" };
                                      setEditHospitals(updated);
                                    }}
                                  >
                                    {hospital.visibility === "private" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    {hospital.visibility === "private" ? "Private" : "Public"}
                                  </button>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">URL</label>
                                  <Input
                                    value={hospital.url || ""}
                                    onChange={(e) => {
                                      const updated = [...editHospitals];
                                      updated[i] = { ...updated[i], url: e.target.value || undefined };
                                      setEditHospitals(updated);
                                    }}
                                    placeholder="https://hospital-website.com"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Map Link</label>
                                  <Input
                                    value={hospital.mapLink || ""}
                                    onChange={(e) => {
                                      const updated = [...editHospitals];
                                      updated[i] = { ...updated[i], mapLink: e.target.value || undefined };
                                      setEditHospitals(updated);
                                    }}
                                    placeholder="https://maps.google.com/..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Website</label>
                                  <Input
                                    value={hospital.website || ""}
                                    onChange={(e) => {
                                      const updated = [...editHospitals];
                                      updated[i] = { ...updated[i], website: e.target.value || undefined };
                                      setEditHospitals(updated);
                                    }}
                                    placeholder="https://..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Description</label>
                                  <Textarea
                                    value={hospital.description || ""}
                                    onChange={(e) => {
                                      const updated = [...editHospitals];
                                      updated[i] = { ...updated[i], description: e.target.value || undefined };
                                      setEditHospitals(updated);
                                    }}
                                    placeholder="Brief description of this hospital"
                                    rows={2}
                                    className="resize-y min-h-[60px]"
                                  />
                                </div>
                                {/* Hospital Images */}
                                <div>
                                  <label className="text-xs text-muted-foreground">Images (max 5)</label>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {(hospital.images || []).map((img, imgIdx) => (
                                      <div key={imgIdx} className="relative group w-16 h-16 rounded border border-border overflow-hidden bg-muted">
                                        <ImageIcon className="w-6 h-6 text-muted-foreground absolute inset-0 m-auto" />
                                        <p className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-black/50 text-white truncate px-0.5">
                                          {img.fileName}
                                        </p>
                                        <button
                                          type="button"
                                          className="absolute top-0 right-0 p-0.5 bg-destructive text-destructive-foreground rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={async () => {
                                            if (!editingMission) return;
                                            const deleted = await handleDeleteHospitalImage(editingMission.id, img.filePath);
                                            if (deleted) {
                                              const updated = [...editHospitals];
                                              updated[i] = {
                                                ...updated[i],
                                                images: (updated[i].images || []).filter((_, idx) => idx !== imgIdx),
                                              };
                                              setEditHospitals(updated);
                                            }
                                          }}
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                    {(hospital.images?.length ?? 0) < 5 && (
                                      <label className="w-16 h-16 rounded border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                                        <Plus className="w-5 h-5 text-muted-foreground" />
                                        <input
                                          type="file"
                                          accept="image/png,image/jpeg,image/jpg,image/webp"
                                          className="hidden"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file || !editingMission) return;
                                            e.target.value = "";
                                            const image = await handleUploadHospitalImage(editingMission.id, hospital.name, file);
                                            if (image) {
                                              const updated = [...editHospitals];
                                              updated[i] = {
                                                ...updated[i],
                                                images: [...(updated[i].images || []), image],
                                              };
                                              setEditHospitals(updated);
                                            }
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Al-Bashir Hospital"
                      value={editHospitalInput}
                      onChange={(e) => setEditHospitalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editHospitalInput.trim()) {
                          e.preventDefault();
                          const newIdx = editHospitals.length;
                          setEditHospitals((prev) => [...prev, { name: editHospitalInput.trim() }]);
                          setEditHospitalInput("");
                          setEditHospitalExpanded(newIdx);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!editHospitalInput.trim()}
                      onClick={() => {
                        const newIdx = editHospitals.length;
                        setEditHospitals((prev) => [...prev, { name: editHospitalInput.trim() }]);
                        setEditHospitalInput("");
                        setEditHospitalExpanded(newIdx);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="resize-y min-h-[80px]"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select
                  value={editForm.status}
                  onValueChange={(val) => setEditForm({ ...editForm, status: val })}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  label="Start Date"
                  type="past"
                  value={editForm.startDate}
                  onChange={(v) => setEditForm({ ...editForm, startDate: v })}
                />
                <DatePicker
                  label="End Date"
                  type="future"
                  value={editForm.endDate}
                  onChange={(v) => setEditForm({ ...editForm, endDate: v })}
                />
              </div>

              {/* URLs Section */}
              <div>
                <label className="text-sm font-medium text-foreground">Links</label>
                <div className="space-y-2 mt-1">
                  {editUrls.map((urlItem, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder="Display name"
                          value={urlItem.displayName}
                          onChange={(e) => {
                            const updated = [...editUrls];
                            updated[i] = { ...updated[i], displayName: e.target.value };
                            setEditUrls(updated);
                          }}
                        />
                        <Input
                          placeholder="https://..."
                          value={urlItem.url}
                          onChange={(e) => {
                            const updated = [...editUrls];
                            updated[i] = { ...updated[i], url: e.target.value };
                            setEditUrls(updated);
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditUrls((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditUrls((prev) => [...prev, { url: "", displayName: "" }])}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" /> Add Link
                  </Button>
                </div>
              </div>

              {/* Attachments Section */}
              <div>
                <label className="text-sm font-medium text-foreground">Attachments</label>
                <div className="space-y-2 mt-1">
                  {editAttachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 p-2 rounded border border-border">
                      {att.contentType.startsWith("image/") ? (
                        <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {att.contentType} {att.fileSize ? `· ${Math.round(att.fileSize / 1024)}KB` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleEditDeleteAttachment(att.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <input
                    ref={editFileRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleEditUploadFile}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editFileRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" /> Upload Attachment
                  </Button>
                </div>
              </div>

              <Button onClick={handleEditClick} disabled={isMutating} className="w-full">
                {isMutating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Mission Members Dialog */}
      <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
        <DialogContent className="shadow-sm max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Mission Members
              {selectedMissionId && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({selectedMissionMembers.length} members)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setIsAddMemberOpen(true);
                  setAddMemberQuery("");
                  setSelectedUsersToAdd([]);
                  fetchAllUsers();
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" /> Add Member
              </Button>
              {selectedMissionId && (() => {
                const mission = missionsData.find((m) => m.id === selectedMissionId);
                return mission?.groupChatThreadId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/messages/${mission.groupChatThreadId}`, "_blank")}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> View Group Chat
                  </Button>
                ) : null;
              })()}
            </div>

            {selectedMissionMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members assigned yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedMissionMembers.map((member) => (
                  <div key={member.id} className="flex justify-between items-center p-2 rounded border border-border">
                    <div>
                      <p className="font-medium text-sm">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.accountType}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => selectedMissionId && handleRemoveMember(selectedMissionId, member.id)}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog — full user list with client-side filter + multi-select */}
      <Dialog open={isAddMemberOpen} onOpenChange={(open) => {
        setIsAddMemberOpen(open);
        if (open) {
          fetchAllUsers();
        } else {
          setSelectedUsersToAdd([]);
          setAddMemberQuery("");
        }
      }}>
        <DialogContent className="shadow-sm max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Members to Mission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selected users chips */}
            {selectedUsersToAdd.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsersToAdd.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {user.firstName} {user.lastName}
                    <button
                      type="button"
                      onClick={() => setSelectedUsersToAdd((prev) => prev.filter((u) => u.id !== user.id))}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <Input
              placeholder="Filter by name, email, or role..."
              value={addMemberQuery}
              onChange={(e) => setAddMemberQuery(e.target.value)}
            />

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
                </div>
              ) : addableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {addMemberQuery
                    ? "No matching users."
                    : "All users are already members of this mission."}
                </p>
              ) : (
                addableUsers.map((user) => {
                  const isSelected = selectedUsersToAdd.some((u) => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUserSelection({
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        accountType: user.accountType ?? null,
                      })}
                      className={`w-full flex items-center gap-3 p-2 rounded text-left hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      <Checkbox checked={isSelected} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email} {user.accountType ? `· ${user.accountType}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <Button
              onClick={handleBulkAddMembers}
              disabled={selectedUsersToAdd.length === 0 || isMutating}
              className="w-full"
            >
              {isMutating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add {selectedUsersToAdd.length || ""} Staff to Mission
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Confirmation — shows what changed + notification warning */}
      <ConfirmModal
        isOpen={!!editConfirmChanges}
        onClose={() => setEditConfirmChanges(null)}
        title="Confirm Mission Update"
        message={
          <div className="space-y-3">
            <p className="text-sm font-medium">The following changes will be saved:</p>
            <ul className="list-disc pl-5 space-y-1">
              {(editConfirmChanges || []).map((change, i) => (
                <li key={i} className="text-sm text-muted-foreground">{change}</li>
              ))}
            </ul>
            {editingMission && (editingMission.memberCount ?? 0) > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                A notification about these changes will be sent to {editingMission.memberCount} mission member(s).
              </p>
            )}
          </div>
        }
        confirmText="Save & Notify"
        onConfirm={handleEditConfirmed}
        isLoading={isMutating}
      />

      {/* Delete Mission Confirmation */}
      <ConfirmModal
        isOpen={!!deletingMission}
        onClose={() => {
          setDeletingMission(null);
          setArchiveChat(true);
        }}
        title="Delete Mission"
        message={
          <div className="space-y-3">
            <p>
              Are you sure you want to delete <strong>{deletingMission?.name}</strong>?
            </p>
            {(deletingMission?.memberCount ?? 0) > 0 && (
              <p className="text-sm text-muted-foreground">
                This mission will be removed from {deletingMission?.memberCount} user profile(s)
                and untagged from any associated patients. This action is logged and cannot be undone.
              </p>
            )}
            {deletingMission?.groupChatThreadId && (
              <div className="border border-border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">Group Chat</p>
                <p className="text-xs text-muted-foreground">
                  This mission has an associated group chat. A farewell message will be sent on your behalf.
                </p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={archiveChat}
                    onCheckedChange={(checked) => setArchiveChat(!!checked)}
                  />
                  <label className="text-sm">
                    Archive chat (keep messages read-only)
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {archiveChat
                    ? "The chat will be locked but still viewable by members."
                    : "The chat and all messages will be permanently deleted."}
                </p>
              </div>
            )}
          </div>
        }
        confirmText="Delete Mission"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={isMutating}
      />
    </div>
  );
}
