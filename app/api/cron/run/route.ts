// GET /api/cron/run — invoked by the scheduler (Vercel Cron) on an interval.
// Protected by a shared secret so only the cron (or you, deliberately) can
// trigger real phone calls.
import { NextResponse } from "next/server";
import { runDueCalls } from "@/modules/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // If no secret is configured (local dev), allow it.
  if (!secret) return true;

  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  // Also accept ?secret= for manual triggering from a browser/curl.
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runDueCalls();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
