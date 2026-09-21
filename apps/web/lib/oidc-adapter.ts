// apps/web/lib/oidc-adapter.ts
// Database adapter for oidc-provider to persist authorization codes, tokens, and sessions

import { eq, and, lt } from 'drizzle-orm';
import { db } from '@/db/connection';
import {
  oidcAuthorizationCodes,
  oidcAccessTokens,
  oidcRefreshTokens,
  oidcSessions,
  oidcInteractions,
  oidcGrants,
  oidcDeviceCodes,
  oidcClientCredentials,
  oidcPushedAuthorizationRequests,
  oidcReplayDetection,
  oidcBackchannelAuthRequests,
} from '@/db/schema/oidc';

// Map model names to their database tables
const models: Record<string, any> = {
  AuthorizationCode: oidcAuthorizationCodes,
  AccessToken: oidcAccessTokens,
  RefreshToken: oidcRefreshTokens,
  Session: oidcSessions,
  Interaction: oidcInteractions,
  Grant: oidcGrants,
  DeviceCode: oidcDeviceCodes,
  ClientCredentials: oidcClientCredentials,
  PushedAuthorizationRequest: oidcPushedAuthorizationRequests,
  ReplayDetection: oidcReplayDetection,
  BackchannelAuthenticationRequest: oidcBackchannelAuthRequests,
};

// Models that support grant ID for cascading operations
const grantable = new Set([
  'AuthorizationCode',
  'AccessToken',
  'RefreshToken',
  'Session',
  'DeviceCode',
]);

// Models that support consumption (marking as used)
const consumable = new Set([
  'AuthorizationCode',
  'RefreshToken',
  'DeviceCode',
]);

export class DrizzleOidcAdapter {
  private model: string;
  private table: any;

  constructor(model: string) {
    this.model = model;
    this.table = models[model];

    if (!this.table) {
      throw new Error(`Unknown OIDC model: ${model}`);
    }
  }

  // Create or update a record
  async upsert(id: string, payload: any, expiresIn: number): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const data: any = {
      id,
      payload,
      expiresAt,
    };

    // Add grantId for grantable models
    if (grantable.has(this.model) && payload.grantId) {
      data.grantId = payload.grantId;
    }

    // Handle DeviceCode's userCode
    if (this.model === 'DeviceCode' && payload.userCode) {
      data.userCode = payload.userCode;
    }

    try {
      // Try to insert first
      await db.insert(this.table).values(data).onConflictDoUpdate({
        target: this.table.id,
        set: {
          payload,
          expiresAt,
          ...(data.grantId && { grantId: data.grantId }),
          ...(data.userCode && { userCode: data.userCode }),
        },
      });
    } catch (error) {
      console.error(`OIDC Adapter upsert error for ${this.model}:`, error);
      throw error;
    }
  }

  // Find a record by ID
  async find(id: string): Promise<any | undefined> {
    try {
      const result = await db
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);

      if (!result.length) {
        return undefined;
      }

      const record = result[0];

      // Check if expired
      if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
        return undefined;
      }

      // Return payload with consumed info if applicable
      const payload = record.payload as any;

      if (consumable.has(this.model) && record.consumedAt) {
        payload.consumed = true;
      }

      return payload;
    } catch (error) {
      console.error(`OIDC Adapter find error for ${this.model}:`, error);
      return undefined;
    }
  }

  // Find a DeviceCode by userCode
  async findByUserCode(userCode: string): Promise<any | undefined> {
    if (this.model !== 'DeviceCode') {
      return undefined;
    }

    try {
      const result = await db
        .select()
        .from(this.table)
        .where(eq(this.table.userCode, userCode))
        .limit(1);

      if (!result.length) {
        return undefined;
      }

      const record = result[0];

      // Check if expired
      if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
        return undefined;
      }

      const payload = record.payload as any;

      if (record.consumedAt) {
        payload.consumed = true;
      }

      return payload;
    } catch (error) {
      console.error('OIDC Adapter findByUserCode error:', error);
      return undefined;
    }
  }

  // Find a record by UID (alias for find)
  async findByUid(uid: string): Promise<any | undefined> {
    return this.find(uid);
  }

  // Mark a record as consumed
  async consume(id: string): Promise<void> {
    if (!consumable.has(this.model)) {
      return;
    }

    try {
      await db
        .update(this.table)
        .set({ consumedAt: new Date() })
        .where(eq(this.table.id, id));
    } catch (error) {
      console.error(`OIDC Adapter consume error for ${this.model}:`, error);
    }
  }

  // Delete a record by ID
  async destroy(id: string): Promise<void> {
    try {
      await db.delete(this.table).where(eq(this.table.id, id));
    } catch (error) {
      console.error(`OIDC Adapter destroy error for ${this.model}:`, error);
    }
  }

  // Revoke all tokens associated with a grant
  async revokeByGrantId(grantId: string): Promise<void> {
    if (!grantable.has(this.model)) {
      return;
    }

    try {
      await db.delete(this.table).where(eq(this.table.grantId, grantId));
    } catch (error) {
      console.error(`OIDC Adapter revokeByGrantId error for ${this.model}:`, error);
    }
  }
}

// Factory function for oidc-provider
export function createOidcAdapter(model: string): DrizzleOidcAdapter {
  return new DrizzleOidcAdapter(model);
}

// Cleanup function to remove expired records
export async function cleanupExpiredOidcRecords(): Promise<void> {
  const now = new Date();

  const tables = Object.values(models);

  for (const table of tables) {
    try {
      await db.delete(table).where(lt(table.expiresAt, now));
    } catch (error) {
      // Some tables might not exist yet, ignore errors
    }
  }
}
