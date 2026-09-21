// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/connection";
import { users, admins, userSettings, totpCredentials, passkeyCredentials, missions, missionRequests } from "@/db/schema";
import { eq, count, inArray, and } from "drizzle-orm";
import { sendWelcomeEmail } from "@/utils/emails/user-signup";
import { notifyAdminsOfNewSignup } from "@/lib/notification-helpers";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      accountType,
      firstName,
      lastName,
      dob,
      doctorSpecialty,
      languages,
      countries,
      gender,
      totpCredentialData,
      passkeyCredentialData,
      missionIds,
    } = body;

    // Optional mission join requests — never fail signup over these
    const requestedMissionIds: string[] = Array.isArray(missionIds)
      ? [...new Set(missionIds.filter((id) => typeof id === "string"))].slice(0, 20)
      : [];

    // Validate required fields
    if (!email || !password || !accountType || !firstName || !lastName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 },
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    // Validate account type
    if (!["Doctor", "Triage", "Evac"].includes(accountType)) {
      return NextResponse.json(
        { message: "Invalid account type" },
        { status: 400 },
      );
    }

    // 1. Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 },
      );
    }

    // 2. Check if this is the first user (for automatic admin privileges)
    const [{ count: userCount }] = await db
      .select({ count: count() })
      .from(users);

    const isFirstUser = userCount === 0;

    console.log(`📊 Current user count: ${userCount}`);
    console.log(`🔑 Is first user: ${isFirstUser}`);

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user in transaction (all or nothing)
    const result = await db.transaction(async (tx) => {
      // Create user
      const [newUser] = await tx
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          accountType,
          dob: dob ? new Date(dob) : null,
          doctorSpecialty:
            doctorSpecialty && doctorSpecialty.length > 0
              ? doctorSpecialty
              : null,
          languages: languages && languages.length > 0 ? languages : null,
          countries: countries && countries.length > 0 ? countries : null,
          gender: gender || null,
          authorized: isFirstUser ? true : null, // First user is automatically authorized, others pending
          accountConfirmed: true,
          twoFactorStatus: totpCredentialData?.encryptedSecret ? "active" : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log(`✅ User created: ${newUser.id} (${newUser.email})`);
      console.log(`   Authorized: ${newUser.authorized}`);

      // Store TOTP credential if provided (from 2FA setup during signup)
      if (totpCredentialData?.encryptedSecret) {
        await tx.insert(totpCredentials).values({
          userId: newUser.id,
          encryptedSecret: totpCredentialData.encryptedSecret,
          encryptionIv: totpCredentialData.encryptionIv,
          encryptionTag: totpCredentialData.encryptionTag,
          isActive: true,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("✅ TOTP credential stored");
      }

      // Store passkey credential if provided
      if (passkeyCredentialData?.credentialId) {
        await tx.insert(passkeyCredentials).values({
          userId: newUser.id,
          credentialId: passkeyCredentialData.credentialId,
          publicKey: passkeyCredentialData.publicKey,
          counter: passkeyCredentialData.counter || 0,
          credentialDeviceType: passkeyCredentialData.credentialDeviceType,
          credentialBackedUp: passkeyCredentialData.credentialBackedUp,
          transports: passkeyCredentialData.transports || [],
          deviceName: passkeyCredentialData.deviceName || "Signup Device",
          aaguid: passkeyCredentialData.aaguid,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("✅ Passkey credential stored");
      }

      // Create pending mission join requests for missions picked during signup.
      // Invalid/stale ids are silently filtered — signup must not fail over them.
      if (requestedMissionIds.length > 0) {
        const validMissions = await tx
          .select({ id: missions.id })
          .from(missions)
          .where(
            and(
              inArray(missions.id, requestedMissionIds),
              inArray(missions.status, ["planned", "active"]),
            ),
          );
        const joinable = validMissions.map((m) => m.id);
        if (joinable.length > 0) {
          await tx.insert(missionRequests).values(
            joinable.map((missionId) => ({
              userId: newUser.id,
              missionId,
              status: "pending" as const,
            })),
          );
          console.log(`✅ Created ${joinable.length} pending mission request(s)`);
        }
      }

      // Create user settings
      await tx.insert(userSettings).values({
        userId: newUser.id,
        // Preferences only — name/email/accountType/countries/languages/
        // doctorSpecialty all live on `users`, written just above.
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ User settings created");

      // If first user, create admin record
      if (isFirstUser) {
        await tx.insert(admins).values({
          userId: newUser.id,
          firstName,
          lastName,
          email: email.toLowerCase(),
          adminStartDate: new Date(),
          createdAt: new Date(),
        });
        console.log("✅ Admin record created (first user)");
      }

      return newUser;
    });

    // 5. Send welcome email (async, don't wait for it)
    sendWelcomeEmail(email, firstName, lastName, accountType).catch((err) => {
      console.error("⚠️ Failed to send welcome email:", err);
      // Don't fail the signup if email fails
    });

    // 6. Notify all admins of new user signup (only if not the first user)
    if (!isFirstUser) {
      notifyAdminsOfNewSignup({
        userId: result.id,
        firstName,
        lastName,
        email: email.toLowerCase(),
        accountType,
      }).catch((err) => {
        console.error("⚠️ Failed to notify admins of new signup:", err);
        // Don't fail the signup if notification fails
      });
    }

    console.log(`🎉 Signup successful for ${email} (${accountType})`);
    if (isFirstUser) {
      console.log("👑 First user - Admin privileges granted automatically");
    }

    return NextResponse.json(
      {
        message: "Signup successful",
        userId: result.id,
        isFirstUser,
        authorized: result.authorized,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Signup error:", error);

    // Provide more detailed error messages in development
    const isDev = process.env.NODE_ENV === "development";
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        message: `Error during signup${isDev ? ": " + errorMessage : ""}`,
        ...(isDev && {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 },
    );
  }
}
