// POST /api/calls/sync — pulls ended Vapi calls when webhooks were unavailable.
import { NextResponse } from "next/server";
import { completeCallByVapiId, listCallingCallsForSync } from "@/modules/calls";
import { markPatientStatus } from "@/modules/patients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VAPI_BASE = "https://api.vapi.ai";

type VapiCall = {
  id?: string;
  status?: string;
  endedReason?: string;
  endedAt?: string;
  analysis?: {
    summary?: string;
    structuredData?: unknown;
  };
  artifact?: {
    transcriptUrl?: string;
    recordingUrl?: string;
  };
};

function vapiKey(): string {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY is not set.");
  return key;
}

function isFailedCall(call: VapiCall): boolean {
  const endedReason = String(call.endedReason ?? "");
  return /error|failed|no-answer|busy|voicemail|blocked/i.test(endedReason);
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

async function getVapiCall(vapiCallId: string): Promise<VapiCall> {
  const res = await fetch(`${VAPI_BASE}/call/${vapiCallId}`, {
    headers: { Authorization: `Bearer ${vapiKey()}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Vapi lookup failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as VapiCall;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const calls = await listCallingCallsForSync();
    let completed = 0;
    let failed = 0;
    let stillCalling = 0;

    for (const call of calls) {
      if (!call.vapiCallId) continue;

      const vapiCall = await getVapiCall(call.vapiCallId);
      if (vapiCall.status !== "ended") {
        stillCalling += 1;
        continue;
      }

      const status = isFailedCall(vapiCall) ? "failed" : "completed";
      await completeCallByVapiId({
        vapiCallId: call.vapiCallId,
        status,
        summary: vapiCall.analysis?.summary,
        transcriptUrl: vapiCall.artifact?.transcriptUrl,
        recordingUrl: vapiCall.artifact?.recordingUrl,
        structuredData: vapiCall.analysis?.structuredData,
        endedAt: vapiCall.endedAt ? new Date(vapiCall.endedAt) : new Date(),
      });
      await markPatientStatus(call.patientId, status);

      if (status === "completed") completed += 1;
      else failed += 1;
    }

    return NextResponse.json({ checked: calls.length, completed, failed, stillCalling });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
