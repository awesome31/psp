// POST /api/webhooks/vapi — Vapi posts call events here.
// We act on the end-of-call report: update the call row (summary, transcript,
// recording, structured data) and reflect the outcome on the patient.
import { NextResponse } from "next/server";
import { parseEndOfCallReport } from "@/modules/vapi";
import { completeCallByVapiId } from "@/modules/calls";
import { markPatientStatus } from "@/modules/patients";
import { prisma } from "@/modules/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // Optional shared-secret check (set VAPI_WEBHOOK_SECRET + configure in Vapi).
    const secret = process.env.VAPI_WEBHOOK_SECRET;
    if (secret) {
      const provided = request.headers.get("x-vapi-secret");
      if (provided !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const report = parseEndOfCallReport(body);

    // Non-terminal events (status-update, transcript, etc.) — just acknowledge.
    if (!report) return NextResponse.json({ ok: true, ignored: true });

    const call = await completeCallByVapiId({
      vapiCallId: report.vapiCallId,
      status: report.status,
      summary: report.summary,
      transcriptUrl: report.transcriptUrl,
      recordingUrl: report.recordingUrl,
      structuredData: report.structuredData,
      endedAt: report.endedAt,
    });

    // Mirror the call outcome onto the patient so the list view reflects it.
    if (call) {
      await markPatientStatus(call.patientId, report.status === "completed" ? "completed" : "failed");
    } else {
      // We received a report for a call we never recorded — log for visibility.
      console.warn(`Webhook for unknown vapiCallId: ${report.vapiCallId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Ensure connection is returned to the pool in serverless.
    void prisma;
  }
}
