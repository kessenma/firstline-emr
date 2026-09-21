export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { thumbKeyFor } from "@/lib/storage/thumbnails";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

/**
 * GET /api/media/get-signed-url
 *
 * Unified endpoint for generating signed URLs for any media file in object storage.
 * Replaces the per-domain endpoints:
 *   - /api/internal-messages/get-media
 *   - /api/telegram-thread/get-media
 *   - /api/patient/[id]/get-photo-url
 *   - /api/missions/get-media
 *
 * @query filePath - File path in object storage (e.g. "prod/telegram/photos/123/photo.jpg")
 * @query proxy   - If "true", streams the file through this endpoint (avoids CORS on web)
 * @query variant - If "thumb", returns a URL for the derived thumbnail instead,
 *                  generating it on first request. Responds 200 with
 *                  { signedUrl: null, thumbStatus: "unavailable" } when no
 *                  thumbnail can be made — the original may still exist, so
 *                  clients show a "no preview" state, not a broken-file state.
 * @returns { signedUrl } or binary file stream (proxy mode)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized access. Please log in." },
        { status: 401 },
      );
    }

    const filePath = request.nextUrl.searchParams.get("filePath");
    if (!filePath) {
      return NextResponse.json(
        { error: "filePath query parameter is required" },
        { status: 400 },
      );
    }

    // Resolve the S3 key from the filePath (handle both relative and full URLs)
    const key = resolveS3Key(filePath);

    if (request.nextUrl.searchParams.get("variant") === "thumb") {
      const status = await storageService.ensureThumbnail(key);
      if (status !== "ready") {
        return NextResponse.json(
          { signedUrl: null, thumbStatus: "unavailable" },
          { status: 200 },
        );
      }
      const signedUrl = await storageService.getSignedUrl(thumbKeyFor(key)!, 3600);
      return NextResponse.json(
        { signedUrl, thumbStatus: "ready" },
        { status: 200 },
      );
    }

    const proxy = request.nextUrl.searchParams.get("proxy") === "true";

    // Proxy mode: stream the file through this endpoint (for web CORS avoidance)
    if (proxy) {
      return await proxyFile(key);
    }

    // Default: return a signed URL
    const signedUrl = await storageService.getSignedUrl(key, 3600);

    return NextResponse.json({ signedUrl }, { status: 200 });
  } catch (error) {
    console.error("[get-signed-url] Error:", error);
    return NextResponse.json(
      { error: "Failed to get media URL" },
      { status: 500 },
    );
  }
}

/**
 * Resolve a file path or full URL to an S3 object key.
 * Handles both relative paths ("prod/telegram/photos/...") and
 * full URLs ("https://storage.example.com/bucket/prod/...").
 */
function resolveS3Key(filePath: string): string {
  if (!filePath.startsWith("http")) {
    return decodeURIComponent(filePath);
  }

  const url = new URL(filePath);
  const pathname = decodeURIComponent(url.pathname.substring(1));

  const bucketName = process.env.OBJECT_STORAGE_BUCKET!;
  if (pathname.startsWith(`${bucketName}/`)) {
    return pathname.substring(bucketName.length + 1);
  }

  return pathname;
}

/**
 * Stream a file from S3 through this endpoint.
 * Used by web frontend to avoid CORS issues with direct S3 URLs.
 */
async function proxyFile(key: string): Promise<NextResponse> {
  // Create a temporary S3 client for streaming (storageService doesn't expose raw client)
  const s3Client = new S3Client({
    endpoint: `https://${process.env.OBJECT_STORAGE_ENDPOINT}`,
    region: process.env.OBJECT_STORAGE_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.OBJECT_STORAGE_KEY!,
      secretAccessKey: process.env.OBJECT_STORAGE_SECRET!,
    },
    forcePathStyle: true,
  });

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: process.env.OBJECT_STORAGE_BUCKET!,
      Key: key,
    }),
  );

  if (!response.Body) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const chunks: Uint8Array[] = [];
  const stream = response.Body as Readable;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const contentType = response.ContentType || getContentType(key);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/** Map file extension to content type */
function getContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    ogg: "audio/ogg",
    opus: "audio/opus",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    pdf: "application/pdf",
  };
  return contentTypes[ext || ""] || "application/octet-stream";
}
