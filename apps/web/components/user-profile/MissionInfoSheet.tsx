"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import {
  MessageSquare,
  Loader2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Hospital,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import { getMediaUrl } from "@/lib/media";
import type { MissionUrl, MissionHospital } from "@/db/schema/missions";

interface MissionMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  image: string | null;
  accountType: string;
  doctorSpecialty: string[];
}

interface MissionAttachmentInfo {
  id: string;
  displayName: string;
  fileName: string;
  contentType: string;
  fileSize: number | null;
  filePath: string;
}

interface MissionInfoSheetProps {
  missionId: string;
  missionName: string;
  description?: string | null;
  country: string;
  city?: string | null;
  hospitals?: MissionHospital[] | string[] | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  urls?: MissionUrl[] | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MissionInfoSheet({
  missionId,
  missionName,
  description,
  country,
  city,
  hospitals,
  status,
  startDate,
  endDate,
  urls,
  isOpen,
  onClose,
}: MissionInfoSheetProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<MissionMember[]>([]);
  const [attachments, setAttachments] = useState<MissionAttachmentInfo[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [creatingDmFor, setCreatingDmFor] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const res = await fetch(`/api/missions/${missionId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error("Error fetching mission members:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [missionId]);

  const fetchAttachments = useCallback(async () => {
    setIsLoadingAttachments(true);
    try {
      const res = await fetch(`/api/missions/${missionId}/attachments`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data.attachments || []);
      }
    } catch (err) {
      console.error("Error fetching mission attachments:", err);
    } finally {
      setIsLoadingAttachments(false);
    }
  }, [missionId]);

  useEffect(() => {
    if (isOpen && missionId) {
      fetchMembers();
      fetchAttachments();
    }
  }, [isOpen, missionId, fetchMembers, fetchAttachments]);

  const handleStartDm = async (memberId: string) => {
    if (creatingDmFor) return;
    setCreatingDmFor(memberId);
    try {
      const res = await fetch("/api/internal-messages/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: memberId }),
      });
      if (res.ok) {
        const data = await res.json();
        onClose();
        router.push(`/messages/${data.thread.id}`);
      }
    } catch (err) {
      console.error("Error creating DM thread:", err);
    } finally {
      setCreatingDmFor(null);
    }
  };

  const handleViewAttachment = async (filePath: string) => {
    setViewingFile(filePath);
    try {
      const signedUrl = await getMediaUrl(filePath);
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      }
    } catch (err) {
      console.error("Error getting signed URL:", err);
    } finally {
      setViewingFile(null);
    }
  };

  const currentUserId = (session?.user as any)?.id;

  const statusColors: Record<string, string> = {
    planned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{missionName}</SheetTitle>
          <SheetDescription>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.planned}`}>
              {status}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Mission Details */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{country}{city ? `, ${city}` : ""}</span>
              </div>
              {hospitals && hospitals.length > 0 && (() => {
                // Normalize: support both legacy string[] and MissionHospital[]
                const parsed: MissionHospital[] = hospitals.map((h: any) =>
                  typeof h === "string" ? { name: h } : h
                );
                return parsed.map((hospital, hIdx) => (
                  <div key={hIdx} className="rounded-lg border border-border p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Hospital className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium text-foreground">{hospital.name}</span>
                      {hospital.visibility === "private" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200 inline-flex items-center gap-0.5">
                          <EyeOff className="w-2.5 h-2.5" /> Private
                        </span>
                      )}
                    </div>
                    {hospital.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{hospital.description}</p>
                    )}
                    {(hospital.url || hospital.website || hospital.mapLink) && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {hospital.url && (
                          <a href={hospital.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="w-3 h-3" /> URL
                          </a>
                        )}
                        {hospital.website && (
                          <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <Globe className="w-3 h-3" /> Website
                          </a>
                        )}
                        {hospital.mapLink && (
                          <a href={hospital.mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <MapPin className="w-3 h-3" /> Map
                          </a>
                        )}
                      </div>
                    )}
                    {hospital.images && hospital.images.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {hospital.images.map((img, imgIdx) => (
                          <button
                            key={imgIdx}
                            type="button"
                            onClick={() => handleViewAttachment(img.filePath)}
                            className="w-14 h-14 rounded border border-border overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all relative"
                          >
                            <ImageIcon className="w-5 h-5 text-muted-foreground absolute inset-0 m-auto" />
                            {viewingFile === img.filePath && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ));
              })()}
              {(startDate || endDate) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>
                    {startDate ? formatDate(startDate) : "TBD"}
                    {" - "}
                    {endDate ? formatDate(endDate) : "TBD"}
                  </span>
                </div>
              )}
              {description && (
                <p className="text-muted-foreground whitespace-pre-wrap mt-2">
                  {description}
                </p>
              )}
            </div>
          </section>

          {/* Links */}
          {urls && urls.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Links</h3>
              <div className="space-y-1">
                {urls.map((u, i) => (
                  <a
                    key={i}
                    href={u.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors text-sm text-primary"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    <span className="truncate">{u.displayName || u.url}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Attachments */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Attachments</h3>
            {isLoadingAttachments ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No attachments.</p>
            ) : (
              <div className="space-y-1">
                {attachments.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => handleViewAttachment(att.filePath)}
                    disabled={viewingFile === att.filePath}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors text-left"
                  >
                    {att.contentType.startsWith("image/") ? (
                      <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {att.fileSize ? `${Math.round(att.fileSize / 1024)}KB` : ""}
                      </p>
                    </div>
                    {viewingFile === att.filePath ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Team Members */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Team Members
              {!isLoadingMembers && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({members.length})
                </span>
              )}
            </h3>
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground">No members.</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const isCurrentUser = member.id === currentUserId;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar
                        src={member.image || undefined}
                        initials={`${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`}
                        alt={`${member.firstName} ${member.lastName}`}
                        className="h-10 w-10 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.firstName} {member.lastName}
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (you)
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {member.accountType}
                          </span>
                          {member.doctorSpecialty?.length > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              {member.doctorSpecialty.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      {!isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => handleStartDm(member.id)}
                          disabled={creatingDmFor !== null}
                          className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                          title={`Message ${member.firstName}`}
                        >
                          {creatingDmFor === member.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
