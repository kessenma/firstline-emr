// scripts/migrate-license-keys.ts
//
// Move legacy medical-license objects to the owner-first key format:
//   old: {env}/medical_license/{specialty}/{ts}-{file}
//   new: {env}/medical_license/{userId}/{specialty}/{ts}-{file}
//
// The database is the source of truth: users.medicalLicenses stores each
// license's full storage path, so every DB-referenced file has a known owner.
// Per file the order is copy → verify → update DB → delete old, so a crash at
// any point leaves a working state (worst case: a duplicate old object that a
// re-run reports as an orphan). Legacy thumbnails are moved best-effort.
//
// Files under medical_license/ that no user references are reported as orphans
// and never touched.
//
// Usage (from apps/web, bun auto-loads .env/.env.local):
//   bun scripts/migrate-license-keys.ts           # dry run — prints the plan
//   bun scripts/migrate-license-keys.ts --apply   # execute
//
// Idempotent: already-migrated entries (scope segment == owner id) are skipped.

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { db } from "../db";
import { users } from "../db/schema";
import { eq, isNotNull, or, sql } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");

const BUCKET = process.env.OBJECT_STORAGE_BUCKET!;
const s3 = new S3Client({
  endpoint: `https://${process.env.OBJECT_STORAGE_ENDPOINT}`,
  region: process.env.OBJECT_STORAGE_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.OBJECT_STORAGE_KEY!,
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET!,
  },
  forcePathStyle: true,
});

const LEGACY_KEY = /^(dev|staging|prod)\/medical_license\/(.+)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LicenseEntry {
  specialty?: string;
  licenseUrl?: string;
  uploadedAt?: unknown;
  mimeType?: string;
}

interface PlannedMove {
  userId: string;
  userName: string;
  oldKey: string;
  newKey: string;
  source: "medicalLicenses" | "medicalLicense";
}

/** `{env}/medical_license/{rest}` → `{env}/medical_license/{userId}/{rest}`, or null if not a legacy key for this user. */
function planNewKey(key: string, userId: string): string | null {
  const m = key.match(LEGACY_KEY);
  if (!m) return null; // not a storage key we recognize (full URL, foreign path)
  const [, env, rest] = m;
  const firstSegment = rest.split("/")[0];
  if (firstSegment === userId) return null; // already migrated
  if (UUID.test(firstSegment)) return null; // scoped to some other user — flag, don't move
  return `${env}/medical_license/${userId}/${rest}`;
}

/** Mirror a key into the thumbs/ subtree (same mapping as lib/storage/thumbnails). */
function thumbKey(key: string): string {
  const slash = key.indexOf("/");
  return `${key.slice(0, slash)}/thumbs/${key.slice(slash + 1)}.webp`;
}

async function head(key: string) {
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return { exists: true, size: r.ContentLength ?? 0, contentType: r.ContentType, metadata: r.Metadata };
  } catch {
    return { exists: false, size: 0, contentType: undefined, metadata: undefined };
  }
}

/** GET+PUT instead of CopyObject — guaranteed on any S3-compatible store, and lets us stamp owner metadata. */
async function copyObject(oldKey: string, newKey: string, userId: string): Promise<number> {
  const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: oldKey }));
  const bytes = await got.Body!.transformToByteArray();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: newKey,
      Body: Buffer.from(bytes),
      ContentType: got.ContentType,
      Metadata: { ...got.Metadata, userid: userId },
    }),
  );
  const check = await head(newKey);
  if (!check.exists || check.size !== bytes.length) {
    throw new Error(`verify failed for ${newKey} (size ${check.size} != ${bytes.length})`);
  }
  return bytes.length;
}

