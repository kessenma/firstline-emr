// apps/web/app/api/admin/patients/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { patients, admins } from "@/db/schema";
import { eq, ilike, desc, sql, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can use this endpoint - check if user exists in admins table
    const adminUser = await db
      .select()
      .from(admins)
      .where(eq(admins.userId, session.user.id))
      .limit(1);

    if (adminUser.length === 0) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const searchType = searchParams.get("type"); // 'recent', 'phone', 'name', 'id'
    const query = searchParams.get("query");
    const firstName = searchParams.get("firstName");
    const lastName = searchParams.get("lastName");

    let results: any[] = [];

    // Search by type
    switch (searchType) {
      case "recent":
        // Get last 10 recently created patients
        results = await db
          .select({
            id: patients.id,
            firstName: patients.firstName,
            lastName: patients.lastName,
            email: patients.email,
            phone: patients.phone,
            telegramChatId: patients.telegramChatId,
            createdAt: patients.createdAt,
            status: patients.status,
            type: sql<string>`'regular'`,
          })
          .from(patients)
          .orderBy(desc(patients.createdAt))
          .limit(10);
        break;

      case "phone":
        if (!query) {
          return NextResponse.json(
            { error: "Phone query required" },
            { status: 400 },
          );
        }

        // Search by phone number (checking phoneNumber field in JSON)
        results = await db
          .select({
            id: patients.id,
            firstName: patients.firstName,
            lastName: patients.lastName,
            email: patients.email,
            phone: patients.phone,
            telegramChatId: patients.telegramChatId,
            createdAt: patients.createdAt,
            status: patients.status,
            type: sql<string>`'regular'`,
          })
          .from(patients)
          .where(sql`${patients.phone}->>'phoneNumber' ILIKE ${`%${query}%`}`)
          .orderBy(desc(patients.createdAt))
          .limit(20);
        break;

      case "name":
        if (!firstName && !lastName) {
          return NextResponse.json(
            { error: "First name or last name required" },
            { status: 400 },
          );
        }

        let nameConditions: any[] = [];
        if (firstName) {
          nameConditions.push(ilike(patients.firstName, `%${firstName}%`));
        }
        if (lastName) {
          nameConditions.push(ilike(patients.lastName, `%${lastName}%`));
        }

        const nameWhere =
          nameConditions.length > 1
            ? and(...nameConditions)
            : nameConditions[0];

        results = await db
          .select({
            id: patients.id,
            firstName: patients.firstName,
            lastName: patients.lastName,
            email: patients.email,
            phone: patients.phone,
            telegramChatId: patients.telegramChatId,
            createdAt: patients.createdAt,
            status: patients.status,
            type: sql<string>`'regular'`,
          })
          .from(patients)
          .where(nameWhere)
          .orderBy(desc(patients.createdAt))
          .limit(20);
        break;

      case "id":
        // Search by patient ID
        if (!query) {
          return NextResponse.json(
            { error: "Query parameter is required for ID search" },
            { status: 400 },
          );
        }

        results = await db
          .select({
            id: patients.id,
            firstName: patients.firstName,
            lastName: patients.lastName,
            email: patients.email,
            phone: patients.phone,
            telegramChatId: patients.telegramChatId,
            createdAt: patients.createdAt,
            status: patients.status,
            type: sql<string>`'regular'`,
          })
          .from(patients)
          .where(eq(patients.id, query))
          .limit(1);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid search type" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      patients: results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error searching patients:", error);
    return NextResponse.json(
      { error: "Failed to search patients" },
      { status: 500 },
    );
  }
}
