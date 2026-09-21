"use client";

import React from "react";
import { Avatar } from "@/components/ui/avatar";
import { X } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  image?: string;
}

interface SelectedUserBadgesProps {
  users: User[];
  onRemove: (userId: string) => void;
}

export function SelectedUserBadges({ users, onRemove }: SelectedUserBadgesProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-2 bg-muted rounded-full pl-1 pr-2 py-1"
        >
          <Avatar
            src={user.image}
            initials={`${user.firstName[0]}${user.lastName[0]}`}
            className="h-6 w-6"
          />
          <span className="text-sm">
            {user.firstName} {user.lastName}
          </span>
          <button
            type="button"
            onClick={() => onRemove(user.id)}
            className="hover:bg-background rounded-full p-0.5 transition"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
