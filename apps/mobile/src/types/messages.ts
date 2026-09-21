// apps/mobile/src/types/messages.ts
// Updated for PostgreSQL + PowerSync compatibility (Phase 2.1)

export interface Message {
  id: string;  // UUID v4 (PostgreSQL primary key)
  text: string;
  sender: string;
  senderId?: string;  // UUID reference to users.id
  timestamp: string | Date;
  type?:
    | 'text'
    | 'image'
    | 'audio'
    | 'file'
    | 'patient-card'
    | 'lead-request'
    | 'call-summary';
  mediaUrl?: string;
  signedUrl?: string;
  isSelf?: boolean;
  fileName?: string;
  queued?: boolean; // true when message is queued for sending while offline
  // PowerSync metadata fields
  powersync_id?: string;
  powersync_updated_at?: string;
}

export interface Participant {
  id: string;  // UUID v4 (PostgreSQL primary key)
  firstName?: string;
  lastName?: string;
  email?: string;
  image?: string;
  accountType?: string;
  doctorSpecialty?: string[];
  // PowerSync metadata fields
  powersync_id?: string;
  powersync_updated_at?: string;
}

export interface ThreadInfo {
  title?: string;
  participants?: Participant[];
  id?: string;  // UUID reference
}

export interface Thread {
  id?: string;  // UUID v4 (PostgreSQL primary key)
  chatId?: string;
  participants: string[];  // UUID references to users.id
  unreadCount: number;
  messages: Message[];
  title?: string;
  type: 'internal' | 'telegram';
  isGroupChat?: boolean;
  slug?: string;
  lastActivity?: string | Date;
  // PowerSync metadata fields
  powersync_id?: string;
  powersync_updated_at?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  accountType: 'Doctor' | 'Triage';
  firstName: string;
  lastName: string;
  city: string;
  countries: string[];
  languages: string[];
  doctorSpecialty?: string[];
  image?: string;
  isAdmin: boolean;
  dob?: string | Date;
  gender?: 'Male' | 'Female';
  token?: string;
  userSettings?: string;
  userNotifications?: string;
  userMessages?: string;
}
