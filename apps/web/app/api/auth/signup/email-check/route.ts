// app/api/auth/signup/email-check/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/db/connection';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Convert to lowercase for case-insensitive comparison
    const lowercaseEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lowercaseEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, lowercaseEmail),
      columns: {
        id: true,
        email: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          exists: true,
          message: 'Account already exists. Please login.'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        exists: false,
        message: 'Email available for signup.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error checking email:', error);

    const isDev = process.env.NODE_ENV === 'development';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(isDev && { details: errorMessage })
      },
      { status: 500 }
    );
  }
}
