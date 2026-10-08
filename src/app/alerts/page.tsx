"use client";

import { useState } from "react";
import { useStore, useVisibleProjects } from "@/lib/store";
import { getAlerts, SEVERITY_LABEL, SEVERITY_ORDER, THRESHOLDS, type Severity } from "@/lib/alerts";
import { Card, Empty, PageHeader, Segmented, Select } from "@/components/ui";
import { AlertRow, SEV_STYLE } from "@/components/AlertRow";

export default function AlertsPage() {
  const { state, update } = useStore();
  const projects = useVisibleProjects();
  const [sev, setSev] = useState<"all" | Severity>("all");
  const [pid, setPid] = useState("");
  const ids = new Set(projects.map((p) => p.id));
  const all = getAlerts(state).filter((a) => ids.has(a.projectId) && (!pid || a.projectId === pid));
  const list = all.filter((a) => sev === "all" || a.severity === sev);
  const dismissed = state.dismissedAlerts.length;

  return (
    <div>
      <PageHeader title="Alerts" subtitle="What has gone wrong, or is likely to go wrong" />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {SEVERITY_ORDER.map((s) => (
          <Card key={s} as="button" onClick={() => setSev(sev === s ? "all" : s)} className={sev === s ? "ring-2 ring-ink" : ""}>
            <div className="flex items-center gap-2 text-[14px] text-[#4a4a55]">
              <span className={`h-2.5 w-2.5 rounded-full ${SEV_STYLE[s].dot}`} /> {SEVERITY_LABEL[s]}
            </div>
            <div className="tnum mt-1 text-[30px] font-semibold">{all.filter((a) => a.severity === s).length}</div>
          </Card>
        ))}
      </div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          value={sev}
          onChange={setSev}
          options={[{ value: "all" as const, label: "All" }, ...SEVERITY_ORDER.map((s) => ({ value: s, label: SEVERITY_LABEL[s] }))]}
        />
        <Select value={pid} onChange={(e) => setPid(e.target.value)} className="!h-11 md:w-72">
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>
      {list.length === 0 ? (
        <Empty title="Nothing here" hint="No alerts match this filter." />
      ) : (
        <Card className="divide-y divide-line !p-0">
          {list.map((a) => (
            <AlertRow key={a.id} alert={a} onDismiss={() => update((d) => void d.dismissedAlerts.push(a.id))} />
          ))}
        </Card>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-muted">
        <span>
          Rules: cost &gt; {THRESHOLDS.costOverrunWarn * 100}% over expected · consumption &gt; {THRESHOLDS.consumptionWarn * 100}% · margin drop &gt; {THRESHOLDS.marginDropWarn * 100} pts · no report for {THRESHOLDS.missingReportDays}+ days
        </span>
        {dismissed > 0 && (
          <button className="font-medium text-blue" onClick={() => update((d) => void (d.dismissedAlerts = []))}>
            Restore {dismissed} dismissed
          </button>
        )}
      </div>
    </div>
  );
}
