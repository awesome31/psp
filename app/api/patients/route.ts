// GET /api/patients — list all patients with their latest call info.
import { NextResponse } from "next/server";
import { listPatients } from "@/modules/patients";

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
