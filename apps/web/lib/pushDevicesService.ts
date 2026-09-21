// apps/web/lib/pushDevicesService.ts
import { db } from "@/db";
import { pushDevices, users } from "@/db/schema";
import { eq, sql, and, or, like, desc } from "drizzle-orm";

export interface PushDeviceWithUser {
  id: string;
  userId: string | null;
  platform: (typeof pushDevices.$inferSelect)["platform"];
  token: string;
  environment: "dev" | "prod";
  isActive: boolean;
  lastSeenAt: Date;
  deviceId: string | null;
  deviceModel: string | null;
  appVersion: string | null;
  buildNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  userName: string | null;
  userEmail: string | null;
}

export interface DeviceStats {
  totalDevices: number;
  activeDevices: number;
  inactiveDevices: number;
  iosDevices: number;
  androidDevices: number;
  devEnvironment: number;
  prodEnvironment: number;
}

export interface FetchDevicesOptions {
  platform?: "ios" | "android";
  status?: "active" | "inactive" | "all";
  environment?: "dev" | "prod";
  searchQuery?: string;
}

/**
 * Service class for managing push notification devices
 * Handles all database operations and business logic for push devices
 */
export class PushDevicesService {
  /**
   * Fetch all devices with optional filtering and user information
   */
  static async fetchDevices(
    options: FetchDevicesOptions = {},
  ): Promise<{ devices: PushDeviceWithUser[]; stats: DeviceStats }> {
    try {
      // Build the base query
      let query = db
        .select({
          id: pushDevices.id,
          userId: pushDevices.userId,
          platform: pushDevices.platform,
          token: pushDevices.token,
          environment: pushDevices.environment,
          isActive: pushDevices.isActive,
          lastSeenAt: pushDevices.lastSeenAt,
          deviceId: pushDevices.deviceId,
          deviceModel: pushDevices.deviceModel,
          appVersion: pushDevices.appVersion,
          buildNumber: pushDevices.buildNumber,
          createdAt: pushDevices.createdAt,
          updatedAt: pushDevices.updatedAt,
          userName: sql<
            string | null
          >`COALESCE(CONCAT(${users.firstName}, ' ', ${users.lastName}), NULL)`,
          userEmail: sql<string | null>`${users.email}`,
        })
        .from(pushDevices)
        .leftJoin(users, eq(pushDevices.userId, users.id))
        .$dynamic();

      // Apply filters
      const conditions = [];

      if (options.platform) {
        conditions.push(eq(pushDevices.platform, options.platform));
      }

      if (options.status === "active") {
        conditions.push(eq(pushDevices.isActive, true));
      } else if (options.status === "inactive") {
        conditions.push(eq(pushDevices.isActive, false));
      }

      if (options.environment) {
        conditions.push(eq(pushDevices.environment, options.environment));
      }

      if (options.searchQuery && options.searchQuery.trim() !== "") {
        const searchTerm = `%${options.searchQuery.trim()}%`;
        conditions.push(
          or(
            like(
              sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
              searchTerm,
            ),
            like(users.email, searchTerm),
            like(pushDevices.deviceModel, searchTerm),
            like(pushDevices.deviceId, searchTerm),
            like(pushDevices.token, searchTerm),
          )!,
        );
      }

      // Apply all conditions if any exist
      if (conditions.length > 0) {
        query = query.where(and(...conditions)!);
      }

      // Execute query with ordering
      const allDevices = await query.orderBy(desc(pushDevices.lastSeenAt));

      // Debug logging
      console.log("🔍 [PushDevicesService] Query executed");
      console.log("  - Total devices returned:", allDevices.length);
      console.log("  - First device sample:", allDevices[0]);
      console.log("  - userName field:", allDevices[0]?.userName);
      console.log("  - userEmail field:", allDevices[0]?.userEmail);

      // Calculate statistics
      const stats = this.calculateStats(allDevices);

      return {
        devices: allDevices,
        stats,
      };
    } catch (error) {
      console.error("❌ Error fetching push devices:", error);
      throw new Error("Failed to fetch push devices from database");
    }
  }

