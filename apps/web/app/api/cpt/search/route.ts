// app/api/cpt/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchCPTCodes } from "@/lib/medical-codes-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Search for codes that match the query in code or description
    const results = await searchCPTCodes(query, 50);

    // Format results to match expected structure (code and description only)
    const formattedResults = results.map((result) => ({
      code: result.code,
      description: result.description,
    }));

    return NextResponse.json({ results: formattedResults });
  } catch (error) {
    console.error("Error searching CPT codes:", error);
    return NextResponse.json(
      { error: "Failed to search CPT codes" },
      { status: 500 },
    );
  }
}
