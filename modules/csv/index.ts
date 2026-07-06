// CSV parsing + validation.
// Turns raw uploaded CSV text into an array of validated patient rows.
// Invalid rows are collected and reported rather than silently dropped.
import Papa from "papaparse";
import { z } from "zod";

// One column decides which script runs. Keep in sync with the CallType enum.
const callTypeSchema = z.enum(["follow_up", "reminder"]);
const DEFAULT_SCHEDULE_OFFSET = "+05:30";

function normalizePhone(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  const compact = trimmed.replace(/[\s()-]/g, "");

  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
  if (/^0[6-9]\d{9}$/.test(compact)) return `+91${compact.slice(1)}`;

  return trimmed;
}

function normalizeScheduledAt(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const normalized = trimmed.replace(" ", "T");

  if (/(?:z|[+-]\d{2}:?\d{2})$/i.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return `${normalized}T00:00:00${DEFAULT_SCHEDULE_OFFSET}`;

  return `${normalized}${DEFAULT_SCHEDULE_OFFSET}`;
}

// Accepts full ISO timestamps and plain dates. Empty -> undefined.
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), {
    message: "invalid date",
  })
  .transform((v) => (v ? new Date(v) : undefined));

const rowSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  // Stored as E.164. For India uploads, accept a common 10-digit mobile too.
  phone: z.preprocess(
    normalizePhone,
    z.string().regex(/^\+[1-9]\d{7,14}$/, "phone must be E.164 or a 10-digit Indian mobile number"),
  ),
  call_type: callTypeSchema,
  scheduled_at: z.preprocess(
    normalizeScheduledAt,
    z
      .string()
      .trim()
      .refine((v) => !Number.isNaN(Date.parse(v)), { message: "invalid scheduled_at" })
      .transform((v) => new Date(v)),
  ),
  doctor_name: z.string().trim().optional(),
  medicine_name: z.string().trim().optional(),
  last_visit_date: optionalDate,
});

export type PatientRow = {
  name: string;
  phone: string;
  callType: "follow_up" | "reminder";
  scheduledAt: Date;
  doctorName?: string;
  medicineName?: string;
  lastVisitDate?: Date;
};

export type ParseResult = {
  rows: PatientRow[];
  errors: { row: number; message: string }[];
};

// Validate a single patient record (e.g. from the "add one" form). Keys match
// the CSV columns so the same rules apply everywhere.
export function validatePatientRecord(record: Record<string, unknown>): {
  row?: PatientRow;
  error?: string;
} {
  const result = rowSchema.safeParse(record);
  if (!result.success) {
    return {
      error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  const d = result.data;
  return {
    row: {
      name: d.name,
      phone: d.phone,
      callType: d.call_type,
      scheduledAt: d.scheduled_at,
      doctorName: d.doctor_name,
      medicineName: d.medicine_name,
      lastVisitDate: d.last_visit_date,
    },
  };
}

export function parsePatientsCsv(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows: PatientRow[] = [];
  const errors: { row: number; message: string }[] = [];

  parsed.data.forEach((raw, i) => {
    const result = rowSchema.safeParse(raw);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      // +2: 1 for the header line, 1 for 1-based row numbers.
      errors.push({ row: i + 2, message });
      return;
    }
    const d = result.data;
    rows.push({
      name: d.name,
      phone: d.phone,
      callType: d.call_type,
      scheduledAt: d.scheduled_at,
      doctorName: d.doctor_name,
      medicineName: d.medicine_name,
      lastVisitDate: d.last_visit_date,
    });
  });

  return { rows, errors };
}