  /**
   * Fetch a single device by ID
   */
  static async fetchDeviceById(
    deviceId: string,
  ): Promise<PushDeviceWithUser | null> {
    try {
      const result = await db
        .select({
          id: pushDevices.id,
          userId: pushDevices.userId,
          platform: pushDevices.platform,
          token: pushDevices.token,
          environment: pushDevices.environment,
          isActive: pushDevices.isActive,
          lastSeenAt: pushDevices.lastSeenAt,
          deviceId: pushDevices.deviceId,
          deviceModel: pushDevices.deviceModel,
          appVersion: pushDevices.appVersion,
          buildNumber: pushDevices.buildNumber,
          createdAt: pushDevices.createdAt,
          updatedAt: pushDevices.updatedAt,
          userName: sql<
            string | null
          >`COALESCE(CONCAT(${users.firstName}, ' ', ${users.lastName}), NULL)`,
          userEmail: sql<string | null>`${users.email}`,
        })
        .from(pushDevices)
        .leftJoin(users, eq(pushDevices.userId, users.id))
        .where(eq(pushDevices.id, deviceId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("❌ Error fetching device by ID:", error);
      throw new Error("Failed to fetch device");
    }
  }

  /**
   * Deactivate a device by ID
   */
  static async deactivateDevice(deviceId: string): Promise<boolean> {
    try {
      const result = await db
        .update(pushDevices)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(pushDevices.id, deviceId))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("❌ Error deactivating device:", error);
      throw new Error("Failed to deactivate device");
    }
  }

  /**
   * Reactivate a device by ID
   */
  static async reactivateDevice(deviceId: string): Promise<boolean> {
    try {
      const result = await db
        .update(pushDevices)
        .set({
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(pushDevices.id, deviceId))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("❌ Error reactivating device:", error);
      throw new Error("Failed to reactivate device");
    }
  }

  /**
   * Delete a device by ID
   */
  static async deleteDevice(deviceId: string): Promise<boolean> {
    try {
      console.log("🗑️ [PushDevicesService] Attempting to delete device");
      console.log("  - Device ID:", deviceId);
      console.log("  - ID type:", typeof deviceId);

      const result = await db
        .delete(pushDevices)
        .where(eq(pushDevices.id, deviceId))
        .returning();

      console.log("  - Delete query executed");
      console.log("  - Rows deleted:", result.length);
      if (result.length > 0) {
        console.log("  - Deleted device:", {
          id: result[0].id,
          platform: result[0].platform,
          userId: result[0].userId,
        });
      }

      return result.length > 0;
    } catch (error) {
      console.error("❌ [PushDevicesService] Error deleting device:", error);
      console.error(
        "  - Error message:",
        error instanceof Error ? error.message : "Unknown error",
      );
      throw new Error("Failed to delete device");
    }
  }

  /**
   * Calculate statistics from a list of devices
   */
  private static calculateStats(devices: PushDeviceWithUser[]): DeviceStats {
    return {
      totalDevices: devices.length,
      activeDevices: devices.filter((d) => d.isActive).length,
      inactiveDevices: devices.filter((d) => !d.isActive).length,
      iosDevices: devices.filter((d) => d.platform === "ios" && d.isActive)
        .length,
      androidDevices: devices.filter(
        (d) => d.platform === "android" && d.isActive,
      ).length,
      devEnvironment: devices.filter(
        (d) => d.environment === "dev" && d.isActive,
      ).length,
      prodEnvironment: devices.filter(
        (d) => d.environment === "prod" && d.isActive,
      ).length,
    };
  }

  /**
   * Fetch devices by user ID
   */
  static async fetchDevicesByUserId(
    userId: string,
  ): Promise<PushDeviceWithUser[]> {
    try {
      const result = await db
        .select({
          id: pushDevices.id,
          userId: pushDevices.userId,
          platform: pushDevices.platform,
          token: pushDevices.token,
          environment: pushDevices.environment,
          isActive: pushDevices.isActive,
          lastSeenAt: pushDevices.lastSeenAt,
          deviceId: pushDevices.deviceId,
          deviceModel: pushDevices.deviceModel,
          appVersion: pushDevices.appVersion,
          buildNumber: pushDevices.buildNumber,
          createdAt: pushDevices.createdAt,
          updatedAt: pushDevices.updatedAt,
          userName: sql<
            string | null
          >`COALESCE(CONCAT(${users.firstName}, ' ', ${users.lastName}), NULL)`,
          userEmail: sql<string | null>`${users.email}`,
        })
        .from(pushDevices)
        .leftJoin(users, eq(pushDevices.userId, users.id))
        .where(eq(pushDevices.userId, userId))
        .orderBy(desc(pushDevices.lastSeenAt));

      return result;
    } catch (error) {
      console.error("❌ Error fetching devices by user ID:", error);
      throw new Error("Failed to fetch devices for user");
    }
  }

  /**
   * Clean up stale devices (not seen in X days)
   */
  static async cleanupStaleDevices(daysInactive: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const result = await db
        .delete(pushDevices)
        .where(
          and(
            sql`${pushDevices.lastSeenAt} < ${cutoffDate}`,
            eq(pushDevices.isActive, false),
          )!,
        )
        .returning();

      console.log(
        `🧹 Cleaned up ${result.length} stale devices (inactive for ${daysInactive}+ days)`,
      );
      return result.length;
    } catch (error) {
      console.error("❌ Error cleaning up stale devices:", error);
      throw new Error("Failed to cleanup stale devices");
    }
  }
}
