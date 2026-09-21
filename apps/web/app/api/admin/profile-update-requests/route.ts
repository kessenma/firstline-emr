// app/api/admin/profile-update-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userProfileUpdateRequests } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { verifySessionFromRequest } from '@/lib/dal';

export const dynamic = 'force-dynamic';

// GET - Get all profile update requests (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify admin access using DAL (works with both cookies and Bearer tokens)
    const session = await verifySessionFromRequest(request);

    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let whereConditions: any = undefined;

    if (status && ['pending', 'approved', 'denied'].includes(status)) {
      whereConditions = eq(userProfileUpdateRequests.status, status as any);
    }

    const requests = await db.query.userProfileUpdateRequests.findMany({
      where: whereConditions,
      orderBy: [desc(userProfileUpdateRequests.requestedAt)],
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accountType: true,
            doctorSpecialty: true,
          },
        },
      },
    });

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error('Error fetching profile update requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
