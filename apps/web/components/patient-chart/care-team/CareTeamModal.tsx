// apps/web/components/patient-chart/care-team/CareTeamModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioCard } from "@/components/ui/radio-card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Users, Crown, Loader2, UserPlus, LogOut, ShieldMinus, MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  getRolesForAccountType,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type CareTeamRole,
} from "@fajr/shared/care-team";
import { buildPatientCardPayload, serializePatientCard } from "@fajr/shared/patient-share";

interface CareTeamMember {
  id: string;
  patientId: string;
  userId: string;
  role: string;
  isLead: boolean;
  assignedAt: string;
  userName: string | null;
  userEmail: string | null;
  userAccountType: string | null;
}

interface CareTeamModalProps {
  patientId: string;
  patientName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CareTeamModal({ patientId, patientName, isOpen, onClose }: CareTeamModalProps) {
  const { data: session } = useSession();
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRequestLeadDrawerOpen, setIsRequestLeadDrawerOpen] = useState(false);
  const [leadRequestMessage, setLeadRequestMessage] = useState("");
  const [sendingLeadRequest, setSendingLeadRequest] = useState(false);

  const currentUserId = (session?.user as any)?._id || (session?.user as any)?.id || "";
  const accountType = (session?.user as any)?.accountType || "";
  const availableRoles = getRolesForAccountType(accountType);

  const [selectedRole, setSelectedRole] = useState<CareTeamRole | "">("");

  const currentUserMember = careTeam.find((m) => m.userId === currentUserId);
  const isOnTeam = !!currentUserMember;
  const isCurrentUserLead = currentUserMember?.isLead ?? false;
  const existingLead = careTeam.find((m) => m.isLead && m.role === "surgeon");
  const hasExistingLead = !!existingLead && existingLead.userId !== currentUserId;

  const fetchCareTeam = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/patient/care-team?patientId=${encodeURIComponent(patientId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch care team");
      const data = await res.json();
      setCareTeam(data.careTeam || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading care team");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (isOpen) {
      fetchCareTeam();
    }
  }, [isOpen, fetchCareTeam]);

