// lib/voipPush.ts
// Client for the notifications-server VoIP endpoint.
//
// VoIP pushes deliberately do NOT go through pushNotificationService / Gorush:
//   - Gorush has a single global `production` flag, so it cannot serve dev and
//     prod APNs tokens at the same time. Testing CallKit requires a debug build
//     on a physical device, so that limitation is disqualifying.
//   - Gorush is fire-and-forget (`sync: false`), so the caller never learns the
//     APNs reason code — we need that to mark a call undeliverable and to
//     deactivate dead tokens.
// The Go side talks to APNs directly via apns2. See apps/notifications-server/voip.go.

import axios from "axios";

export type VoipCallEvent = "invite" | "cancel";

export interface VoipCallPushOptions {
  userId: string;
  callId: string;
  event: VoipCallEvent;
  callerId: string;
  callerName: string;
  /** For event="cancel": why the ring should stop. */
  reason?: "answered_elsewhere" | "declined" | "canceled" | "timeout";
}

export interface VoipPushResult {
  delivered: number;
  failed: number;
}

const notificationsServerUrl =
  process.env.NOTIFICATIONS_SERVER_URL ||
  process.env.NEXT_PUBLIC_NOTIFICATIONS_SERVER_URL ||
  "http://notifications-server:8080";

/**
 * Send a PushKit VoIP push. Resolves to a delivery count rather than throwing,
 * so a push failure degrades the call to "not reachable" instead of 500ing the
 * initiate request.
 *
 * Every field in the payload is a string: the Go handler decodes into
 * map[string]string and rejects anything else with a 400.
 */
export async function sendVoipCallPush(
  opts: VoipCallPushOptions,
): Promise<VoipPushResult> {
  try {
    const response = await axios.post(
      `${notificationsServerUrl}/api/push/voip`,
      {
        user_id: opts.userId,
        payload: {
          callId: opts.callId,
          event: opts.event,
          callerId: opts.callerId,
          callerName: opts.callerName,
          ...(opts.reason ? { reason: opts.reason } : {}),
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MEDFLOW_KEY ?? ""}`,
        },
        // A ring is worthless if it arrives late; fail fast and report
        // undeliverable rather than holding the initiate request open.
        timeout: 5000,
      },
    );

    return {
      delivered: Number(response.data?.delivered ?? 0),
      failed: Number(response.data?.failed ?? 0),
    };
  } catch (error) {
    console.error(
      `❌ VoIP push failed for user ${opts.userId} (call ${opts.callId}):`,
      error instanceof Error ? error.message : error,
    );
    return { delivered: 0, failed: 1 };
  }
}

/**
 * Tell every other still-ringing device to dismiss its CallKit UI.
 * Fire-and-forget: the call state in Postgres is already authoritative.
 */
export async function cancelVoipRing(
  targets: Array<{ userId: string }>,
  opts: Omit<VoipCallPushOptions, "userId" | "event">,
): Promise<void> {
  await Promise.all(
    targets.map((t) =>
      sendVoipCallPush({ ...opts, userId: t.userId, event: "cancel" }),
    ),
  );
}
