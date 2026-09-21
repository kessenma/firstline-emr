// apps/web/app/api/user-settings/[id]/route.ts
export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db/connection";
import { userSettings, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/** `user_settings` holds preferences only; these fields live on `users`. They
 *  are merged into settings responses so existing consumers (UserSettingsView,
 *  mobile settings) keep the shape they already expect. */
function userFacingFields(user: any) {
  return {
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    email: user?.email ?? "",
    accountType: user?.accountType ?? "",
    doctorSpecialty: user?.doctorSpecialty ?? [],
    countries: user?.countries ?? [],
    languages: user?.languages ?? [],
  };
}

// Helper to safely serialize dates
function serializeDates(obj: any): any {
  const result = { ...obj };
  for (const key in result) {
    if (result[key] instanceof Date) {
      result[key] = result[key].toISOString();
    }
  }
  return result;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id: userId } = await props.params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Validate UUID (PostgreSQL)
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    );

  if (!isUUID) {
    return NextResponse.json(
      { error: "Invalid User ID format (UUID expected)" },
      { status: 400 },
    );
  }

  // Verify the user is authorized to access these settings
  // Support both web sessions and mobile JWT tokens
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized - No session or token" },
      { status: 401 },
    );
  }

  // Compare user IDs - users can only access their own settings
  if (session.userId !== userId) {
    return NextResponse.json(
      { error: "Unauthorized - Cannot access other user's settings" },
      { status: 401 },
    );
  }

  try {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 },
      );
    }

    // Identity/professional fields live on `users` now, but stay in this
    // response so settings consumers keep the shape they already expect.
    const [user] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        accountType: users.accountType,
        doctorSpecialty: users.doctorSpecialty,
        countries: users.countries,
        languages: users.languages,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return NextResponse.json(
      serializeDates({ ...settings, ...userFacingFields(user) }),
    );
  } catch (error) {
    console.error("Error retrieving user settings:", error);
    return NextResponse.json(
      { error: `Error retrieving user settings: ${error}` },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id: userId } = await props.params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Validate UUID
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    );

  if (!isUUID) {
    return NextResponse.json(
      { error: "Invalid User ID format (UUID expected)" },
      { status: 400 },
    );
  }

  // Verify the user is authorized to update these settings
  // Support both web sessions and mobile JWT tokens
  // Authentication using DAL
  const session = await verifySessionFromRequest(request);

  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    console.log("Received update request body:", JSON.stringify(body, null, 2));

    // Get user data for settings
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find existing settings
    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    // doctorSpecialty / countries / languages are owned by `users`. Route any
    // incoming values there, and keep a local copy so every response below
    // still reports the effective value.
    let effectiveUser: any = { ...user };
    const writeUserFields = async (incoming: {
      doctorSpecialty?: unknown;
      countries?: unknown;
      languages?: unknown;
    }) => {
      const patch: Record<string, string[]> = {};
      for (const key of ["doctorSpecialty", "countries", "languages"] as const) {
        if (Array.isArray(incoming[key])) {
          patch[key] = incoming[key] as string[];
        }
      }
      if (Object.keys(patch).length === 0) return;
      await db
        .update(users)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(users.id, userId));
      effectiveUser = { ...effectiveUser, ...patch };
    };

    // If we're updating a specific setting
    if (body.settings) {
      // Remove deprecated fields and internal timestamp fields to prevent DB
      // errors. The `users`-owned fields are pulled out too and routed there.
      const {
        saveLastPage: _deprecated1,
        useInfiniteScroll: _deprecated2,
        createdAt: _internal1,
        updatedAt: _internal2,
        id: _internal3,
        name: _owned1,
        email: _owned2,
        accountType: _owned3,
        doctorSpecialty: incomingSpecialty,
        countries: incomingCountries,
        languages: incomingLanguages,
        ...settingsToUpdate
      } = body.settings;

      await writeUserFields({
        doctorSpecialty: incomingSpecialty,
        countries: incomingCountries,
        languages: incomingLanguages,
      });

      console.log("Settings to update after filtering:", JSON.stringify(settingsToUpdate, null, 2));

      // If settings don't exist yet, create them first
      if (!existingSettings) {
        const defaultSettings = {
          userId,
          lastView: "/",
          voiceSensitivity: "adaptive",
        };

        const [newSettings] = await db
          .insert(userSettings)
          .values(defaultSettings)
          .returning();

        // Now update with the specific settings
        const updatePayload = {
          ...settingsToUpdate,
          updatedAt: new Date(),
        };
        
        const [updatedSettings] = await db
          .update(userSettings)
          .set(updatePayload)
          .where(eq(userSettings.userId, userId))
          .returning();

        return NextResponse.json(
          serializeDates({
            ...updatedSettings,
            ...userFacingFields(effectiveUser),
          }),
        );
      }

      // Update existing settings
      const updatePayload = {
        ...settingsToUpdate,
        updatedAt: new Date(),
      };
      
      const [updatedSettings] = await db
        .update(userSettings)
        .set(updatePayload)
        .where(eq(userSettings.userId, userId))
        .returning();

      return NextResponse.json(
        serializeDates({
          ...updatedSettings,
          ...userFacingFields(effectiveUser),
        }),
      );
    }

    // If we're updating the entire settings object
    const updateData = {
      lastView: body.lastView ?? existingSettings?.lastView ?? "/",
      lastViewSavedAt:
        body.lastViewSavedAt ?? existingSettings?.lastViewSavedAt,
      lastViewSessionId:
        body.lastViewSessionId ?? existingSettings?.lastViewSessionId,
      voiceSensitivity:
        body.voiceSensitivity ?? existingSettings?.voiceSensitivity ?? "adaptive",
      updatedAt: new Date(),
    };

    await writeUserFields({
      doctorSpecialty: body.doctorSpecialty,
      countries: body.countries,
      languages: body.languages,
    });

    let settings;

    if (existingSettings) {
      // Update existing settings
      [settings] = await db
        .update(userSettings)
        .set(updateData)
        .where(eq(userSettings.userId, userId))
        .returning();
    } else {
      // Create new settings
      [settings] = await db
        .insert(userSettings)
        .values({
          userId,
          ...updateData,
        })
        .returning();
    }

    return NextResponse.json(
      serializeDates({ ...settings, ...userFacingFields(effectiveUser) }),
    );
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: `Error updating user settings: ${error}` },
      { status: 500 },
    );
  }
}