async function main() {
  console.log(`[migrate-licenses] mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log(`[migrate-licenses] bucket: ${BUCKET} @ ${process.env.OBJECT_STORAGE_ENDPOINT}`);

  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      medicalLicense: users.medicalLicense,
      medicalLicenses: users.medicalLicenses,
    })
    .from(users)
    .where(or(isNotNull(users.medicalLicenses), isNotNull(users.medicalLicense)));

  const moves: PlannedMove[] = [];
  const skippedForeign: string[] = [];
  const unparseable: string[] = [];
  const referenced = new Set<string>(); // every path the DB knows, old or new

  for (const u of rows) {
    const name = `${u.firstName} ${u.lastName}`;
    const entries = (Array.isArray(u.medicalLicenses) ? u.medicalLicenses : []) as LicenseEntry[];

    for (const entry of entries) {
      const key = entry.licenseUrl;
      if (typeof key !== "string" || !key) continue;
      referenced.add(key);
      if (!LEGACY_KEY.test(key)) {
        unparseable.push(`${name}: ${key}`);
        continue;
      }
      const newKey = planNewKey(key, u.id);
      if (newKey) {
        moves.push({ userId: u.id, userName: name, oldKey: key, newKey, source: "medicalLicenses" });
        referenced.add(newKey);
      } else if (UUID.test(key.match(LEGACY_KEY)![2].split("/")[0]) && !key.includes(`/${u.id}/`)) {
        skippedForeign.push(`${name}: ${key}`);
      }
    }

    const legacySingle = u.medicalLicense;
    if (typeof legacySingle === "string" && LEGACY_KEY.test(legacySingle)) {
      referenced.add(legacySingle);
      const newKey = planNewKey(legacySingle, u.id);
      // Skip if the same path is already being moved via the array — the DB
      // update rewrites both columns in one pass.
      if (newKey && !moves.some((m) => m.oldKey === legacySingle)) {
        moves.push({ userId: u.id, userName: name, oldKey: legacySingle, newKey, source: "medicalLicense" });
        referenced.add(newKey);
      }
    }
  }

  console.log(`\n[migrate-licenses] users with license records: ${rows.length}`);
  console.log(`[migrate-licenses] planned moves: ${moves.length}`);
  for (const m of moves) {
    console.log(`  ${m.userName} (${m.source})\n    ${m.oldKey}\n    → ${m.newKey}`);
  }
  if (skippedForeign.length) {
    console.log(`\n[migrate-licenses] WARNING — keys scoped to a DIFFERENT user id (not touched):`);
    skippedForeign.forEach((s) => console.log(`  ${s}`));
  }
  if (unparseable.length) {
    console.log(`\n[migrate-licenses] unparseable license paths (not touched):`);
    unparseable.forEach((s) => console.log(`  ${s}`));
  }

  // Orphan scan: everything under medical_license/ that the DB doesn't reference.
  const orphans: string[] = [];
  for (const env of ["prod", "staging", "dev"]) {
    let token: string | undefined;
    do {
      const page = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: `${env}/medical_license/`,
          ContinuationToken: token,
        }),
      );
      for (const obj of page.Contents ?? []) {
        if (obj.Key && !referenced.has(obj.Key)) orphans.push(obj.Key);
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }
  if (orphans.length) {
    console.log(`\n[migrate-licenses] orphans — in storage but referenced by no user (not touched):`);
    orphans.forEach((k) => console.log(`  ${k}`));
  }

  if (!APPLY) {
    console.log(`\n[migrate-licenses] dry run complete — re-run with --apply to execute.`);
    process.exit(0);
  }

  let moved = 0;
  let failed = 0;
  for (const m of moves) {
    try {
      const oldHead = await head(m.oldKey);
      const newHead = await head(m.newKey);

      if (!oldHead.exists && newHead.exists) {
        console.log(`  already copied, fixing DB only: ${m.newKey}`);
      } else if (!oldHead.exists) {
        console.log(`  MISSING in storage, skipped: ${m.oldKey}`);
        failed++;
        continue;
      } else {
        const size = await copyObject(m.oldKey, m.newKey, m.userId);
        console.log(`  copied ${size} bytes → ${m.newKey}`);
      }

      // Rewrite both columns in one update so a path never dangles.
      const [current] = await db
        .select({ medicalLicense: users.medicalLicense, medicalLicenses: users.medicalLicenses })
        .from(users)
        .where(eq(users.id, m.userId))
        .limit(1);
      const updatedEntries = ((current?.medicalLicenses as LicenseEntry[] | null) ?? []).map((e) =>
        e.licenseUrl === m.oldKey ? { ...e, licenseUrl: m.newKey } : e,
      );
      await db
        .update(users)
        .set({
          medicalLicenses: updatedEntries,
          medicalLicense:
            current?.medicalLicense === m.oldKey ? m.newKey : current?.medicalLicense,
          updatedAt: new Date(),
        })
        .where(eq(users.id, m.userId));

      if ((await head(m.oldKey)).exists) {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: m.oldKey }));
      }

      // Legacy thumbnail: move best-effort; a miss just means lazy regeneration.
      const oldThumb = thumbKey(m.oldKey);
      if ((await head(oldThumb)).exists) {
        try {
          await copyObject(oldThumb, thumbKey(m.newKey), m.userId);
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldThumb }));
        } catch {
          console.log(`  (thumb move failed for ${oldThumb} — will regenerate lazily)`);
        }
      }

      moved++;
    } catch (err) {
      failed++;
      console.error(`  FAILED ${m.oldKey}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n[migrate-licenses] done — moved ${moved}, failed ${failed}, orphans ${orphans.length}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[migrate-licenses] fatal:", err);
  process.exit(1);
});
