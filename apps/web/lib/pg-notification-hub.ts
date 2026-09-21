// apps/web/lib/pg-notification-hub.ts
//
// Singleton managing ONE dedicated PG Client (not from pool) for all
// LISTEN/NOTIFY channels. Fixes pool exhaustion caused by each SSE
// client checking out its own connection.

import { Client } from "pg";

type NotificationCallback = (payload: string) => void;

class PgNotificationHub {
  private client: Client | null = null;
  private subscribers = new Map<string, Set<NotificationCallback>>();
  private connecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private readonly maxReconnectDelay = 30000;
  private shuttingDown = false;

  /**
   * Subscribe to a PostgreSQL NOTIFY channel.
   * Returns an unsubscribe function.
   * On first subscriber for a channel, issues LISTEN.
   * When last subscriber unsubscribes, issues UNLISTEN.
   */
  subscribe(channel: string, callback: NotificationCallback): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    const subs = this.subscribers.get(channel)!;
    subs.add(callback);

    // Ensure we're connected and listening
    this.ensureConnected(channel);

    // Return unsubscribe function
    return () => {
      subs.delete(callback);
      if (subs.size === 0) {
        this.subscribers.delete(channel);
        this.unlistenChannel(channel);
      }
    };
  }

  private async ensureConnected(channel?: string) {
    if (this.client) {
      // Already connected — just make sure we're listening on this channel
      if (channel) {
        await this.listenChannel(channel);
      }
      return;
    }

    if (this.connecting) return;
    this.connecting = true;

    try {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        console.error("[pg-hub] DATABASE_URL is not defined");
        this.connecting = false;
        return;
      }

      const client = new Client({ connectionString });

      client.on("error", (err) => {
        console.error("[pg-hub] Client error:", err.message);
        this.handleDisconnect();
      });

      client.on("end", () => {
        console.log("[pg-hub] Client connection ended");
        this.handleDisconnect();
      });

      client.on("notification", (msg) => {
        const subs = this.subscribers.get(msg.channel);
        if (subs) {
          for (const cb of subs) {
            try {
              cb(msg.payload || "{}");
            } catch (err) {
              console.error("[pg-hub] Subscriber callback error:", err);
            }
          }
        }
      });

      await client.connect();
      this.client = client;
      this.connecting = false;
      this.reconnectDelay = 1000; // Reset backoff on success
      console.log("[pg-hub] Connected to PostgreSQL for LISTEN/NOTIFY");

      // Re-issue LISTEN for all active channels
      for (const ch of this.subscribers.keys()) {
        await this.listenChannel(ch);
      }
    } catch (err) {
      console.error("[pg-hub] Connection failed:", err);
      this.client = null;
      this.connecting = false;
      this.scheduleReconnect();
    }
  }

  private async listenChannel(channel: string) {
    if (!this.client) return;
    try {
      await this.client.query(`LISTEN ${channel}`);
      console.log(`[pg-hub] LISTEN ${channel}`);
    } catch (err) {
      console.error(`[pg-hub] LISTEN ${channel} failed:`, err);
    }
  }

  private async unlistenChannel(channel: string) {
    if (!this.client) return;
    try {
      await this.client.query(`UNLISTEN ${channel}`);
      console.log(`[pg-hub] UNLISTEN ${channel}`);
    } catch (err) {
      console.error(`[pg-hub] UNLISTEN ${channel} failed:`, err);
    }

    // If no subscribers remain on any channel, close the connection
    if (this.subscribers.size === 0) {
      this.close();
    }
  }

  private handleDisconnect() {
    if (this.shuttingDown) return;
    this.client = null;
    this.connecting = false;

    // Only reconnect if we still have subscribers
    if (this.subscribers.size > 0) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    console.log(`[pg-hub] Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay,
    );
  }

  private close() {
    if (this.client) {
      console.log("[pg-hub] Closing client connection");
      this.client.end().catch((err) => {
        console.error("[pg-hub] Error closing client:", err);
      });
      this.client = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  shutdown() {
    this.shuttingDown = true;
    this.subscribers.clear();
    this.close();
  }
}

// Singleton with globalThis to survive Next.js hot reloads
const globalForHub = global as unknown as { pgNotificationHub: PgNotificationHub };

export const pgNotificationHub =
  globalForHub.pgNotificationHub || new PgNotificationHub();

if (process.env.NODE_ENV !== "production") {
  globalForHub.pgNotificationHub = pgNotificationHub;
}

// Graceful shutdown
process.on("SIGINT", () => pgNotificationHub.shutdown());
process.on("SIGTERM", () => pgNotificationHub.shutdown());
