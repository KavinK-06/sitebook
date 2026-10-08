"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useStore, useVisibleProjects } from "@/lib/store";
import { getMetrics, projectHealth } from "@/lib/calc";
import { getAlerts } from "@/lib/alerts";
import { inrShort, monthLabel, pct, sum } from "@/lib/format";
import { Card, Headline, HealthDot, PageHeader, Pill, ProgressBar, RoundButton, SectionHeader, Stat, cx } from "../ui";
import { LineChart } from "../charts";
import { AlertRow } from "../AlertRow";

export function OwnerDashboard() {
  const { state, user, role } = useStore();
  const router = useRouter();
  const projects = useVisibleProjects();
  const active = projects.filter((p) => p.status === "Active" || p.status === "On hold");
  const rows = useMemo(() => active.map((p) => ({ p, m: getMetrics(state, p.id) })), [active, state]);

  const totals = {
    contract: sum(rows, (r) => r.m.contract),
    est: sum(rows, (r) => r.m.estimatedCost),
    forecast: sum(rows, (r) => r.m.forecastCost),
    profit: sum(rows, (r) => r.m.forecastProfit),
    baselineProfit: sum(rows, (r) => r.m.baseline.profit),
    outstanding: sum(rows, (r) => r.m.outstanding),
    unbilled: sum(rows, (r) => r.m.unbilledValue),
    actual: sum(rows, (r) => r.m.actualCost),
    workers: sum(rows, (r) => r.m.workersToday),
    stock: sum(rows, (r) => r.m.stockValue),
    billed: sum(rows, (r) => r.m.billedNet),
    collected: sum(rows, (r) => r.m.collected),
  };
  const ids = new Set(projects.map((p) => p.id));
  const alerts = getAlerts(state).filter((a) => ids.has(a.projectId));
  const top = alerts.filter((a) => a.severity !== "info").slice(0, 3);
  const critical = alerts.filter((a) => a.severity === "critical").length;

  // company-wide cumulative spend vs plan by month
  const series = useMemo(() => {
    const map = new Map<string, { planned: number; actual: number }>();
    for (const { m } of rows)
      for (const pt of m.monthly) {
        const k = pt.month.slice(0, 7);
        const cur = map.get(k) ?? { planned: 0, actual: 0 };
        cur.planned += pt.planned;
        cur.actual += pt.actual;
        map.set(k, cur);
      }
    // carry forward projects that started later/earlier
    const keys = [...map.keys()].sort().slice(-8);
    return { labels: keys.map((k) => monthLabel(k + "-01")), actual: keys.map((k) => map.get(k)!.actual), planned: keys.map((k) => map.get(k)!.planned) };
  }, [rows]);

  const profitDelta = totals.profit - totals.baselineProfit;
  const firstName = user?.name.split(" ")[0];

  return (
    <div>
      <PageHeader
        title={role === "owner" ? "Dashboard" : "My projects"}
        subtitle={`Good ${greeting()}, ${firstName}`}
        actions={
          <>
            {role === "owner" && <RoundButton kind="plus" label="New project" onClick={() => router.push("/projects?new=1")} />}
            <RoundButton kind="down" label="View alerts" href="/alerts" />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <Headline top={`${inrShort(totals.profit)} forecast profit`} bottom={`across ${active.length} active project${active.length === 1 ? "" : "s"}`} />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px]">
            <Pill tone={profitDelta < 0 ? "red" : "green"}>
              {profitDelta < 0 ? "▼" : "▲"} {inrShort(Math.abs(profitDelta))} vs original estimate
            </Pill>
            <span className="text-muted">Margin {pct(totals.contract ? totals.profit / totals.contract : 0)}</span>
          </div>

          {/* Attention banner — "the 3 things you need to act on today" */}
          <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] bg-card">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue to-blue-2 px-5 py-3.5 text-white">
              <span className="text-[15px]">
                <b>{top.length} things</b> need your attention today
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[13px]">🔥 {critical} critical</span>
            </div>
            <div className="divide-y divide-line">
              {top.length === 0 && <div className="p-5 text-[14px] text-muted">All clear — nothing needs action right now.</div>}
              {top.map((a) => (
                <AlertRow key={a.id} alert={a} compact />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Card className="!pb-3">
            <div className="text-[15px] text-[#4a4a55]">Total spend to date</div>
            <div className="tnum mt-1 text-[32px] font-semibold tracking-[-0.02em]">{inrShort(series.actual.at(-1) ?? 0)}</div>
            <div className="text-[13px] text-muted">
              {inrShort(totals.actual)} cost of work done · {inrShort(totals.stock)} material in stock
            </div>
            <div className="pt-3">
              <LineChart
                labels={series.labels}
                series={[
                  { name: "Actual spend (cumulative)", values: series.actual, color: "#5b5bea", width: 2.2 },
                  { name: "Planned", values: series.planned, color: "#a9c7f5", width: 2 },
                ]}
                format={inrShort}
                height={230}
              />
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Billed" value={inrShort(totals.billed)} trend="up" />
            <Stat label="Collected" value={inrShort(totals.collected)} trend="down" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Active projects" value={active.length} sub={`${totals.workers} workers today`} />
        <Stat label="Contract value" value={inrShort(totals.contract)} />
        <Stat label="Estimated cost" value={inrShort(totals.est)} />
        <Stat label="Forecast cost" value={inrShort(totals.forecast)} trend={totals.forecast > totals.est ? "up" : "down"} sub={totals.forecast > totals.est ? <span className="text-red">+{inrShort(totals.forecast - totals.est)} over</span> : "On budget"} />
        <Stat label="Forecast profit" value={inrShort(totals.profit)} />
        <Stat label="Outstanding" value={inrShort(totals.outstanding)} sub={<span>+{inrShort(totals.unbilled)} unbilled</span>} />
      </div>

      <SectionHeader title="Projects" href="/projects" />
      {/* desktop table */}
      <div className="hidden overflow-hidden rounded-[var(--radius-card)] bg-card md:block">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Project</th>
              <th className="w-[22%] px-5 py-3 font-medium">Progress</th>
              <th className="px-5 py-3 text-right font-medium">Contract</th>
              <th className="px-5 py-3 text-right font-medium">Forecast profit</th>
              <th className="px-5 py-3 text-right font-medium">Margin</th>
              <th className="px-5 py-3 text-center font-medium">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, m }) => {
              const h = projectHealth(m);
              return (
                <tr key={p.id} className="cursor-pointer border-t border-line hover:bg-bg/50" onClick={() => router.push(`/projects/${p.id}`)}>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-[13px] text-muted">
                      {p.code} · {p.type}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="mb-1.5 text-[13px] font-medium tnum">{pct(m.progress, 0)}</div>
                    <ProgressBar value={m.progress} height={6} />
                  </td>
                  <td className="tnum px-5 py-4 text-right">{inrShort(m.contract)}</td>
                  <td className="tnum px-5 py-4 text-right font-semibold">{inrShort(m.forecastProfit)}</td>
                  <td className="tnum px-5 py-4 text-right">
                    <span className={cx(m.forecastMargin < m.baseline.margin - 0.015 && "text-red")}>{pct(m.forecastMargin)}</span>
                    <div className="text-[12px] text-muted">was {pct(m.baseline.margin)}</div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <HealthDot health={h} />
                  </td>
                  <td className="pr-4 text-muted">
                    <ChevronRight size={18} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map(({ p, m }) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="block">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-semibold">{p.name}</div>
                  <div className="text-[13px] text-muted">{inrShort(m.contract)} contract</div>
                </div>
                <HealthDot health={projectHealth(m)} />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-[13px] text-muted">Forecast profit</div>
                  <div className="tnum text-[22px] font-semibold">{inrShort(m.forecastProfit)}</div>
                </div>
                <div className="text-right text-[13px]">
                  <span className={cx("font-semibold", m.forecastMargin < m.baseline.margin - 0.015 && "text-red")}>{pct(m.forecastMargin)}</span>
                  <span className="text-muted"> margin</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={m.progress} height={6} />
                <span className="tnum text-[13px] font-medium">{pct(m.progress, 0)}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}
