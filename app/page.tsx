"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Call = { id: string; status: string; summary: string | null; endedAt: string | null };
type Patient = {
  id: string;
  name: string;
  phone: string;
  callType: string;
  scheduledAt: string;
  status: string;
  calls: Call[];
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  calling: "bg-blue-100 text-blue-800 animate-pulse",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/patients");
    const data = await res.json();
    if (res.ok) setPatients(data.patients ?? []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // poll so statuses update live
    return () => clearInterval(t);
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/patients/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const skipped =
        data.skipped > 0
          ? `, skipped ${data.skipped}: ` +
            data.errors.map((x: { row: number; message: string }) => `row ${x.row} (${x.message})`).join("; ")
          : "";
      setMessage(`Uploaded ${data.created} patient(s)${skipped}`);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function runScheduler() {
    setBusy(true);
    setMessage(null);
    try {
      const secret = process.env.NEXT_PUBLIC_CRON_SECRET;
      const url = secret ? `/api/cron/run?secret=${encodeURIComponent(secret)}` : "/api/cron/run";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");
      setMessage(`Scheduler ran — claimed ${data.claimed}, placed ${data.placed}, failed ${data.failed}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 font-sans">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Swasth 365 — AI Call Console</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a patient CSV, then let the scheduler place AI follow-up &amp; reminder calls via Vapi.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-gray-700">Upload patients (CSV)</h2>
        <form onSubmit={upload} className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-white"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={runScheduler}
            disabled={busy}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-800 disabled:opacity-50"
          >
            Run scheduler now
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-400">
          Columns: name, phone, call_type (follow_up | reminder), scheduled_at, doctor_name, medicine_name,
          last_visit_date
        </p>
        {message && <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">{message}</p>}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-medium text-gray-700">Patients ({patients.length})</h2>
          <span className="text-xs text-gray-400">auto-refreshes every 5s</span>
        </div>
        {patients.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">No patients yet. Upload a CSV to begin.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {patients.map((p) => (
              <li key={p.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-gray-900">{p.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{p.phone}</span>
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{p.callType}</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Scheduled: {new Date(p.scheduledAt).toLocaleString("en-IN")}
                </div>
                {p.calls[0]?.summary && (
                  <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <span className="font-medium text-gray-500">Last call summary: </span>
                    {p.calls[0].summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
