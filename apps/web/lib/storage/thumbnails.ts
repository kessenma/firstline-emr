// apps/web/lib/storage/thumbnails.ts
// Thumbnail key mapping and image downscaling for object storage.
//
// Thumbnails live in a parallel subtree under the environment prefix, NOT next
// to the originals:
//   original: prod/patient-media/{id}/{ts}-photo.jpg
//   thumb:    prod/thumbs/patient-media/{id}/{ts}-photo.jpg.webp
//
// The mapping is deterministic in both directions, so no database row ever
// stores a thumbnail path — every consumer derives it from the original key.
// Keeping the subtree separate also means listings, category stats, and
// deletion logic can include or exclude thumbnails with a prefix check.

import { spawn } from "node:child_process";
import sharp from "sharp";

export const THUMBS_SEGMENT = "thumbs";
export const THUMB_MAX_DIM = 384;
export const THUMB_QUALITY = 70;
export const THUMB_CONTENT_TYPE = "image/webp";

/**
 * Originals above this size are never thumbnailed. Anything this large is
 * either not a real photo or would hold too much memory while decoding.
 */
export const THUMB_MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export type ThumbStatus = "ready" | "unavailable";

/** How an object's bytes must be decoded before downscaling. */
export type ThumbSourceKind = "image" | "pdf";

/**
 * Whether an object can have a thumbnail, and how it must be decoded.
 * Null means no thumbnail is possible — the UI shows a type icon instead.
 *
 * Content type is inferred from the file extension in listings, so the key is
 * checked as a fallback for objects stored without a usable one.
 */
export function thumbnailSourceKind(
  contentType: string | null | undefined,
  key: string,
): ThumbSourceKind | null {
  if (
    contentType?.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(key)
  ) {
    return "image";
  }
  if (contentType === "application/pdf" || /\.pdf$/i.test(key)) return "pdf";
  return null;
}

/** True when the key lives under `{env}/thumbs/`. */
export function isThumbKey(key: string): boolean {
  return key.split("/")[1] === THUMBS_SEGMENT;
}

/**
 * Derive the thumbnail key for an original object key.
 * Returns null for keys that cannot have one: already a thumbnail, or no
 * environment prefix to insert `thumbs/` after.
 */
export function thumbKeyFor(originalKey: string): string | null {
  const slash = originalKey.indexOf("/");
  if (slash <= 0 || slash === originalKey.length - 1) return null;
  if (isThumbKey(originalKey)) return null;
  return `${originalKey.slice(0, slash)}/${THUMBS_SEGMENT}/${originalKey.slice(slash + 1)}.webp`;
}

/**
 * Mirror a deletion prefix into the thumbs subtree, so deleting an entity's
 * media also deletes its thumbnails. `prod/patient-media/{id}` →
 * `prod/thumbs/patient-media/{id}`. Null when the prefix is malformed or
 * already points into thumbs.
 */
export function thumbPrefixFor(prefix: string): string | null {
  const slash = prefix.indexOf("/");
  if (slash <= 0) return null;
  if (isThumbKey(prefix)) return null;
  return `${prefix.slice(0, slash)}/${THUMBS_SEGMENT}/${prefix.slice(slash + 1)}`;
}

// Decoding a 12MP phone photo holds ~45MB of raw pixels, and lazy generation
// can be triggered by a whole grid page at once. Cap concurrent sharp work;
// excess callers queue.
const MAX_CONCURRENT_RESIZES = 3;
let activeResizes = 0;
const resizeQueue: (() => void)[] = [];

async function acquireResizeSlot(): Promise<void> {
  if (activeResizes < MAX_CONCURRENT_RESIZES) {
    activeResizes += 1;
    return;
  }
  await new Promise<void>((resolve) => resizeQueue.push(resolve));
}

function releaseResizeSlot(): void {
  const next = resizeQueue.shift();
  if (next) next(); // hand the slot to the next waiter; activeResizes unchanged
  else activeResizes -= 1;
}

/**
 * Downscale an image buffer to a webp thumbnail.
 * Throws on undecodable input (corrupt files, HEIC — prebuilt sharp binaries
 * cannot decode HEIC); callers treat that as "thumbnail unavailable".
 */
export async function generateThumbnailBuffer(input: Buffer): Promise<Buffer> {
  await acquireResizeSlot();
  try {
    return await sharp(input)
      .rotate() // apply EXIF orientation — phone photos rotate via metadata
      .resize(THUMB_MAX_DIM, THUMB_MAX_DIM, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();
  } finally {
    releaseResizeSlot();
  }
}

// ── PDF thumbnails ──
//
// libvips ships without poppler/PDFium in the prebuilt sharp binaries, so
// sharp cannot decode a PDF at all (`sharp.format.pdf.input` is all false).
// Page one is rasterized by poppler's `pdftoppm` instead, and the resulting
// PNG then goes through the exact same resize path as any other image.
//
// `pdftoppm` is an apt package (poppler-utils), not a service: one short-lived
// process per thumbnail. Where it is absent the spawn fails, the caller records
// "unavailable", and the UI falls back to a document icon.

/** Render DPI for page one. 72dpi puts US Letter at 612x792 — ample for a 384px thumb. */
const PDF_RENDER_DPI = 72;

/** A page that takes longer than this to rasterize is not worth a thumbnail. */
const PDF_RASTERIZE_TIMEOUT_MS = 10_000;

/** Guards against a pathological page rendering into a huge bitmap. */
const PDF_MAX_RASTER_BYTES = 40 * 1024 * 1024;

/**
 * Rasterize the first page of a PDF to a PNG buffer.
 * Rejects when poppler is unavailable, the PDF is unreadable, or either limit
 * above is hit.
 */
function rasterizePdfFirstPage(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "pdftoppm",
      ["-png", "-r", String(PDF_RENDER_DPI), "-f", "1", "-l", "1", "-singlefile", "-"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(error);
    };

    const timer = setTimeout(
      () => fail(new Error("pdftoppm timed out")),
      PDF_RASTERIZE_TIMEOUT_MS,
    );

    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > PDF_MAX_RASTER_BYTES) {
        fail(new Error("pdftoppm output exceeded size limit"));
        return;
      }
      chunks.push(chunk);
    });

    // Drained but not collected: a stuck stderr pipe would block the child.
    child.stderr.resume();

    child.on("error", (error) =>
      fail(
        new Error(
          `pdftoppm unavailable (install poppler-utils): ${error.message}`,
        ),
      ),
    );

    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (code !== 0 || chunks.length === 0) {
        reject(new Error(`pdftoppm exited with code ${code}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    // EPIPE here just means the child already bailed; `close` reports why.
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

/**
 * Downscale the first page of a PDF to a webp thumbnail.
 * Throws when the PDF cannot be rasterized; callers treat that as
 * "thumbnail unavailable", exactly as for an undecodable image.
 */
export async function generatePdfThumbnailBuffer(input: Buffer): Promise<Buffer> {
  // The two stages take the slot in turn rather than nesting — holding one
  // while waiting for another would deadlock once all slots are rasterizing.
  await acquireResizeSlot();
  let page: Buffer;
  try {
    page = await rasterizePdfFirstPage(input);
  } finally {
    releaseResizeSlot();
  }

  return generateThumbnailBuffer(page);
}
