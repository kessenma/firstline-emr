import React from 'react';
import { ThreadDetailScreenView } from './messages/threads/ThreadDetailScreenView';
import { Thread } from '../types/messages';

interface ThreadDetailScreenProps {
  thread: Thread;
  currentUserId: string;
  onBack: () => void;
}

export default function ThreadDetailScreen({
  thread,
  currentUserId,
  onBack,
}: ThreadDetailScreenProps) {
  return (
    <ThreadDetailScreenView
      thread={thread}
      currentUserId={currentUserId}
      onBack={onBack}
    />
  );
}
