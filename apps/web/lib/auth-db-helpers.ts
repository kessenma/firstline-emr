// lib/auth-db-helpers.ts
import { db } from '@/db';
import { users, securityQuestions, admins, type User, type SecurityQuestion, type Admin } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * User Authentication Helpers
 */

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
  await db
    .update(users)
    .set({
      password: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Password Reset - Verification Code Flow
 */

export async function setVerificationCode(
  email: string,
  code: string,
  expiryMinutes: number = 30
): Promise<boolean> {
  const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const result = await db
    .update(users)
    .set({
      tempPasswordResetCode: code,
      tempCodeExpiry: expiry,
      updatedAt: new Date(),
    })
    .where(eq(users.email, email))
    .returning();

  return result.length > 0;
}

export async function verifyResetCode(email: string, code: string): Promise<{
  valid: boolean;
  expired?: boolean;
  user?: User;
}> {
  const user = await findUserByEmail(email);

  if (!user) {
    return { valid: false };
  }

  if (!user.tempPasswordResetCode || !user.tempCodeExpiry) {
    return { valid: false };
  }

  const now = new Date();
  if (now > user.tempCodeExpiry) {
    return { valid: false, expired: true };
  }

  if (user.tempPasswordResetCode !== code) {
    return { valid: false };
  }

  return { valid: true, user };
}

export async function resetPasswordWithCode(
  email: string,
  newPasswordHash: string
): Promise<boolean> {
  const result = await db
    .update(users)
    .set({
      password: newPasswordHash,
      tempPasswordResetCode: null,
      tempCodeExpiry: null,
      updatedAt: new Date(),
    })
    .where(eq(users.email, email))
    .returning();

  return result.length > 0;
}

/**
 * Password Reset - Admin Link Flow
 */

export async function setAdminResetLink(
  email: string,
  resetLink: string,
  expiryHours: number = 24
): Promise<boolean> {
  const expiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  const result = await db
    .update(users)
    .set({
      adminResetPasswordLink: resetLink,
      adminResetLinkExpiry: expiry,
      updatedAt: new Date(),
    })
    .where(eq(users.email, email))
    .returning();

  return result.length > 0;
}

export async function findUserByResetLink(resetLink: string): Promise<User | undefined> {
  const now = new Date();

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.adminResetPasswordLink, resetLink),
        gt(users.adminResetLinkExpiry, now)
      )
    )
    .limit(1);

  return user;
}

export async function resetPasswordWithLink(
  resetLink: string,
  newPasswordHash: string
): Promise<boolean> {
  const now = new Date();

  const result = await db
    .update(users)
    .set({
      password: newPasswordHash,
      adminResetPasswordLink: null,
      adminResetLinkExpiry: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.adminResetPasswordLink, resetLink),
        gt(users.adminResetLinkExpiry, now)
      )
    )
    .returning();

  return result.length > 0;
}

export async function validateResetLink(resetLink: string): Promise<boolean> {
  const user = await findUserByResetLink(resetLink);
  return !!user;
}

/**
 * Security Questions
 */

export async function getUserSecurityQuestions(
  userId: string
): Promise<SecurityQuestion[]> {
  return await db
    .select()
    .from(securityQuestions)
    .where(eq(securityQuestions.userId, userId));
}

export async function getRandomSecurityQuestion(
  email: string
): Promise<{ question: string; questionId: string } | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const questions = await getUserSecurityQuestions(user.id);
  if (!questions || questions.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * questions.length);
  const selectedQuestion = questions[randomIndex];

  return {
    question: selectedQuestion.question,
    questionId: selectedQuestion.id,
  };
}

export async function verifySecurityAnswer(
  email: string,
  question: string,
  answer: string
): Promise<boolean> {
  const user = await findUserByEmail(email);
  if (!user) return false;

  const questions = await getUserSecurityQuestions(user.id);
  const matchingQuestion = questions.find((q) => q.question === question);

  if (!matchingQuestion) return false;

  const isValid = await bcrypt.compare(answer, matchingQuestion.answer);
  return isValid;
}

export async function addSecurityQuestion(
  userId: string,
  question: string,
  answerHash: string
): Promise<SecurityQuestion> {
  const [newQuestion] = await db
    .insert(securityQuestions)
    .values({
      userId,
      question,
      answer: answerHash,
    })
    .returning();

  return newQuestion;
}

/**
 * Admin Management
 */

export async function isUserAdmin(userId: string): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.userId, userId))
    .limit(1);

  return !!admin;
}

export async function getAllAdmins(): Promise<
  Array<Admin & { user: User }>
> {
  const adminsList = await db
    .select({
      admin: admins,
      user: users,
    })
    .from(admins)
    .leftJoin(users, eq(admins.userId, users.id));

  return adminsList.map((row) => ({
    ...row.admin,
    user: row.user!,
  }));
}

export async function addAdmin(userId: string): Promise<Admin | null> {
  const user = await findUserById(userId);
  if (!user) return null;

  // Check if already admin
  const existingAdmin = await isUserAdmin(userId);
  if (existingAdmin) return null;

  const [newAdmin] = await db
    .insert(admins)
    .values({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    })
    .returning();

  return newAdmin;
}

export async function removeAdmin(adminId: string): Promise<boolean> {
  const result = await db
    .delete(admins)
    .where(eq(admins.id, adminId))
    .returning();

  return result.length > 0;
}

export async function findAdminById(adminId: string): Promise<Admin | undefined> {
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  return admin;
}

export async function findAdminByUserId(userId: string): Promise<Admin | undefined> {
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.userId, userId))
    .limit(1);

  return admin;
}

/**
 * Rate Limiting Helper (in-memory - consider Redis for production)
 */

const rateLimitMap = new Map<
  string,
  { lastRequest: number; requestCount: number }
>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 60 * 1000 // 1 hour
): boolean {
  const now = Date.now();
  const rateLimitData = rateLimitMap.get(identifier) || {
    lastRequest: now,
    requestCount: 0,
  };

  // Reset window if expired
  if (now - rateLimitData.lastRequest > windowMs) {
    rateLimitMap.set(identifier, { lastRequest: now, requestCount: 1 });
    return true;
  }

  // Check if limit exceeded
  if (rateLimitData.requestCount >= maxRequests) {
    return false;
  }

  // Increment count
  rateLimitMap.set(identifier, {
    lastRequest: now,
    requestCount: rateLimitData.requestCount + 1,
  });

  return true;
}

/**
 * Cleanup expired entries (call periodically)
 */
export function cleanupRateLimitMap(): void {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  for (const [key, data] of rateLimitMap.entries()) {
    if (now - data.lastRequest > oneHour) {
      rateLimitMap.delete(key);
    }
  }
}
