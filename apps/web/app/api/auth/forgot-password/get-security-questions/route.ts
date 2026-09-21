// app/api/auth/forgot-password/get-security-questions/route.ts
import { NextResponse } from "next/server";
import { getRandomSecurityQuestion } from "@/lib/auth-db-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    if (!email) {
      console.error("Email is missing in the request");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const questionData = await getRandomSecurityQuestion(email);

    if (!questionData) {
      console.error(
        `No security questions found for user with email: ${email}`,
      );
      return NextResponse.json(
        { error: "No security questions found for this user" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        question: questionData.question,
        questionId: questionData.questionId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error retrieving user or security question:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
