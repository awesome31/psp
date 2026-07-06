// GET /api/calls — all call attempts with summaries, for the history view.
import { NextResponse } from "next/server";
import { listCalls } from "@/modules/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const calls = await listCalls();
    return NextResponse.json({ calls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
