// app/api/icd10/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchICD10Codes } from "@/lib/medical-codes-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Search for codes that match the query in code or description
    const results = await searchICD10Codes(query, 50);

    // Format results to match expected structure (code and description only)
    const formattedResults = results.map((result) => ({
      code: result.code,
      description: result.description,
    }));

    return NextResponse.json({ results: formattedResults });
  } catch (error) {
    console.error("Error searching ICD10 codes:", error);
    return NextResponse.json(
      { error: "Failed to search ICD10 codes" },
      { status: 500 },
    );
  }
}
