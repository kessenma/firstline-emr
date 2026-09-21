// apps/web/lib/backup/zitadelDump.ts
// Native pg_dump / pg_restore of the separate Zitadel identity database.
//
// Zitadel is event-sourced (eventstore + projections, composite keys, a
// version-coupled schema) and cannot be modeled as rows in columnMaps.ts, so it
// is captured as an opaque pg_dump custom-format blob. This module shells out to
// the postgresql-client-17 binaries installed in the web Docker image. The
// admin SQL (terminate/drop/create) runs through the app's own pg pool, which is
// connected to the maintenance database — never to `zitadel` itself.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pool } from "@/db/connection";

const execFileAsync = promisify(execFile);

const ZITADEL_DB = "zitadel";
// Generous buffer for pg_restore chatter; the dump itself goes via files.
const MAX_BUFFER = 64 * 1024 * 1024;

export interface ZitadelConnParams {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

/**
 * Parse DATABASE_URL the same way apps/auth/entrypoint.sh does, but always
 * target the `zitadel` database rather than the app database.
 */
export function getZitadelConnParams(): ZitadelConnParams {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");

  let clean = raw;
  while (clean.startsWith("DATABASE_URL=")) {
    clean = clean.slice("DATABASE_URL=".length);
  }
  if (!/^postgres(ql)?:\/\//.test(clean)) {
    throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
  }

  const noProto = clean.replace(/^postgres(ql)?:\/\//, "");
  const userPass = noProto.slice(0, noProto.indexOf("@"));
  const hostPortDb = noProto.slice(noProto.indexOf("@") + 1);

  const user = userPass.slice(0, userPass.indexOf(":"));
  const password = userPass.slice(userPass.indexOf(":") + 1);

  const hostPort = hostPortDb.split("/")[0];
  const [host, portMaybe] = hostPort.split(":");
  const port = portMaybe || "5432";

  return { host, port, user, password, database: ZITADEL_DB };
}

/** Child-process env with the DB password + non-SSL (matches the app pool). */
function pgEnv(params: ZitadelConnParams): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PGPASSWORD: params.password,
    PGSSLMODE: process.env.PGSSLMODE || "disable",
  };
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** SHA-256 of ZITADEL_MASTERKEY — a verifier, never the key itself. */
export function masterkeyFingerprint(): string | null {
  const key = process.env.ZITADEL_MASTERKEY;
  return key ? sha256Hex(key) : null;
}

/** SHA-256 of TOTP_ENCRYPTION_KEY — TOTP secrets are useless without a match. */
export function totpKeyFingerprint(): string | null {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  return key ? sha256Hex(key) : null;
}

/** The WebAuthn RP-ID passkeys are bound to (must be preserved across move). */
export function getWebauthnRpId(): string {
  return process.env.WEBAUTHN_RP_ID || "localhost";
}

export function getZitadelExternalDomain(): string {
  return process.env.ZITADEL_DOMAIN || "identity.fajrmission.org";
}

export function getZitadelVersion(): string {
  return process.env.ZITADEL_VERSION || "v2.64.1";
}

/** Number of live connections to the `zitadel` DB (i.e. is Zitadel running?). */
export async function isZitadelConnected(): Promise<number> {
  const res = await pool.query(
    "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = $1",
    [ZITADEL_DB],
  );
  return res.rows[0]?.n ?? 0;
}

/**
 * pg_dump the entire `zitadel` database (custom format) and return it as a
 * Buffer. Dumps to a temp file first so stdout isn't held fully in memory by
 * the pipe; the file is read once and removed.
 */
export async function dumpZitadelDatabase(): Promise<Buffer> {
  const params = getZitadelConnParams();
  const tmpFile = join(tmpdir(), `zitadel-dump-${randomUUID()}.dump`);

  try {
    await execFileAsync(
      "pg_dump",
      [
        "-Fc",
        "--no-owner",
        "--no-privileges",
        "-h", params.host,
        "-p", params.port,
        "-U", params.user,
        "-d", params.database,
        "-f", tmpFile,
      ],
      { env: pgEnv(params), maxBuffer: MAX_BUFFER },
    );
    return await readFile(tmpFile);
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}

/**
 * Restore a pg_dump blob into `zitadel`: terminate any live connections, drop
 * and recreate the database, then pg_restore. DESTRUCTIVE — the caller must
 * ensure the Zitadel container is stopped (see isZitadelConnected preflight).
 */
export async function restoreZitadelDatabase(dump: Buffer): Promise<void> {
  const params = getZitadelConnParams();
  const tmpFile = join(tmpdir(), `zitadel-restore-${randomUUID()}.dump`);

  try {
    await writeFile(tmpFile, dump);

    // Force-close any lingering sessions, then drop/recreate. These run on the
    // maintenance DB the app pool is connected to (never `zitadel`).
    await pool.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [ZITADEL_DB],
    );
    await pool.query(`DROP DATABASE IF EXISTS ${ZITADEL_DB}`);
    await pool.query(`CREATE DATABASE ${ZITADEL_DB}`);

    await execFileAsync(
      "pg_restore",
      [
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
        "-h", params.host,
        "-p", params.port,
        "-U", params.user,
        "-d", params.database,
        tmpFile,
      ],
      { env: pgEnv(params), maxBuffer: MAX_BUFFER },
    );
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}
