"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import type { CallRecord } from "@/lib/types";

export default function CallHistoryPage() {
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
                    <Badge variant="secondary" className="font-normal">{c.callType}</Badge>
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
