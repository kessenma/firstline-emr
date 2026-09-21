// app/api/patient/[id]/medications/rx-order/route.ts

export const dynamic = "force-dynamic";

import { v4 as uuidv4 } from "uuid";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import QRCode from "qrcode";
import sharp from "sharp";
import { db } from "@/db";
import { patients, rxOrders } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { CreateRxOrderResponse } from "@fajr/shared/medications";

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    // Support both NextAuth sessions (web) and JWT tokens (mobile)
    const session = await verifySessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const patientId = params.id;

    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    const patient = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient || patient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Select every column: `patientRxUrl` and `pharmacyQrCode` are what the
    // share drawer sends to the patient, so a projection that drops them
    // produces a prescription with no link.
    const patientRxOrders = await db
      .select()
      .from(rxOrders)
      .where(eq(rxOrders.patientId, patientId))
      .orderBy(desc(rxOrders.prescribedDate));

    console.log(
      "[Debug] Found",
      patientRxOrders.length,
      "rx orders for patient",
      patientId,
    );

    return NextResponse.json({ rxOrders: patientRxOrders });
  } catch (error) {
    console.error("[Error] Failed to fetch RX orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch RX orders" },
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
    const patientId = params.id;

    console.log("[Debug] Creating RX order for patient:", patientId);

    // Validate UUID format
    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    const requestData = await request.json();
    const {
      doctorSpecialty,
      prescribingDr,
      drEmail,
      drId,
      validTill,
      city,
      validated,
      prescriptions,
    } = requestData;

    console.log("[Debug] RX order data:", {
      doctorSpecialty,
      prescribingDr,
      prescriptions: prescriptions?.length,
    });

    // Validate required fields
    if (!doctorSpecialty || !prescriptions || prescriptions.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate doctor ID if provided
    if (drId && !UUID_REGEX.test(drId)) {
      return NextResponse.json(
        { error: "Invalid doctor ID format" },
        { status: 400 },
      );
    }

    // Verify patient exists
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient || patient.length === 0) {
      return NextResponse.json(
        { error: "Failed to update patient record" },
        { status: 500 },
      );
    }

    // Generate URLs. An unset base URL used to interpolate as the literal
    // string "undefined/rx-order/patient/...", which is truthy and was handed
    // to patients as a dead link — refuse to create the order instead.
    const baseUrl = (
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_API_URL
        : process.env.NEXTAUTH_URL || "http://localhost:3000"
    )?.replace(/\/+$/, "");

    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
      console.error(
        "[Error] Cannot generate prescription URLs: base URL is not configured.",
        {
          nodeEnv: process.env.NODE_ENV,
          hasApiUrl: !!process.env.NEXT_PUBLIC_API_URL,
          hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        },
      );
      return NextResponse.json(
        {
          error:
            "Server is missing its public URL configuration, so the prescription link cannot be generated.",
        },
        { status: 500 },
      );
    }

    const uniqueId = uuidv4();
    const patientRxUrl = `${baseUrl}/rx-order/patient/${uniqueId}`;
    const pharmacyQrUrl = `${baseUrl}/rx-order/pharmacy/${uniqueId}`;

    console.log("[Debug] Generated URLs with ID:", uniqueId);

    // Create prescriptions array with proper structure
    const formattedPrescriptions = prescriptions.map((p: any) => ({
      diagnosis: p.diagnosis,
      medication: p.medication,
      dosage: p.dosage,
      frequency: p.frequency,
    }));

    // Generate QR code as a data URL
    const qrCodeDataURL = await QRCode.toDataURL(pharmacyQrUrl, {
      errorCorrectionLevel: "L",
    });

    // Extract the base64 part from the data URL
    const base64Data = qrCodeDataURL.split(",")[1];

    // Convert base64 to a buffer
    const qrCodeBuffer = Buffer.from(base64Data, "base64");

    // Compress the QR code using sharp
    const compressedQrCodeBuffer = await sharp(qrCodeBuffer)
      .png({ quality: 70 }) // Compress PNG with quality setting
      .resize(256, 256) // Resize to 256x256
      .toBuffer();

    // Convert buffer to base64 for storage
    const compressedQrCodeBase64 = `data:image/png;base64,${compressedQrCodeBuffer.toString("base64")}`;

    console.log("[Debug] QR code generated and compressed");

    // Create new RX order in database
    const newRxOrder = await db
      .insert(rxOrders)
      .values({
        rxOrderId: uniqueId,
        patientId: patientId,
        doctorSpecialty: doctorSpecialty,
        prescribingDr: prescribingDr,
        drEmail: drEmail,
        drId: drId || sql`NULL`,
        prescribedDate: new Date(),
        validTill: validTill ? new Date(validTill) : new Date(),
        city: city,
        prescriptions: formattedPrescriptions,
        patientRxUrl: patientRxUrl,
        pharmacyQrCode: compressedQrCodeBase64,
        pharmacyQrUrl: pharmacyQrUrl,
        rxDispenserName: null,
        rxDispenserContact: null,
        rxStatus: null,
        submitted: false,
        partialRxNotes: null,
        createdAt: new Date(),
      })
      .returning();

    console.log("[Debug] RX order created successfully:", newRxOrder[0].id);

    // Return the persisted row, not just its id. The client puts this straight
    // into its list and shares it, so it needs the generated link and QR code.
    return NextResponse.json(
      {
        message: "RX order added successfully.",
        rxOrder: newRxOrder[0],
      } satisfies CreateRxOrderResponse,
      { status: 201 },
    );
  } catch (error) {
    console.error("[Error] Failed to add RX order:", error);
    return NextResponse.json(
      { error: "Failed to add RX order" },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    console.log("[Debug] Updating RX order for patient:", patientId);

    // Validate UUID format
    if (!UUID_REGEX.test(patientId)) {
      return NextResponse.json(
        { error: "Invalid patient ID format" },
        { status: 400 },
      );
    }

    const { uuid, updatedRxOrder } = await request.json();

    if (!uuid) {
      return NextResponse.json({ error: "UUID is required" }, { status: 400 });
    }

    console.log("[Debug] Looking for RX order with UUID:", uuid);

    // Find the RX order by UUID in the pharmacyQrUrl
    const existingRxOrder = await db
      .select()
      .from(rxOrders)
      .where(
        and(
          eq(rxOrders.patientId, patientId),
          sql`${rxOrders.pharmacyQrUrl} LIKE ${"%" + uuid + "%"}`,
        ),
      )
      .limit(1);

    if (!existingRxOrder || existingRxOrder.length === 0) {
      return NextResponse.json(
        { error: "RX order not found" },
        { status: 404 },
      );
    }

    console.log("[Debug] Found RX order:", existingRxOrder[0].id);

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Map all possible fields from updatedRxOrder
    if (updatedRxOrder.doctorSpecialty !== undefined) {
      updateData.doctorSpecialty = updatedRxOrder.doctorSpecialty;
    }
    if (updatedRxOrder.prescribingDr !== undefined) {
      updateData.prescribingDr = updatedRxOrder.prescribingDr;
    }
    if (updatedRxOrder.drEmail !== undefined) {
      updateData.drEmail = updatedRxOrder.drEmail;
    }
    if (updatedRxOrder.drId !== undefined) {
      updateData.drId = updatedRxOrder.drId;
    }
    if (updatedRxOrder.prescribedDate !== undefined) {
      updateData.prescribedDate = new Date(updatedRxOrder.prescribedDate);
    }
    if (updatedRxOrder.validTill !== undefined) {
      updateData.validTill = new Date(updatedRxOrder.validTill);
    }
    if (updatedRxOrder.city !== undefined) {
      updateData.city = updatedRxOrder.city;
    }
    if (updatedRxOrder.prescriptions !== undefined) {
      updateData.prescriptions = updatedRxOrder.prescriptions;
    }
    if (updatedRxOrder.patientRxUrl !== undefined) {
      updateData.patientRxUrl = updatedRxOrder.patientRxUrl;
    }
    if (updatedRxOrder.pharmacyQrCode !== undefined) {
      updateData.pharmacyQrCode = updatedRxOrder.pharmacyQrCode;
    }
    if (updatedRxOrder.pharmacyQrUrl !== undefined) {
      updateData.pharmacyQrUrl = updatedRxOrder.pharmacyQrUrl;
    }
    if (updatedRxOrder.rxDispenserName !== undefined) {
      updateData.rxDispenserName = updatedRxOrder.rxDispenserName;
    }
    if (updatedRxOrder.rxDispenserContact !== undefined) {
      updateData.rxDispenserContact = updatedRxOrder.rxDispenserContact;
    }
    if (updatedRxOrder.rxStatus !== undefined) {
      updateData.rxStatus = updatedRxOrder.rxStatus;
    }
    if (updatedRxOrder.submitted !== undefined) {
      updateData.submitted = updatedRxOrder.submitted;
    }
    if (updatedRxOrder.partialRxNotes !== undefined) {
      updateData.partialRxNotes = updatedRxOrder.partialRxNotes;
    }

    console.log("[Debug] Updating RX order with data:", updateData);

    // Update the RX order
    const updated = await db
      .update(rxOrders)
      .set(updateData)
      .where(eq(rxOrders.id, existingRxOrder[0].id))
      .returning();

    console.log("[Debug] RX order updated successfully:", updated[0].id);

    return NextResponse.json({ rxOrder: updated[0] });
  } catch (error) {
    console.error("[Error] Failed to update RX order:", error);
    return NextResponse.json(
      { error: "Failed to update RX order" },
      { status: 500 },
    );
  }
}
