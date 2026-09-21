// app/api/patient/[id]/export/route.ts

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import {
  patients,
  medOrders,
  rxOrders,
  telegramThreads,
  notes,
} from "@/db/schema";
import { eq } from "drizzle-orm";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ExportPayload = {
  patient: any;
  medOrders: any[];
  rxOrders: any[];
  notes: any[];
  telegram: {
    chatId: string | null;
    messages: Array<{
      text: string;
      sender: string;
      timestamp: string;
      type: string;
      mediaUrl?: string;
    }>;
  } | null;
};

function initialsFrom(p: any) {
  const f = (p.firstName || "").trim();
  const l = (p.lastName || "").trim();
  const fi = f ? f[0].toUpperCase() + "." : "";
  const li = l ? l[0].toUpperCase() + "." : "";
  const name = [fi, li].filter(Boolean).join(" ");
  return { fi, li, name };
}

function serializePatient(patient: any, mode: "full" | "anon") {
  if (!patient) return null;

  const base = { ...patient };

  // Convert date fields to ISO strings
  if (base.createdAt) base.createdAt = new Date(base.createdAt).toISOString();
  if (base.updatedAt) base.updatedAt = new Date(base.updatedAt).toISOString();
  if (base.dob) base.dob = new Date(base.dob).toISOString();
  if (base.scheduledVidChat)
    base.scheduledVidChat = new Date(base.scheduledVidChat).toISOString();
  if (base.surgeryDate)
    base.surgeryDate = new Date(base.surgeryDate).toISOString();

  // Anonymize if needed
  if (mode === "anon") {
    const { fi, li } = initialsFrom(base);
    base.firstName = fi || base.firstName;
    base.lastName = li || base.lastName;
    base.email = null;
    base.phone = null;
  }

  return base;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    // Authentication using DAL
    const session = await verifySessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const patientId = params.id;
    const modeParam = request.nextUrl.searchParams.get("mode");
    const mode = modeParam === "anon" ? "anon" : "full";

    console.log("[Debug] Exporting patient data:", patientId, "mode:", mode);

    // Validate UUID format
    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    // Fetch patient
    const patientDoc = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patientDoc || patientDoc.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patient = patientDoc[0];
    console.log("[Debug] Patient found:", patient.firstName, patient.lastName);

    // Fetch Med Orders
    const patientMedOrders = await db
      .select()
      .from(medOrders)
      .where(eq(medOrders.patientId, patientId));

    console.log("[Debug] Found", patientMedOrders.length, "med orders");

    const serializedMedOrders = patientMedOrders.map((order) => {
      const base = {
        ...order,
        orderDate: order.orderDate
          ? new Date(order.orderDate).toISOString()
          : undefined,
        medications: Array.isArray(order.medications)
          ? order.medications.map((m: any) => ({
              ...m,
              id: m.id || undefined,
            }))
          : [],
      };

      // Anonymize if needed
      if (mode === "anon") {
        const { name } = initialsFrom(patient);
        if (typeof base.patientName === "string") base.patientName = name;
        if (typeof base.patientPhone === "string") base.patientPhone = "";
      }

      return base;
    });

    // Fetch RX Orders
    const patientRxOrders = await db
      .select()
      .from(rxOrders)
      .where(eq(rxOrders.patientId, patientId));

    console.log("[Debug] Found", patientRxOrders.length, "rx orders");

    const serializedRxOrders = patientRxOrders.map((rx) => ({
      ...rx,
      prescribedDate: rx.prescribedDate
        ? new Date(rx.prescribedDate).toISOString()
        : undefined,
      validTill: rx.validTill
        ? new Date(rx.validTill).toISOString()
        : undefined,
    }));

    // Fetch Notes
    const patientNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.patientId, patientId));

    console.log("[Debug] Found", patientNotes.length, "notes");

    const serializedNotes = patientNotes.map((note) => ({
      ...note,
      date: note.date ? new Date(note.date).toISOString() : undefined,
      createdAt: note.createdAt
        ? new Date(note.createdAt).toISOString()
        : undefined,
      updatedAt: note.updatedAt
        ? new Date(note.updatedAt).toISOString()
        : undefined,
    }));

    // Fetch Telegram thread
    let telegramThread: any | null = null;

    // Try to find by chatId first
    if (patient.telegramChatId) {
      const threadByChatId = await db
        .select()
        .from(telegramThreads)
        .where(eq(telegramThreads.chatId, patient.telegramChatId))
        .limit(1);

      if (threadByChatId && threadByChatId.length > 0) {
        telegramThread = threadByChatId[0];
      }
    }

    // If not found by chatId, try by patientId
    if (!telegramThread) {
      const threadByPatientId = await db
        .select()
        .from(telegramThreads)
        .where(eq(telegramThreads.patientId, patientId))
        .limit(1);

      if (threadByPatientId && threadByPatientId.length > 0) {
        telegramThread = threadByPatientId[0];
      }
    }

    console.log(
      "[Debug] Telegram thread:",
      telegramThread ? "found" : "not found",
    );

    const telegram = telegramThread
      ? {
          chatId: telegramThread.chatId || null,
          messages: (telegramThread.messages || []).map((msg: any) => ({
            text: msg.text || "",
            sender: msg.sender || "Unknown",
            timestamp: msg.timestamp
              ? new Date(msg.timestamp).toISOString()
              : new Date().toISOString(),
            type: msg.type || "text",
            mediaUrl: msg.mediaUrl || undefined,
          })),
        }
      : null;

    // Serialize patient data
    const serializedPatient = serializePatient(patient, mode);

    const payload: ExportPayload = {
      patient: serializedPatient,
      medOrders: serializedMedOrders,
      rxOrders: serializedRxOrders,
      notes: serializedNotes,
      telegram,
    };

    console.log("[Debug] Export payload prepared successfully");

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("[Error] Failed to export patient data:", error);
    return NextResponse.json(
      { error: "Failed to export patient data" },
      { status: 500 },
    );
  }
}
