// lib/medical-codes-helpers.ts
import { db } from '@/db';
import { icd10Codes, cptCodes, type ICD10Code, type CPTCode } from '@/db/schema';
import { or, ilike, sql } from 'drizzle-orm';

/**
 * ICD-10 Code Helpers
 */

export async function searchICD10Codes(
  query: string,
  limit: number = 50
): Promise<ICD10Code[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const searchPattern = `%${query}%`;

  const results = await db
    .select({
      id: icd10Codes.id,
      code: icd10Codes.code,
      description: icd10Codes.description,
      createdAt: icd10Codes.createdAt,
      updatedAt: icd10Codes.updatedAt,
    })
    .from(icd10Codes)
    .where(
      or(
        ilike(icd10Codes.code, searchPattern),
        ilike(icd10Codes.description, searchPattern)
      )
    )
    .orderBy(icd10Codes.code)
    .limit(limit);

  return results;
}

export async function getICD10CodeByCode(code: string): Promise<ICD10Code | undefined> {
  const [result] = await db
    .select()
    .from(icd10Codes)
    .where(ilike(icd10Codes.code, code))
    .limit(1);

  return result;
}

export async function createICD10Code(
  code: string,
  description: string
): Promise<ICD10Code> {
  const [newCode] = await db
    .insert(icd10Codes)
    .values({
      code,
      description,
    })
    .returning();

  return newCode;
}

export async function bulkCreateICD10Codes(
  codes: Array<{ code: string; description: string }>
): Promise<ICD10Code[]> {
  if (codes.length === 0) return [];

  const results = await db
    .insert(icd10Codes)
    .values(codes)
    .returning();

  return results;
}

/**
 * CPT Code Helpers
 */

export async function searchCPTCodes(
  query: string,
  limit: number = 50
): Promise<CPTCode[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const searchPattern = `%${query}%`;

  const results = await db
    .select({
      id: cptCodes.id,
      code: cptCodes.code,
      description: cptCodes.description,
      createdAt: cptCodes.createdAt,
      updatedAt: cptCodes.updatedAt,
    })
    .from(cptCodes)
    .where(
      or(
        ilike(cptCodes.code, searchPattern),
        ilike(cptCodes.description, searchPattern)
      )
    )
    .orderBy(cptCodes.code)
    .limit(limit);

  return results;
}

export async function getCPTCodeByCode(code: string): Promise<CPTCode | undefined> {
  const [result] = await db
    .select()
    .from(cptCodes)
    .where(ilike(cptCodes.code, code))
    .limit(1);

  return result;
}

export async function createCPTCode(
  code: string,
  description: string
): Promise<CPTCode> {
  const [newCode] = await db
    .insert(cptCodes)
    .values({
      code,
      description,
    })
    .returning();

  return newCode;
}

export async function bulkCreateCPTCodes(
  codes: Array<{ code: string; description: string }>
): Promise<CPTCode[]> {
  if (codes.length === 0) return [];

  const results = await db
    .insert(cptCodes)
    .values(codes)
    .returning();

  return results;
}

/**
 * Statistics and Counts
 */

export async function getICD10CodesCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(icd10Codes);

  return Number(result?.count || 0);
}

export async function getCPTCodesCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cptCodes);

  return Number(result?.count || 0);
}
