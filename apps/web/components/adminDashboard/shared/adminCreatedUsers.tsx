'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/Table/Table';
import { TableColumn } from '@/components/ui/Table/types';
import { Loader2, Users, Calendar, ChevronDown, ChevronUp, UserCog, Mail } from 'lucide-react';
import { useToast } from '@/components/hooks/useToast';
import { useSession } from 'next-auth/react';

interface AdminCreatedUser {
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
  accountConfirmed?: boolean;
  followUpEmails?: {
    sentBy: {
      adminId: string;
      adminEmail: string;
      adminName: string;
    };
    sentAt: string;
    emailType: 'follow-up' | 'reminder';
  }[];
}

interface AdminCreatedUsersProps {
  title?: string;
  showConfirmedUsers?: boolean;
  onUserUpdate?: () => void;
  className?: string;
}

export function AdminCreatedUsers({ 
  title = "Admin-Created Users", 
  showConfirmedUsers = false,
  onUserUpdate,
  className = ""
}: AdminCreatedUsersProps) {
  const [users, setUsers] = useState<AdminCreatedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState<string | null>(null);
  const { setToast } = useToast();
  const { data: session } = useSession();
  const token = (session?.user as any)?.token;

  const loadUsers = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const endpoint = showConfirmedUsers ? '/api/admin/GET/confirmed-users' : '/api/admin-signup/pending-users';
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || data.pendingUsers || data.confirmedUsers || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setToast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [token, showConfirmedUsers, setToast]);

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

      await loadUsers();
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
    if (showUsers && token) {
      loadUsers();
    }
  }, [showUsers, token, showConfirmedUsers, loadUsers]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: TableColumn<AdminCreatedUser>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (value: any, user: AdminCreatedUser) => (
        <div className="flex flex-col">
          <span className="font-medium">{`${user.firstName} ${user.lastName}`}</span>
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </div>
      )
    },
    {
      key: 'accountType',
      header: 'Account Type',
      render: (value: string, user: AdminCreatedUser) => (
        <div className="flex flex-col gap-1">
          <Badge variant="outline">{value}</Badge>
          {user.doctorSpecialty && (
            <Badge variant="secondary" className="text-xs">{user.doctorSpecialty}</Badge>
          )}
        </div>
      )
    },
    {
      key: 'adminCreatedBy',
      header: 'Created By',
      render: (value: any, user: AdminCreatedUser) => (
        <div className="flex flex-col">
          {user.adminCreatedBy ? (
            <>
              <span className="text-sm font-medium">
                {user.adminCreatedBy.adminName || 'Unknown Admin'}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.adminCreatedBy.adminEmail}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">N/A</span>
          )}
        </div>
      )
    },
    {
      key: 'adminCreatedDate',
      header: 'Created Date',
      render: (value: string) => (
        <span className="text-sm">{formatDate(value)}</span>
      )
    },
    {
      key: 'emailSentDate',
      header: 'Email Sent',
      render: (value: string) => (
        <span className="text-sm">{formatDate(value)}</span>
      )
    },
    {
      key: 'followUpEmails',
      header: 'Follow-up Emails',
      render: (value: any, user: AdminCreatedUser) => {
        const followUps = user.followUpEmails || [];
        if (followUps.length === 0) {
          return <span className="text-sm text-muted-foreground">None</span>;
        }
        
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="text-xs">
              {followUps.length} sent
            </Badge>
            {followUps.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Last: {formatDate(followUps[followUps.length - 1]?.sentAt)}
                <br />
                By: {followUps[followUps.length - 1]?.sentBy?.adminName || 'Unknown'}
              </div>
            )}
          </div>
        );
      }
    }
  ];

  // Add actions column for pending users
  if (!showConfirmedUsers) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      render: (value: any, user: AdminCreatedUser) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSendFollowUp(user._id)}
          disabled={sendingFollowUp === user._id}
          className="flex gap-2 items-center"
        >
          {sendingFollowUp === user._id ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Follow-up
            </>
          )}
        </Button>
      )
    });
  }

  const filteredUsers = users.filter(user => 
    showConfirmedUsers ? user.accountConfirmed : !user.accountConfirmed
  );

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <UserCog className="w-5 h-5" />
            {title}
            {filteredUsers.length > 0 && (
              <Badge variant="secondary">{filteredUsers.length}</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUsers(!showUsers)}
            className="flex gap-2 items-center"
          >
            {showUsers ? (
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
      
      {showUsers && (
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto mb-4 w-12 h-12 opacity-50" />
              <p>No {showConfirmedUsers ? 'confirmed' : 'pending'} admin-created users</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table
                data={filteredUsers}
                columns={columns}
                backgroundColor="card"
                textColor="foreground"
                borderColor="border"
                headerBackgroundColor="card"
                headerTextColor="foreground"
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
