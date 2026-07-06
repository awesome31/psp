// Scheduler — the orchestration the cron invokes.
// Finds patients whose scheduled time is due, claims them (lock), places the
// Vapi call, and records a call row. Webhooks later finalise each call.
import { claimDuePatients, markPatientFailed, markPatientStatus } from "@/modules/patients";
import { createCall } from "@/modules/calls";
import { placeCall } from "@/modules/vapi";

export type RunSummary = {
  claimed: number;
  placed: number;
  failed: number;
  details: { patientId: string; name: string; outcome: "placed" | "failed"; error?: string }[];
};

export async function runDueCalls(limit = 20): Promise<RunSummary> {
  const patients = await claimDuePatients(limit);
  const summary: RunSummary = { claimed: patients.length, placed: 0, failed: 0, details: [] };

  for (const patient of patients) {
    try {
      const { vapiCallId } = await placeCall(patient);
      await createCall({ patientId: patient.id, callType: patient.callType, vapiCallId });
      // Patient stays 'calling' until the webhook marks completed/failed.
      summary.placed += 1;
      summary.details.push({ patientId: patient.id, name: patient.name, outcome: "placed" });
    } catch (err) {
      // Release the lock as failed so it can be inspected / retried.
      await markPatientFailed(patient.id).catch(() => {
        // If even the status update fails, put it back to pending as a fallback.
        return markPatientStatus(patient.id, "pending");
      });
      const message = err instanceof Error ? err.message : String(err);
      summary.failed += 1;
      summary.details.push({ patientId: patient.id, name: patient.name, outcome: "failed", error: message });
    }
  }

  return summary;
}
