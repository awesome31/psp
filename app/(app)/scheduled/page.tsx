"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Play, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import type { Patient } from "@/lib/types";

export default function ScheduledPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/patients");
    const data = await res.json();
    if (res.ok) setPatients(data.patients ?? []);
  }, []);

  useEffect(() => {
    const refresh = () => {
      setNow(Date.now());
      void load();
    };
    const timer = window.setTimeout(refresh, 0);
    const interval = window.setInterval(refresh, 5000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [load]);

  async function runScheduler() {
    setBusy(true);
    try {
      const secret = process.env.NEXT_PUBLIC_CRON_SECRET;
      const url = secret ? `/api/cron/run?secret=${encodeURIComponent(secret)}` : "/api/cron/run";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");
      if (data.claimed === 0) {
        toast.info("No calls were due.", {
          description: "Set scheduled_at to now or a past time, then run the scheduler again.",
        });
      } else if (data.failed > 0) {
        const firstError = data.details?.find((d: { error?: string }) => d.error)?.error;
        toast.warning(`Scheduler ran: placed ${data.placed}, failed ${data.failed}`, {
          description: firstError ?? `${data.claimed} patient(s) were due.`,
        });
      } else {
        toast.success(`Scheduler ran: placed ${data.placed}, failed ${data.failed}`, {
          description: `${data.claimed} patient(s) were due.`,
        });
      }
      setNow(Date.now());
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  const pending = patients.filter((p) => p.status === "pending" || p.status === "calling");
  const due = now === null ? [] : pending.filter((p) => new Date(p.scheduledAt).getTime() <= now);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Scheduled &amp; pending</CardTitle>
          <CardDescription>
            {pending.length} queued · {due.length} due now · auto-refreshes every 5s
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNow(Date.now());
              void load();
            }}
            disabled={busy}
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button size="sm" onClick={runScheduler} disabled={busy}>
            <Play className="size-4" /> Run due calls now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing queued. Add patients from the Create Calls page.
          </p>
        ) : (
          <ul className="divide-y">
            {pending.map((p) => {
              const isDue = now !== null && new Date(p.scheduledAt).getTime() <= now;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-sm text-muted-foreground">{p.phone}</span>
                    <Badge variant="secondary" className="font-normal">{p.callType}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {isDue ? "due · " : ""}
                      {new Date(p.scheduledAt).toLocaleString("en-IN")}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
