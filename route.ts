import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Return daily credits status
  return NextResponse.json(
    { status: "ok" },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
