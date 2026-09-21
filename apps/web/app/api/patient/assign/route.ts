// app/api/patient/assign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { patients, medOrders, rxOrders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  try {
    // Authentication using DAL
    const session = await verifySessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      patientId,
      status,
      priority,
      medOrders: medOrdersData,
      rxOrders: rxOrdersData,
    } = body;

    // Validate patientId (UUID format)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!patientId || !uuidRegex.test(patientId)) {
      return NextResponse.json(
        { message: "Invalid patient ID format." },
        { status: 400 },
      );
    }

    // Check if patient exists
    const [existingPatient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!existingPatient) {
      return NextResponse.json(
        { message: "Patient not found." },
        { status: 404 },
      );
    }

    // Prepare update fields
    const updateFields: any = {};

    if (status !== undefined) {
      updateFields.status = status;
    }

    if (priority !== undefined) {
      updateFields.priority = priority;
    }

    // Update the patient
    if (Object.keys(updateFields).length > 0) {
      updateFields.updatedAt = new Date();

      await db
        .update(patients)
        .set(updateFields)
        .where(eq(patients.id, patientId));
    }

    // Handle medOrders updates if provided
    if (medOrdersData && Array.isArray(medOrdersData)) {
      for (const order of medOrdersData) {
        if (order.id) {
          const updateData: any = {};

          if (order.doctorSpecialty !== undefined) {
            updateData.doctorSpecialty = order.doctorSpecialty;
          }
          // Add other fields as needed
          if (order.prescribingDr !== undefined) {
            updateData.prescribingDr = order.prescribingDr;
          }

          if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();

            await db
              .update(medOrders)
              .set(updateData)
              .where(eq(medOrders.id, order.id));
          }
        }
      }
    }

    // Handle rxOrders updates if provided
    if (rxOrdersData && Array.isArray(rxOrdersData)) {
      for (const order of rxOrdersData) {
        if (order.id) {
          const updateData: any = {};

          if (order.patientName !== undefined) {
            updateData.patientName = order.patientName;
          }
          // Add other fields as needed
          if (order.city !== undefined) {
            updateData.city = order.city;
          }

          if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();

            await db
              .update(rxOrders)
              .set(updateData)
              .where(eq(rxOrders.id, order.id));
          }
        }
      }
    }

    return NextResponse.json(
      { message: "Patient updated successfully!" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}
