import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AdminProvider, useAdmin, AdminPermission } from '../AdminContext';
import { storageUtils } from '../../utils/storage';

// Mock storage
jest.mock('../../utils/storage', () => ({
  storageUtils: {
    getUser: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('AdminContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AdminProvider>{children}</AdminProvider>
  );

  describe('Admin Status Check', () => {
    it('should identify admin user', async () => {
      (storageUtils.getUser as jest.Mock).mockReturnValue({
        id: '123',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
      });

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
    });

    it('should identify non-admin user', async () => {
      (storageUtils.getUser as jest.Mock).mockReturnValue({
        id: '123',
        email: 'user@test.com',
        firstName: 'Regular',
        lastName: 'User',
        isAdmin: false,
      });

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
    });

    it('should handle no user', async () => {
      (storageUtils.getUser as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isAdminSessionActive).toBe(false);
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      (storageUtils.getUser as jest.Mock).mockReturnValue({
        id: '123',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
      });
    });

    it('should initialize admin session', async () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = false;
      await act(async () => {
        success = await result.current.initializeAdminSession();
      });

      expect(success).toBe(true);
      expect(result.current.isAdminSessionActive).toBe(true);
      expect(result.current.adminUser).toBeTruthy();
      expect(storageUtils.set).toHaveBeenCalled();
    });

    it('should end admin session', async () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initializeAdminSession();
      });

      act(() => {
        result.current.endAdminSession();
      });

      expect(result.current.isAdminSessionActive).toBe(false);
      expect(result.current.adminUser).toBeNull();
      expect(storageUtils.delete).toHaveBeenCalled();
    });

    it('should refresh admin session', async () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initializeAdminSession();
      });

      let success = false;
      await act(async () => {
        success = await result.current.refreshAdminSession();
      });

      expect(success).toBe(true);
    });

    it('should not initialize session for non-admin', async () => {
      (storageUtils.getUser as jest.Mock).mockReturnValue({
        id: '123',
        email: 'user@test.com',
        firstName: 'Regular',
        lastName: 'User',
        isAdmin: false,
      });

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success = true;
      await act(async () => {
        success = await result.current.initializeAdminSession();
      });

      expect(success).toBe(false);
      expect(result.current.isAdminSessionActive).toBe(false);
    });
  });

  describe('Permission Checking', () => {
    beforeEach(() => {
      (storageUtils.getUser as jest.Mock).mockReturnValue({
        id: '123',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
      });
    });

    it('should check single permission', async () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initializeAdminSession();
      });

      expect(result.current.hasPermission(AdminPermission.MANAGE_USERS)).toBe(true);
    });

    it('should check any permission', async () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initializeAdminSession();
      });

      const hasAny = result.current.hasAnyPermission([
        AdminPermission.MANAGE_USERS,
        AdminPermission.VIEW_ANALYTICS,
      ]);

      expect(hasAny).toBe(true);
    });

    it('should check all permissions', async () => {
      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initializeAdminSession();
      });

      const hasAll = result.current.hasAllPermissions([
        AdminPermission.MANAGE_USERS,
        AdminPermission.VIEW_ANALYTICS,
      ]);

      expect(hasAll).toBe(true);
    });
  });

  describe('Session Restoration', () => {
    it('should restore valid session', async () => {
      const mockSession = {
        adminUser: {
          id: '123',
          userId: '123',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@test.com',
        },
        permissions: [AdminPermission.MANAGE_USERS],
        lastActivity: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      (storageUtils.getUser as jest.Mock).mockReturnValue({
        id: '123',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
      });

      (storageUtils.get as jest.Mock).mockReturnValue(JSON.stringify(mockSession));

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdminSessionActive).toBe(true);
      expect(result.current.adminUser).toBeTruthy();
    });

    it('should not restore expired session', async () => {
      const mockSession = {
        adminUser: {
          id: '123',
          userId: '123',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@test.com',
        },
        permissions: [AdminPermission.MANAGE_USERS],
        lastActivity: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        expiresAt: Date.now() - 1000, // Expired
      };

      (storageUtils.getUser as jest.Mock).mockReturnValue({
        id: '123',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
      });

      (storageUtils.get as jest.Mock).mockReturnValue(JSON.stringify(mockSession));

      const { result } = renderHook(() => useAdmin(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdminSessionActive).toBe(false);
    });
  });
});
