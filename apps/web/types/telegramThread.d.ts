export interface IMessage {
  _id: string;
  text: string;
  sender: string;
  senderId?: string;
  timestamp: Date;
  type: "text" | "image" | "video" | "file" | "reply" | "forward" | "audio";
  mediaUrl: string;
  replyTo?: string;
  forwardedFrom?: string;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
}

export interface IPopulatedParticipant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  image?: string;
}

export interface IPatientInfo {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface ITelegramThread {
  _id: string;
  chatId: string;
  patientId:
    | string
    | {
        _id: string;
        firstName?: string;
        lastName?: string;
      };
  participants: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    image?: string;
  }[];
  unreadCount: number;
  status: "active" | "archived";
  messages: any[]; // optionally type this better later
}
