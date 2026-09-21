'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Mail, Calendar, ChevronDown, ChevronUp, MailQuestion, FileQuestion, UserCog } from 'lucide-react';
import { useToast } from '@/components/hooks/useToast';
import { useSession } from 'next-auth/react';

interface PendingUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: 'Doctor' | 'Triage' | 'Evac';
  doctorSpecialty?: string;
  emailSentDate?: string;
  confirmationTokenExpiry?: Date;
  adminCreatedBy?: {
    adminId: string;
    adminEmail: string;
    adminName: string;
    createdAt: string;
  };
  adminCreatedDate?: string;
}

interface PendingAdminCreatedUsersProps {
  onUserUpdate?: () => void; // Callback to refresh parent data
}

export function PendingAdminCreatedUsers({ onUserUpdate }: PendingAdminCreatedUsersProps) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [showPendingUsers, setShowPendingUsers] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState<string | null>(null);
  const { setToast } = useToast();
  const { data: session } = useSession();
  const token = (session?.user as any)?.token;

  const loadPendingUsers = useCallback(async () => {
    if (!token) return;

    setLoadingPendingUsers(true);
    try {
      const response = await fetch('/api/admin-signup/pending-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending users');
      }

      const data = await response.json();
      setPendingUsers(data.pendingUsers || []);
    } catch (error) {
      console.error('Error loading pending users:', error);
      setToast({
        title: 'Error',
        description: 'Failed to load pending users',
        variant: 'destructive',
      });
    } finally {
      setLoadingPendingUsers(false);
    }
  }, [token, setToast]);

  const handleSendFollowUp = async (userId: string) => {
    if (!token) return;
    
    setSendingFollowUp(userId);
    try {
      const response = await fetch('/api/admin-signup/send-follow-up', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to send follow-up email');
      }

      setToast({
        title: 'Success',
        description: 'Follow-up email sent successfully',
        variant: 'default',
      });

      // Refresh pending users list
      await loadPendingUsers();
      
      // Notify parent component to refresh its data
      onUserUpdate?.();
    } catch (error) {
      console.error('Error sending follow-up email:', error);
      setToast({
        title: 'Error',
        description: 'Failed to send follow-up email',
        variant: 'destructive',
      });
    } finally {
      setSendingFollowUp(null);
    }
  };

  useEffect(() => {
    if (showPendingUsers && token) {
      loadPendingUsers();
    }
  }, [showPendingUsers, token, loadPendingUsers]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not sent';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <MailQuestion className="w-5 h-5" />
            Pending Admin-Created Accounts
            {pendingUsers.length > 0 && (
              <Badge variant="secondary">{pendingUsers.length}</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPendingUsers(!showPendingUsers)}
            className="flex gap-2 items-center"
          >
            {showPendingUsers ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {showPendingUsers && (
        <CardContent>
          {loadingPendingUsers ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading pending users...</span>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileQuestion className="mx-auto mb-4 w-12 h-12 opacity-50" />
              <p>No pending admin-created accounts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex justify-between items-center p-4 rounded-lg border bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex gap-2 items-center mb-2">
                      <h4 className="font-medium">
                        {user.firstName} {user.lastName}
                      </h4>
                      <Badge variant="outline">{user.accountType}</Badge>
                      {user.doctorSpecialty && (
                        <Badge variant="secondary">{user.doctorSpecialty}</Badge>
                      )}
                    </div>
                    <p className="mb-1 text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex gap-4 items-center text-xs text-muted-foreground">
                      <div className="flex gap-1 items-center">
                        <Calendar className="w-3 h-3" />
                        Email sent: {formatDate(user.emailSentDate)}
                      </div>
                      {user.adminCreatedBy && (
                        <div className="flex gap-1 items-center">
                          <UserCog className="w-3 h-3" />
                          Created by: {user.adminCreatedBy.adminName || user.adminCreatedBy.adminEmail}
                        </div>
                      )}
                      {user.adminCreatedDate && (
                        <div className="flex gap-1 items-center">
                          <Calendar className="w-3 h-3" />
                          Created: {formatDate(user.adminCreatedDate)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendFollowUp(user._id?.toString() || '')}
                    disabled={sendingFollowUp === (user._id?.toString() || '')}
                    className="flex gap-2 items-center"
                  >
                    {sendingFollowUp === (user._id?.toString() || '') ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Follow-up
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
