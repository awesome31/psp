// GET  /api/patients — list all patients with their latest call info.
// POST /api/patients — add a single patient (from the "add one" form).
import { NextResponse } from "next/server";
import { listPatients, createPatients } from "@/modules/patients";
import { validatePatientRecord } from "@/modules/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const patients = await listPatients();
    return NextResponse.json({ patients });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { row, error } = validatePatientRecord(body);
    if (error || !row) {
      return NextResponse.json({ error: error ?? "Invalid patient" }, { status: 400 });
    }
    await createPatients([row]);
    return NextResponse.json({ created: 1 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
