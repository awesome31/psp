"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PatientCall = { id: string; status: string; summary: string | null; endedAt: string | null };
type Patient = {
  id: string;
  name: string;
  phone: string;
  callType: string;
  scheduledAt: string;
  status: string;
  calls: PatientCall[];
};
type CallRecord = {
  id: string;
  callType: string;
  status: string;
  summary: string | null;
  recordingUrl: string | null;
  structuredData: Record<string, unknown> | null;
  createdAt: string;
  endedAt: string | null;
  patient: { name: string; phone: string };
};

const STATUS_CLASS: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  calling: "border-blue-200 bg-blue-50 text-blue-700 animate-pulse",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STATUS_CLASS[status])}>
      {status}
    </Badge>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Swasth 365 — AI Call Console</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Upload patients and let AI place follow-up &amp; reminder calls via Vapi.
        </p>
      </header>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="create">Create Calls</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <CreateCalls />
        </TabsContent>
        <TabsContent value="history">
          <CallHistory />
        </TabsContent>
      </Tabs>
    </main>
  );
}

/* ---------------- Section 1: Create Calls ---------------- */

function CreateCalls() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/patients");
    const data = await res.json();
    if (res.ok) setPatients(data.patients ?? []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a CSV file first.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/patients/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (data.skipped > 0) {
        toast.warning(`Uploaded ${data.created}, skipped ${data.skipped}`, {
          description: data.errors.map((x: { row: number; message: string }) => `Row ${x.row}: ${x.message}`).join("\n"),
        });
      } else {
        toast.success(`Uploaded ${data.created} patient(s).`);
      }
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function runScheduler() {
    setBusy(true);
    try {
      const secret = process.env.NEXT_PUBLIC_CRON_SECRET;
      const url = secret ? `/api/cron/run?secret=${encodeURIComponent(secret)}` : "/api/cron/run";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");
      toast.success(`Scheduler ran — placed ${data.placed}, failed ${data.failed}`, {
        description: `${data.claimed} patient(s) were due.`,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  const pending = patients.filter((p) => p.status === "pending" || p.status === "calling");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload patients</CardTitle>
          <CardDescription>
            CSV columns: name, phone, call_type (follow_up | reminder), scheduled_at, doctor_name, medicine_name,
            last_visit_date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={upload} className="flex flex-wrap items-center gap-3">
            <Input ref={fileRef} type="file" accept=".csv,text/csv" className="max-w-xs" />
            <Button type="submit" disabled={busy}>
              Upload
            </Button>
            <Button type="button" variant="outline" onClick={runScheduler} disabled={busy}>
              Run scheduler now
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Scheduled &amp; pending</CardTitle>
            <CardDescription>{pending.length} queued · auto-refreshes every 5s</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No patients queued. Upload a CSV to schedule calls.
            </p>
          ) : (
            <ul className="divide-y">
              {pending.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-sm text-muted-foreground">{p.phone}</span>
                    <Badge variant="secondary" className="font-normal">
                      {p.callType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.scheduledAt).toLocaleString("en-IN")}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Section 2: Call History ---------------- */

function CallHistory() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/calls");
    const data = await res.json();
    if (res.ok) setCalls(data.calls ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calls made</CardTitle>
        <CardDescription>{calls.length} call(s) · summaries appear once a call ends</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : calls.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No calls yet. Once the scheduler places calls, they appear here with summaries.
          </p>
        ) : (
          <ul className="divide-y">
            {calls.map((c) => (
              <li key={c.id} className="space-y-3 py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.patient.name}</span>
                    <span className="text-sm text-muted-foreground">{c.patient.phone}</span>
                    <Badge variant="secondary" className="font-normal">
                      {c.callType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString("en-IN")}</span>
                    <StatusBadge status={c.status} />
                  </div>
                </div>

                {c.summary && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
                    <span className="font-medium text-muted-foreground">Summary · </span>
                    {c.summary}
                  </div>
                )}

                {c.structuredData && Object.keys(c.structuredData).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(c.structuredData).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="font-normal">
                        <span className="text-muted-foreground">{k.replace(/_/g, " ")}:</span>&nbsp;{String(v)}
                      </Badge>
                    ))}
                  </div>
                )}

                {c.recordingUrl && <audio controls src={c.recordingUrl} className="h-9 w-full max-w-md" />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
