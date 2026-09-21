// apps/mobile/src/utils/admin/__tests__/adminApi.test.ts
import { adminApi } from '../adminApi';
declare const jest: any;
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

jest.mock('../../../utils/storage', () => ({
  storageUtils: {
    getToken: jest.fn(() => 'test-token'),
  },
}));

describe('adminApi', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('adds Authorization header when token is present', async () => {
    const mockResponse = { admins: [] };
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      status: 200,
      statusText: 'OK',
    });

    const result = await adminApi.getExistingAdmins();
    expect(result.admins).toEqual([]);
    const calledArgs = (globalThis.fetch as any).mock.calls[0];
    const headers = calledArgs[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
  });

  it('builds query params for searchAdmins', async () => {
    const mockResponse = { admins: [] };
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      status: 200,
      statusText: 'OK',
    });

    await adminApi.searchAdmins('john@example.com');
    const url = (globalThis.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('/api/admin/GET/admin-mgmt-search?search=john%40example.com');
  });

  it('throws on non-ok response', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Unauthorized',
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(adminApi.getExistingAdmins()).rejects.toThrow('Unauthorized');
  });
});
