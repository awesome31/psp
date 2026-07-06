// Vapi client — places outbound AI voice calls and interprets webhooks.
// We call Vapi's REST API directly (no SDK) to keep this module small and
// dependency-free. All tunables come from env so nothing is hard-coded.
import type { Patient } from "@/modules/db";
import { buildScript } from "@/modules/scripts";

const VAPI_BASE = "https://api.vapi.ai";

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

// Assistant config assembled per call. The script (system prompt, first
// message, analysis plan) is patient-specific; model/voice come from env.
function buildAssistant(patient: Patient) {
  const script = buildScript(patient);
  const assistant: Record<string, unknown> = {
    name: `Swasth 365 — ${patient.callType}`,
    firstMessage: script.firstMessage,
    model: {
      provider: env("VAPI_MODEL_PROVIDER", "anthropic"),
      model: env("VAPI_MODEL", "claude-3-5-sonnet-20241022"),
      messages: [{ role: "system", content: script.systemPrompt }],
    },
    voice: {
      provider: env("VAPI_VOICE_PROVIDER", "11labs"),
      voiceId: env("VAPI_VOICE_ID", "sarah"),
    },
    transcriber: {
      provider: env("VAPI_TRANSCRIBER_PROVIDER", "deepgram"),
      model: env("VAPI_TRANSCRIBER_MODEL", "nova-2"),
      language: env("VAPI_TRANSCRIBER_LANGUAGE", "en"),
    },
    analysisPlan: {
      summaryPrompt: script.summaryPrompt,
      structuredDataPlan: {
        enabled: true,
        schema: script.structuredSchema,
      },
    },
  };

  // Only register the webhook when APP_URL is a public HTTPS URL Vapi can reach.
  // Locally (http://localhost), we skip it so the call still succeeds; set up a
  // tunnel (ngrok) and a public APP_URL to receive call summaries.
  const appUrl = process.env.APP_URL ?? "";
  if (appUrl.startsWith("https://")) {
    assistant.server = { url: `${appUrl}/api/webhooks/vapi` };
  }

  return assistant;
}

export type PlaceCallResult = { vapiCallId: string };

export async function placeCall(patient: Patient): Promise<PlaceCallResult> {
  const res = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("VAPI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId: env("VAPI_PHONE_NUMBER_ID"),
      customer: { number: patient.phone, name: patient.name },
      assistant: buildAssistant(patient),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Vapi call failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Vapi response missing call id");
  return { vapiCallId: data.id };
}

// ---- Webhook parsing -------------------------------------------------------

export type EndOfCallReport = {
  vapiCallId: string;
  status: "completed" | "failed";
  summary?: string;
  transcriptUrl?: string;
  recordingUrl?: string;
  structuredData?: unknown;
  endedAt?: Date;
};

// Vapi wraps events as { message: { type, call, ... } }. We only act on the
// end-of-call report; other event types return null and are acknowledged.
export function parseEndOfCallReport(body: unknown): EndOfCallReport | null {
  const message = (body as { message?: Record<string, unknown> })?.message;
  if (!message || message.type !== "end-of-call-report") return null;

  const call = message.call as { id?: string } | undefined;
  const vapiCallId = call?.id;
  if (!vapiCallId) return null;

  const analysis = message.analysis as
    | { summary?: string; structuredData?: unknown; successEvaluation?: unknown }
    | undefined;
  const artifact = message.artifact as
    | { recordingUrl?: string; transcript?: string; transcriptUrl?: string }
    | undefined;

  // endedReason tells us whether the call completed normally.
  const endedReason = String(message.endedReason ?? "");
  const failed = /error|failed|no-answer|busy|voicemail|blocked/i.test(endedReason);

  return {
    vapiCallId,
    status: failed ? "failed" : "completed",
    summary: analysis?.summary,
    transcriptUrl: artifact?.transcriptUrl,
    recordingUrl: artifact?.recordingUrl,
    structuredData: analysis?.structuredData,
    endedAt: new Date(),
  };
}
