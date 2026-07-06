// Call repository — each call attempt and its outcome.
import { prisma, type Call, type CallType } from "@/modules/db";

export async function createCall(input: {
  patientId: string;
  callType: CallType;
  vapiCallId: string;
}): Promise<Call> {
  return prisma.call.create({
    data: {
      patientId: input.patientId,
      callType: input.callType,
      vapiCallId: input.vapiCallId,
      status: "calling",
    },
  });
}

// Called by the Vapi webhook when a call ends. Matched on vapiCallId.
export async function completeCallByVapiId(input: {
  vapiCallId: string;
  status: "completed" | "failed";
  summary?: string;
  transcriptUrl?: string;
  recordingUrl?: string;
  structuredData?: unknown;
  endedAt?: Date;
}): Promise<Call | null> {
  const call = await prisma.call.findUnique({ where: { vapiCallId: input.vapiCallId } });
  if (!call) return null;

  return prisma.call.update({
    where: { vapiCallId: input.vapiCallId },
    data: {
      status: input.status,
      summary: input.summary,
      transcriptUrl: input.transcriptUrl,
      recordingUrl: input.recordingUrl,
      structuredData: input.structuredData as never,
      endedAt: input.endedAt ?? new Date(),
    },
  });
}
