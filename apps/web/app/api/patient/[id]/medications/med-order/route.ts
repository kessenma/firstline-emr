// app/api/patient/[id]/medications/med-order/route.ts

export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { medOrders, patients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    console.log("[Debug] Fetching med orders for patient:", patientId);

    // Validate UUID format
    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    // Verify patient exists
    const patient = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient || patient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Fetch all med orders for this patient
    const patientMedOrders = await db
      .select()
      .from(medOrders)
      .where(eq(medOrders.patientId, patientId));

    console.log(
      "[Debug] Found",
      patientMedOrders.length,
      "med orders for patient",
    );

    // Serialize the response
    const serializedMedOrders = patientMedOrders.map((order) => ({
      ...order,
      orderDate: order.orderDate.toISOString(),
      medications:
        order.medications?.map((med: any) => ({
          ...med,
          id: med.id || uuidv4(),
        })) || [],
    }));

    return NextResponse.json(serializedMedOrders);
  } catch (error) {
    console.error("[Error] Failed to fetch med orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch med orders" },
      { status: 500 },
    );
  }
}

export async function POST(
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
    const patientIdString = params.id;

    console.log("[Debug] POST med order for patient:", patientIdString);

    // Validate UUID format
    if (!UUID_REGEX.test(patientIdString)) {
      console.error("[Error] Invalid patient ID format:", patientIdString);
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    let requestData;
    try {
      requestData = await request.json();
      console.log("[Debug] Request body received:", requestData);
    } catch (error) {
      console.error("[Error] Failed to parse request body:", error);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Verify patient exists
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientIdString))
      .limit(1);

    if (!patient || patient.length === 0) {
      console.error("[Error] Patient not found for ID:", patientIdString);
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    console.log(
      "[Debug] Patient found:",
      patient[0].firstName,
      patient[0].lastName,
    );

    const {
      doctorSpecialty,
      prescribingDr,
      drEmail,
      drId,
      patientName,
      patientPhone,
      patientCity,
      patientCountry,
      orderDate,
      validated,
      medications,
    } = requestData;

    console.log("[Debug] Validating request data...");

    // Validate required fields
    const isValid =
      [
        doctorSpecialty,
        prescribingDr,
        drEmail,
        drId,
        patientName,
        patientPhone,
        patientCity,
        patientCountry,
      ].every((field) => typeof field === "string") &&
      Array.isArray(medications) &&
      medications.every((med) =>
        ["diagnosis", "medication", "dosage", "frequency", "quantity"].every(
          (prop) => typeof med[prop] === "string",
        ),
      );

    if (!isValid) {
      console.error("[Error] Invalid med order data:", requestData);
      return NextResponse.json(
        { error: "Invalid med order data" },
        { status: 400 },
      );
    }

    // Validate drId UUID format
    if (!UUID_REGEX.test(drId)) {
      console.error("[Error] Invalid doctor ID format:", drId);
      return NextResponse.json(
        { error: "Invalid doctor ID format" },
        { status: 400 },
      );
    }

    console.log("[Debug] Request data is valid.");

    const medicationsWithIds = medications.map((med: any) => ({
      ...med,
      id: uuidv4(),
    }));

    // Create new med order
    const newMedOrder = await db
      .insert(medOrders)
      .values({
        oid: uuidv4(), // Generate order ID
        doctorSpecialty,
        prescribingDr,
        drEmail,
        drId,
        patientName,
        patientPhone,
        patientCity,
        patientCountry,
        patientId: patientIdString,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        validated: validated || false,
        medications: medicationsWithIds,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log("[Debug] Med order saved successfully:", newMedOrder[0].id);

    // Serialize the saved med order for backwards compatibility
    const serializedMedOrder = {
      ...newMedOrder[0],
      orderDate: newMedOrder[0].orderDate.toISOString(),
      medications: medicationsWithIds,
    };

    console.log("[Debug] Returning response");
    return NextResponse.json(serializedMedOrder, { status: 201 });
  } catch (error) {
    console.error("[Error] Failed to add med order:", error);
    return NextResponse.json(
      { error: "Failed to add med order" },
      { status: 500 },
    );
  }
}
