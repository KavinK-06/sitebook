"use client";

import Link from "next/link";
import { useStore, useVisibleProjects } from "@/lib/store";
import { getMetrics } from "@/lib/calc";
import { fmtDate, inrShort, sum } from "@/lib/format";
import { Card, Headline, PageHeader, Pill, SectionHeader, Stat } from "../ui";

export function FinanceHome() {
  const { state } = useStore();
  const projects = useVisibleProjects().filter((p) => p.status !== "Planning");
  const rows = projects.map((p) => ({ p, m: getMetrics(state, p.id) }));
  const billed = sum(rows, (r) => r.m.billedNet);
  const collected = sum(rows, (r) => r.m.collected);
  const outstanding = sum(rows, (r) => r.m.outstanding);
  const unbilled = sum(rows, (r) => r.m.unbilledValue);
  const overdue = rows.flatMap((r) => r.m.overdueBills.map((o) => ({ ...o, p: r.p })));
  const pids = new Set(projects.map((p) => p.id));
  const payments = state.payments.filter((p) => pids.has(p.projectId)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div>
      <PageHeader title="Billing & collections" />
      <Headline top={`${inrShort(outstanding)} outstanding`} bottom={`${inrShort(unbilled)} approved work not yet billed`} />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Billed (net)" value={inrShort(billed)} trend="up" />
        <Stat label="Collected" value={inrShort(collected)} trend="down" />
        <Stat label="Outstanding" value={inrShort(outstanding)} />
        <Stat label="Unbilled work" value={inrShort(unbilled)} />
      </div>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <div>
          <SectionHeader title="Overdue client payments" />
          <div className="space-y-2">
            {overdue.length === 0 && <Card className="text-[14px] text-muted">No overdue bills.</Card>}
            {overdue.map((o) => (
              <Link key={o.bill.id} href={`/projects/${o.p.id}?tab=billing`} className="block">
                <Card className="flex items-center justify-between gap-3 !p-4">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{o.p.name}</div>
                    <div className="text-[13px] text-muted">
                      {o.bill.no} · due {fmtDate(o.bill.dueDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tnum font-semibold">{inrShort(o.outstanding)}</div>
                    <Pill tone={o.daysOverdue > 30 ? "red" : "orange"}>{o.daysOverdue} days late</Pill>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <SectionHeader title="Ready to bill" />
          <div className="space-y-2">
            {rows
              .filter((r) => r.m.unbilledValue > 0)
              .map((r) => (
                <Link key={r.p.id} href={`/projects/${r.p.id}?tab=billing`} className="block">
                  <Card className="flex items-center justify-between !p-4">
                    <span className="truncate font-semibold">{r.p.name}</span>
                    <span className="tnum font-semibold text-blue">{inrShort(r.m.unbilledValue)}</span>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Recent collections" />
          <Card className="divide-y divide-line !py-1">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{state.projects.find((x) => x.id === p.projectId)?.name}</div>
                  <div className="text-[13px] text-muted">
                    {fmtDate(p.date)} · {p.mode} {p.ref}
                  </div>
                </div>
                <div className="tnum font-semibold text-green">+{inrShort(p.amount)}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