  const handleJoinTeam = async (role: CareTeamRole) => {
    if (!currentUserId || !patientId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/patient/${encodeURIComponent(patientId)}/take-case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to join care team");
      await fetchCareTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join team");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!currentUserMember) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/patient/care-team?id=${encodeURIComponent(currentUserMember.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to leave care team");
      await fetchCareTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave team");
    } finally {
      setActionLoading(false);
    }
  };

  const handleYieldLead = async () => {
    if (!currentUserMember) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/patient/care-team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentUserMember.id, isLead: false }),
      });
      if (!res.ok) throw new Error("Failed to yield lead");
      await fetchCareTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to yield lead");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestLead = async () => {
    if (!existingLead || !currentUserId || !patientId) return;
    setSendingLeadRequest(true);
    setError(null);
    try {
      // Step 1: Join as assistant immediately
      const joinRes = await fetch(
        `/api/patient/${encodeURIComponent(patientId)}/take-case`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant" }),
        },
      );
      if (!joinRes.ok) throw new Error("Failed to join team as assistant");

      // Step 2: Refresh care team to get the new record
      await fetchCareTeam();

      // Step 3: Create/find DM thread with current lead
      const dmRes = await fetch("/api/internal-messages/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: existingLead.userId }),
      });
      if (!dmRes.ok) throw new Error("Failed to create message thread");
      const { thread } = await dmRes.json();

      // Step 4: Send patient-card message. Only the name is known here — the
      // rest of the card fills in from the chart when the recipient opens it.
      const patientCardPayload = buildPatientCardPayload({
        patientId,
        firstName: patientName?.split(" ")[0],
        lastName: patientName?.split(" ").slice(1).join(" "),
      });

      if (patientCardPayload) {
        await fetch(`/api/internal-messages/${encodeURIComponent(thread.id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: serializePatientCard(patientCardPayload),
            type: "patient-card",
          }),
        });
      }

      // Step 5: Send lead-request message
      const userName = (session?.user as any)?.firstName
        ? `${(session?.user as any).firstName} ${(session?.user as any).lastName || ""}`.trim()
        : (session?.user as any)?.email || "A doctor";

      // Re-fetch to get the assistant record
      const teamRes = await fetch(
        `/api/patient/care-team?patientId=${encodeURIComponent(patientId)}`,
      );
      const teamData = await teamRes.json();
      const updatedTeam: CareTeamMember[] = teamData.careTeam || [];
      const myRecord = updatedTeam.find((m) => m.userId === currentUserId);

      const leadRequestData = JSON.stringify({
        patientId,
        patientName: patientName || "Unknown Patient",
        requestingUserId: currentUserId,
        requestingUserName: userName,
        requestingCareTeamId: myRecord?.id || "",
        currentLeadUserId: existingLead.userId,
        currentLeadCareTeamId: existingLead.id,
        status: "pending",
        message: leadRequestMessage.trim() || undefined,
      });

      await fetch(`/api/internal-messages/${encodeURIComponent(thread.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: leadRequestData, type: "lead-request" }),
      });

      // Step 6: Close drawer, refresh, reset
      setIsRequestLeadDrawerOpen(false);
      setLeadRequestMessage("");
      setSelectedRole("");
      setCareTeam(updatedTeam);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send lead request",
      );
    } finally {
      setSendingLeadRequest(false);
    }
  };

  const ROLE_COLORS: Record<string, string> = {
    surgeon: "bg-blue-100 text-blue-800",
    assistant: "bg-green-100 text-green-800",
    consulting: "bg-purple-100 text-purple-800",
    triage: "bg-amber-100 text-amber-800",
    coordinator: "bg-gray-100 text-gray-800",
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Care Team {!loading && `(${careTeam.length})`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading care team...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          {/* Team Members List */}
          {!loading && careTeam.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No team members yet. Be the first to join!
            </div>
          )}

          {!loading && careTeam.length > 0 && (
            <div className="space-y-2">
              {careTeam.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2.5">
                    {member.isLead && (
                      <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                    <div>
                      <span className={`text-sm ${member.isLead ? "font-semibold" : "font-medium"}`}>
                        {member.userName || member.userEmail || "Unknown"}
                      </span>
                      {member.userId === currentUserId && (
                        <span className="text-xs text-muted-foreground ml-1.5">(you)</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      ROLE_COLORS[member.role] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {!loading && (
            <div className="border-t border-border pt-4 space-y-3">
              {/* Join Team - role picker */}
              {!isOnTeam && availableRoles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Select your role:
                  </h4>
                  <RadioCard.Root
                    value={selectedRole}
                    onValueChange={(v) => setSelectedRole(v as CareTeamRole)}
                    className="flex flex-col gap-2"
                  >
                    {availableRoles.map((role) => (
                      <RadioCard.Item key={role} value={role}>
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">{ROLE_LABELS[role]}</div>
                          <div className="text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS[role]}
                          </div>
                        </div>
                      </RadioCard.Item>
                    ))}
                  </RadioCard.Root>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!selectedRole) return;
                        if (selectedRole === "surgeon" && hasExistingLead) {
                          setIsRequestLeadDrawerOpen(true);
                        } else {
                          handleJoinTeam(selectedRole);
                          setSelectedRole("");
                        }
                      }}
                      disabled={!selectedRole || actionLoading}
                    >
                      {actionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {selectedRole === "surgeon" && hasExistingLead
                        ? "Request Lead"
                        : "Join Team"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Already on team - show leave / yield actions */}
              {isOnTeam && (
                <div className="flex gap-2">
                  {isCurrentUserLead && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleYieldLead}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <ShieldMinus className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Yield Lead
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLeaveTeam}
                    disabled={actionLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Leave Team
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Request Lead Drawer */}
    <Drawer
        isOpen={isRequestLeadDrawerOpen}
        onClose={() => {
          setIsRequestLeadDrawerOpen(false);
          setLeadRequestMessage("");
        }}
        direction="bottom"
      >
        <DrawerContent direction="bottom" size="60%" title="Request Lead Role">
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Current Lead</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {existingLead?.userName || existingLead?.userEmail || "Unknown"}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              You will join as <strong>Assistant</strong> immediately. A message
              will be sent to the current lead asking them to accept you as the
              new lead surgeon.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <Textarea
                value={leadRequestMessage}
                onChange={(e) => setLeadRequestMessage(e.target.value)}
                placeholder="Explain why you are requesting lead..."
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRequestLeadDrawerOpen(false);
                  setLeadRequestMessage("");
                }}
                disabled={sendingLeadRequest}
              >
                Cancel
              </Button>
              <Button onClick={handleRequestLead} disabled={sendingLeadRequest}>
                {sendingLeadRequest ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </DrawerContent>
    </Drawer>
    </>
  );
}
