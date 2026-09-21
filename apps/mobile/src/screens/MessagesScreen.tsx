import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessagesScreenView } from './messages/MessagesScreenView';
import { useRoute } from '@react-navigation/native';

interface MessagesScreenProps {
  onBack?: () => void;
}

export default function MessagesScreen({
  onBack: _onBack,
}: MessagesScreenProps) {
  const { user } = useAuth();
  const route = useRoute<any>();
  const openThreadId = route?.params?.openThreadId as string | undefined;

  if (!user) {
    return null;
  }

  return <MessagesScreenView userId={user.id} openThreadId={openThreadId} />;
}
