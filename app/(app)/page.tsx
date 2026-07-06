"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

const EMPTY = {
  name: "",
  phone: "",
  call_type: "follow_up",
  scheduled_at: "",
  doctor_name: "",
  medicine_name: "",
  last_visit_date: "",
};

export default function CreateCallsPage() {
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Default the schedule time to now after hydration so SSR markup stays stable.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setForm((f) => (f.scheduled_at ? f : { ...f, scheduled_at: nowLocal() }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add patient");
      toast.success(`${form.name} added to the queue.`, { description: "Track it under Scheduled." });
      setForm({ ...EMPTY, scheduled_at: nowLocal() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add patient");
    } finally {
      setBusy(false);
    }
  }

  async function uploadCsv(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a CSV file first.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/patients/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (data.skipped > 0) {
        toast.warning(`Uploaded ${data.created}, skipped ${data.skipped}`, {
          description: data.errors.map((x: { row: number; message: string }) => `Row ${x.row}: ${x.message}`).join("\n"),
        });
      } else {
        toast.success(`Uploaded ${data.created} patient(s).`, { description: "Track them under Scheduled." });
      }
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add one patient */}
      <Card>
        <CardHeader>
          <CardTitle>Add a patient</CardTitle>
          <CardDescription>Schedule a single AI call. It runs at the scheduled time.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addOne} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Rohit Tyagi" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="9821318912 or +919821318912"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Call type</Label>
              <Select value={form.call_type} onValueChange={(v) => set("call_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduled_at">Scheduled at</Label>
              <Input id="scheduled_at" type="datetime-local" value={form.scheduled_at} onChange={(e) => set("scheduled_at", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doctor_name">Doctor name</Label>
              <Input id="doctor_name" value={form.doctor_name} onChange={(e) => set("doctor_name", e.target.value)} placeholder="Dr XYZ" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="medicine_name">Medicine</Label>
              <Input id="medicine_name" value={form.medicine_name} onChange={(e) => set("medicine_name", e.target.value)} placeholder="Telma 40" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_visit_date">Last visit date</Label>
              <Input id="last_visit_date" type="date" value={form.last_visit_date} onChange={(e) => set("last_visit_date", e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                <Plus className="size-4" /> Add to queue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* CSV upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="size-4 text-muted-foreground" /> Or bulk upload (CSV)
          </CardTitle>
          <CardDescription>
            Columns: name, phone, call_type, scheduled_at, doctor_name, medicine_name, last_visit_date. Indian
            10-digit mobiles are accepted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={uploadCsv} className="flex flex-wrap items-center gap-3">
            <Input ref={fileRef} type="file" accept=".csv,text/csv" className="max-w-xs" />
            <Button type="submit" variant="secondary" disabled={busy}>
              Upload CSV
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
