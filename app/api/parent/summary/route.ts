import { NextResponse } from "next/server";
import { getChildSummaries, ForbiddenError } from "@/lib/parentSummary";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? undefined;

  try {
    const children = await getChildSummaries(profileId);
    return NextResponse.json({ children });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}
