// POST /api/patients/upload — accepts a CSV file, validates, stores patients.
import { NextResponse } from "next/server";
import { parsePatientsCsv } from "@/modules/csv";
import { createPatients } from "@/modules/patients";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let csvText: string;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded under field 'file'." }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      // Allow raw CSV body too (handy for curl / scripts).
      csvText = await request.text();
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: "Empty CSV." }, { status: 400 });
    }

    const { rows, errors } = parsePatientsCsv(csvText);
    const scheduledAt = new Date();
    const dueNowRows = rows.map((row) => ({ ...row, scheduledAt }));
    const created = dueNowRows.length > 0 ? await createPatients(dueNowRows) : 0;

    return NextResponse.json({ created, skipped: errors.length, errors, scheduledAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
