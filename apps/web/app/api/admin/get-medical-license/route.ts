// app/api/admin/get-medical-license/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const spacesEndpoint = process.env.OBJECT_STORAGE_ENDPOINT;
const s3Client = new S3Client({
  endpoint: spacesEndpoint?.startsWith("https://")
    ? spacesEndpoint
    : `https://${spacesEndpoint}`,
  region: process.env.OBJECT_STORAGE_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.OBJECT_STORAGE_KEY!,
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET!,
  },
  forcePathStyle: true, // IMPORTANT for MinIO
});

export async function GET(req: NextRequest) {
  // Authentication using DAL
  const session = await verifySessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    // Find the user
    console.log(`Looking for user with ID: ${userId}`);
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        accountType: users.accountType,
        medicalLicense: users.medicalLicense,
        medicalLicenses: users.medicalLicenses,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.log(`User not found with ID: ${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(
      `Found user: ${user.firstName} ${user.lastName}, accountType: ${user.accountType}`,
    );

    // Check for both old and new license formats
    const hasOldLicense = user.medicalLicense;
    const hasNewLicenses =
      user.medicalLicenses &&
      Array.isArray(user.medicalLicenses) &&
      user.medicalLicenses.length > 0;

    console.log(
      `License check - hasOldLicense: ${!!hasOldLicense}, hasNewLicenses: ${hasNewLicenses}, newLicensesCount: ${user.medicalLicenses?.length || 0}`,
    );

    if (!hasOldLicense && !hasNewLicenses) {
      console.log(`User has no medical licenses`);
      return NextResponse.json(
        { error: "User has no medical licenses" },
        { status: 404 },
      );
    }

    const licenses = [];

    // Helper function to infer mimeType from file path
    const inferMimeType = (filePath: string): string | undefined => {
      const lowerPath = filePath.toLowerCase();
      if (lowerPath.endsWith('.pdf')) return 'application/pdf';
      if (lowerPath.match(/\.(jpg|jpeg)$/)) return 'image/jpeg';
      if (lowerPath.endsWith('.png')) return 'image/png';
      return undefined;
    };

    // Handle new format (multiple licenses with specialties)
    if (hasNewLicenses && user.medicalLicenses) {
      for (const license of user.medicalLicenses) {
        try {
          const filePath = license.licenseUrl;

          // Determine if `filePath` is relative or a full URL
          let key: string;
          if (filePath.startsWith("http")) {
            // Full URL: Extract path after the bucket name
            const url = new URL(filePath);
            key = decodeURIComponent(url.pathname.substring(1)); // Remove leading "/"
          } else {
            // Relative path: Use as-is
            key = decodeURIComponent(filePath);
          }

          // Generate presigned URL
          const signedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: process.env.OBJECT_STORAGE_BUCKET!,
              Key: key,
            }),
            { expiresIn: 1800 }, // 30 minutes for admin viewing
          );

          // Use stored mimeType or infer from file path for backwards compatibility
          const mimeType = license.mimeType || inferMimeType(filePath);

          licenses.push({
            specialty: license.specialty,
            signedUrl,
            uploadedAt: license.uploadedAt,
            mimeType,
          });
        } catch (error) {
          console.error(
            `Error generating signed URL for license ${license.specialty}:`,
            error,
          );
          // Continue with other licenses even if one fails
        }
      }
    }

    // Handle old format (single license) for backward compatibility
    if (hasOldLicense && licenses.length === 0 && user.medicalLicense) {
      try {
        const filePath = user.medicalLicense;

        // Determine if `filePath` is relative or a full URL
        let key: string;
        if (filePath.startsWith("http")) {
          // Full URL: Extract path after the bucket name
          const url = new URL(filePath);
          key = decodeURIComponent(url.pathname.substring(1)); // Remove leading "/"
        } else {
          // Relative path: Use as-is
          key = decodeURIComponent(filePath);
        }

        // Generate presigned URL
        const signedUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: process.env.OBJECT_STORAGE_BUCKET!,
            Key: key,
          }),
          { expiresIn: 1800 }, // 30 minutes for admin viewing
        );

        licenses.push({
          specialty: "General", // Default specialty for old format
          signedUrl,
          uploadedAt: null,
          mimeType: inferMimeType(filePath),
        });
      } catch (error) {
        console.error("Error generating signed URL for legacy license:", error);
      }
    }

    if (licenses.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate signed URLs for medical licenses" },
        { status: 500 },
      );
    }

    console.log(
      `Generated signed URLs for ${licenses.length} medical license(s)`,
    );

    return NextResponse.json(
      {
        licenses,
        userId: session.userId,
        userName: `${session.firstName} ${session.lastName}`,
        accountType: session.accountType,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(
      "Error generating medical license signed URL:",
      error.message,
    );
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 },
    );
  }
}
