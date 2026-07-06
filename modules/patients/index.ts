// Patient repository — all DB access for patients lives here.
import { prisma, type Patient } from "@/modules/db";
import type { PatientRow } from "@/modules/csv";

export async function createPatients(rows: PatientRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const result = await prisma.patient.createMany({
    data: rows.map((r) => ({
      name: r.name,
      phone: r.phone,
      callType: r.callType,
      scheduledAt: r.scheduledAt,
      doctorName: r.doctorName,
      medicineName: r.medicineName,
      lastVisitDate: r.lastVisitDate,
    })),
  });
  return result.count;
}

export async function listPatients(): Promise<
  (Patient & { calls: { id: string; status: string; summary: string | null; endedAt: Date | null }[] })[]
> {
  return prisma.patient.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      calls: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, summary: true, endedAt: true },
      },
    },
  });
}

// Atomically claim patients that are due, flipping pending -> calling so an
// overlapping cron run can never pick up the same patient twice.
export async function claimDuePatients(limit = 20): Promise<Patient[]> {
  const now = new Date();
  const due = await prisma.patient.findMany({
    where: { status: "pending", scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  const claimed: Patient[] = [];
  for (const p of due) {
    // Conditional update: only claim if it's still pending.
    const res = await prisma.patient.updateMany({
      where: { id: p.id, status: "pending" },
      data: { status: "calling" },
    });
    if (res.count === 1) claimed.push({ ...p, status: "calling" });
  }
  return claimed;
}

export async function markPatientStatus(
  id: string,
  status: "pending" | "calling" | "completed" | "failed",
): Promise<void> {
  await prisma.patient.update({ where: { id }, data: { status } });
}

export async function markPatientFailed(id: string): Promise<void> {
  await prisma.patient.update({
    where: { id },
    data: { status: "failed", retryCount: { increment: 1 } },
  });
}
