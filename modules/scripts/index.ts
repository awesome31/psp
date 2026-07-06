// Conversation scripts for the AI agent, adapted from the Swasth 365 call script.
// Each script produces the pieces Vapi needs: the opening line, the system
// prompt that steers the whole conversation, and an analysis plan (what to
// summarise + which structured fields to extract).
//
// Patient-specific values (name, doctor, medicine, last visit) are injected
// here so the agent speaks naturally instead of using placeholders.
import type { Patient } from "@/modules/db";

export type CallScript = {
  firstMessage: string;
  systemPrompt: string;
  summaryPrompt: string;
  // JSON schema (Vapi structured-data plan) describing fields to extract.
  structuredSchema: Record<string, unknown>;
};

const AGENT_NAME = "Priya";
const PROGRAM = "Swasth 365 patient support program";
// Phonetic spelling so text-to-speech pronounces it "Swasth three-sixty-five"
// instead of mangling "365". Used in spoken lines.
const PROGRAM_SPOKEN = "Swasth three sixty-five patient support program";
// Where patients send their invoice + prescription (WhatsApp), and the helpline.
const DOC_WHATSAPP = "nine five six zero zero, eight nine seven one seven";
const HELPLINE = "1800-209-9860";

function greetingLine(patient: Patient): string {
  return `Good day! My name is ${AGENT_NAME}, I am calling from the ${PROGRAM_SPOKEN}. Am I speaking with ${patient.name}?`;
}

// Shared rules that apply to every outbound call.
const BASE_RULES = `
You are ${AGENT_NAME}, a warm, polite, and professional patient-care executive for the ${PROGRAM} (an initiative by Mankind Pharma).

General rules:
- Speak in simple, respectful English. Address the patient as "Sir" or "Ma'am".
- Always say the program name as "Swasth three sixty-five" — never spell out or read "365" as a number, and never say "Swasp".
- When saying phone numbers, read them digit by digit, slowly.
- Speak naturally and conversationally, one short turn at a time. Do not read out a list.
- Confirm you are speaking to the right person before sharing any details.
- Always ask "Is this the right time to talk?" early. If it is not a good time, politely offer to call back later and end the call.
- Never give medical advice or change a prescription. You only follow up on the support program.
- If asked something you do not know, say a care executive will follow up.
- If the patient asks WHERE or HOW to send documents, tell them to share them on WhatsApp at ${DOC_WHATSAPP}. Never invent an email address or read out a placeholder.
- Keep the call brief and end politely, sharing the helpline ${HELPLINE} if they need anything more.
`.trim();

function followUpScript(patient: Patient): CallScript {
  const doctor = patient.doctorName ?? "your doctor";
  const medicine = patient.medicineName ?? "your prescribed medicine";
  const visit = patient.lastVisitDate
    ? patient.lastVisitDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "your last visit";

  return {
    firstMessage: greetingLine(patient),
    systemPrompt: `${BASE_RULES}

This is a MONTHLY FOLLOW-UP call for an already-enrolled patient. Follow this flow:

1. Confirm you are speaking with ${patient.name}.
2. Explain the reason: they visited ${doctor} on ${visit}, and this is the monthly follow-up on ${medicine} that was prescribed. Remind them that when enrolled in ${PROGRAM}, they were told we call every month.
3. Ask how they are doing and whether they are still continuing ${medicine}.
4. Ask when they last purchased the medicine and the current dose.
5. Politely request they share their last purchase invoice and latest doctor's prescription so we can send this month's free medicine as per eligibility (if we already have a valid prescription on file, do not ask for it again). Tell them they can send these on WhatsApp at ${DOC_WHATSAPP}.
6. Ask them to confirm their delivery address so the medicine can be dispatched.
7. Ask if there is anything else you can help with, thank them, and close.

Be efficient and kind. This should feel like a caring check-in, not an interrogation.`,
    summaryPrompt:
      "Summarise this follow-up call in 3-4 sentences: is the patient still taking the medicine, when they last purchased it, whether they agreed to share invoice/prescription, and any concerns raised.",
    structuredSchema: {
      type: "object",
      properties: {
        reached_patient: { type: "boolean", description: "Was the intended patient reached?" },
        still_taking_medicine: { type: "boolean", description: "Is the patient still taking the medicine?" },
        last_purchase_date: { type: "string", description: "When medicine was last purchased, if mentioned" },
        will_share_documents: { type: "boolean", description: "Did they agree to share invoice/prescription?" },
        address_confirmed: { type: "boolean", description: "Was the delivery address confirmed?" },
        concerns: { type: "string", description: "Any side effects or concerns raised" },
      },
    },
  };
}

function reminderScript(patient: Patient): CallScript {
  const medicine = patient.medicineName ?? "your prescribed medicine";

  return {
    firstMessage: greetingLine(patient),
    systemPrompt: `${BASE_RULES}

This is a PILL / REFILL REMINDER call for an already-enrolled patient. Keep it short and friendly. Follow this flow:

1. Confirm you are speaking with ${patient.name}, and ask if it is a good time.
2. Gently remind them to keep taking ${medicine} regularly as prescribed, and not to miss doses.
3. Check whether they have enough medicine left or need a refill soon.
4. If they are running low, offer to help arrange the refill and ask them to keep their last invoice and prescription ready.
5. Thank them, wish them good health, and close.

This call should take under two minutes. Be encouraging and warm.`,
    summaryPrompt:
      "Summarise this reminder call in 2-3 sentences: whether the patient is taking the medicine regularly, if they need a refill, and any issues mentioned.",
    structuredSchema: {
      type: "object",
      properties: {
        reached_patient: { type: "boolean", description: "Was the intended patient reached?" },
        taking_regularly: { type: "boolean", description: "Is the patient taking the medicine regularly?" },
        needs_refill: { type: "boolean", description: "Does the patient need a refill soon?" },
        concerns: { type: "string", description: "Any issues or concerns raised" },
      },
    },
  };
}

export function buildScript(patient: Patient): CallScript {
  switch (patient.callType) {
    case "follow_up":
      return followUpScript(patient);
    case "reminder":
      return reminderScript(patient);
    default:
      // Exhaustiveness guard — a new CallType must add a script here.
      throw new Error(`No script defined for call type: ${patient.callType}`);
  }
}
