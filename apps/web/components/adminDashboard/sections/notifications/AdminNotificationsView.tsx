// apps/web/components/adminDashboard/sections/notifications/AdminNotificationsView.tsx
"use client";

import { useRef } from "react";
import { useAdminNotifications } from "./AdminNotificationsViewModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PreviousNotificationsTable } from "./PreviousNotificationsTable";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminUserNotificationsView } from "@/components/adminDashboard/sections/notifications/AdminUserNotificationsView";
import { CentralNotificationsView } from "@/components/adminDashboard/sections/notifications/CentralNotificationsView";
import PushNotificationsMonitorView from "./PushNotificationsMonitorView";
import { AdminPushDevicesView } from "@/components/adminDashboard/sections/notifications/AdminPushDevicesView";
import { Plus, X, Upload, Image as ImageIcon, List, ListOrdered, Link as LinkIcon } from "lucide-react";

export function AdminNotificationsView() {
  const {
    message,
    setMessage,
    type,
    setType,
    sendNotification,
    loading,
    success,
    error,
    notifications,
    notifyDoctors,
    setNotifyDoctors,
    notifyTriage,
    setNotifyTriage,
    actionUrl,
    setActionUrl,
    description,
    setDescription,
    links,
    addLink,
    updateLink,
    removeLink,
    images,
    uploadImage,
    removeImage,
    isUploadingImage,
  } = useAdminNotifications();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
      e.target.value = "";
    }
  };

  const insertListPrefix = (prefix: string) => {
    const textarea = document.querySelector<HTMLTextAreaElement>("#notification-description");
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = description;
    const before = value.substring(0, start);
    const selected = value.substring(start, end);
    const after = value.substring(end);

    if (selected) {
      const lines = selected.split("\n");
      const prefixed = lines.map((line, i) =>
        prefix === "1. " ? `${i + 1}. ${line}` : `${prefix}${line}`
      ).join("\n");
      setDescription(before + prefixed + after);
    } else {
      setDescription(before + prefix + after);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
      }, 0);
    }
  };

  return (
    <div className="p-6 border-border border-l-2 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Admin Notifications</h2>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="send-notification">
          <AccordionTrigger>Send Admin Notification</AccordionTrigger>
          <AccordionContent>
            {error && <p className="text-destructive mb-2">{error}</p>}
            {success && <p className="text-primary mb-2">{success}</p>}

            <label className="block mb-2 font-medium text-muted-foreground">
              Message
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message..."
              rows={4}
            />

            <label className="block mt-4 mb-2 font-medium text-muted-foreground">
              Notification Type
            </label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>

            {/* Checkboxes for notification recipients */}
            <div className="mt-4">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={notifyDoctors}
                  onCheckedChange={(checked) =>
                    setNotifyDoctors(checked as boolean)
                  }
                />
                <span>Notify Doctors</span>
              </label>
              <label className="flex items-center gap-2 mt-2">
                <Checkbox
                  checked={notifyTriage}
                  onCheckedChange={(checked) =>
                    setNotifyTriage(checked as boolean)
                  }
                />
                <span>Notify Triage Specialists</span>
              </label>
            </div>

            {/* Description with markdown list helpers */}
            <label className="block mt-4 mb-2 font-medium text-muted-foreground">
              Description (optional)
            </label>
            <div className="flex gap-1 mb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertListPrefix("- ")}
                className="gap-1"
              >
                <List className="h-4 w-4" />
                Bullet List
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertListPrefix("1. ")}
                className="gap-1"
              >
                <ListOrdered className="h-4 w-4" />
                Numbered List
              </Button>
            </div>
            <Textarea
              id="notification-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional detailed description (supports markdown lists)..."
              rows={4}
            />

            {/* Action URL */}
            <label className="block mt-4 mb-2 font-medium text-muted-foreground">
              Action URL (optional)
            </label>
            <Input
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="/profile, /profile?section=security, etc."
            />

            {/* Links */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-muted-foreground">
                  Links (optional)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLink}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Link
                </Button>
              </div>
              {links.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2 items-center">
                  <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    value={link.displayName}
                    onChange={(e) => updateLink(index, "displayName", e.target.value)}
                    placeholder="Display name"
                    className="flex-1"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateLink(index, "url", e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLink(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Images */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-muted-foreground">
                  Images (optional)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="gap-1"
                >
                  {isUploadingImage ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Image
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className="relative group border rounded-lg p-2 flex items-center gap-2 bg-muted/50"
                    >
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[150px]">
                        {img.fileName}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={sendNotification}
              disabled={loading}
              variant={"submit"}
              className="w-full mt-4 rounded-md border-destructive "
            >
              {loading ? "Sending..." : "Send Notification"}
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="previous-notifications">
          <AccordionTrigger>Previous Admin Notifications</AccordionTrigger>
          <AccordionContent>
            <PreviousNotificationsTable notifications={notifications} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="central-notifications">
          <AccordionTrigger>Central Notifications</AccordionTrigger>
          <AccordionContent>
            <CentralNotificationsView />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="user-notifications">
          <AccordionTrigger>User Notifications</AccordionTrigger>
          <AccordionContent>
            <AdminUserNotificationsView />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="push-monitoring">
          <AccordionTrigger>Push Notifications Monitoring</AccordionTrigger>
          <AccordionContent>
            <PushNotificationsMonitorView />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="push-devices">
          <AccordionTrigger>Push Devices Management</AccordionTrigger>
          <AccordionContent>
            <AdminPushDevicesView />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
