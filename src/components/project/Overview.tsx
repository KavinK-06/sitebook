"use client";

import { Bell, ClipboardList, HardHat, IndianRupee, PackageSearch, Ruler } from "lucide-react";
import { useStore } from "@/lib/store";
import { getMetrics } from "@/lib/calc";
import type { Alert } from "@/lib/alerts";
import { daysBetween, fmtDate, inrShort, pct, todayISO } from "@/lib/format";
import { Card, DotProgress, IconBubble, KV, Ring, SectionHeader, cx } from "../ui";
import { AlertRow } from "../AlertRow";

export function Overview({ projectId, alerts, onTab }: { projectId: string; alerts: Alert[]; onTab: (t: string) => void }) {
  const { state } = useStore();
  const p = state.projects.find((x) => x.id === projectId)!;
  const m = getMetrics(state, projectId);
  const today = todayISO();
  const elapsed = Math.max(0, Math.min(1, daysBetween(p.startDate, today) / Math.max(1, daysBetween(p.startDate, p.endDate))));
  const profitDelta = m.forecastProfit - m.baseline.profit;
  const crit = alerts.filter((a) => a.severity === "critical").length;
  const warn = alerts.filter((a) => a.severity === "warning").length;

  // "North star" — every project answers these questions from one screen
  const north = [
    { q: "What did we agree to build?", a: `${inrShort(m.boqValue)} BOQ · ${m.items.length} items`, tab: "boq" },
    { q: "What did we think it would cost?", a: `${inrShort(m.estimatedCost)} estimate`, tab: "estimate" },
    { q: "What did we buy?", a: `${inrShort(m.purchasedValue)} received · ${inrShort(m.committedCost)} on order`, tab: "procurement" },
    { q: "What have we actually built?", a: `${pct(m.progress, 0)} of BOQ value`, tab: "measurements" },
    { q: "What have we spent?", a: `${inrShort(m.actualCost)} actual cost`, tab: "costs" },
    { q: "What have we billed?", a: `${inrShort(m.billedGross)} billed · ${inrShort(m.collected)} collected`, tab: "billing" },
    { q: "What will it cost in the end?", a: `${inrShort(m.forecastCost)} forecast`, tab: "forecast" },
    { q: "How much profit will we make?", a: `${inrShort(m.forecastProfit)} · ${pct(m.forecastMargin)}`, tab: "forecast" },
    { q: "What is going wrong?", a: `${crit} critical · ${warn} warnings`, tab: "costs" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Forecast hero — styled like the stacked blue card in the reference */}
        <div className="relative">
          <div className="absolute inset-x-6 -top-3 h-10 rounded-t-[24px] bg-blue-softer" />
          <div className="absolute inset-x-3 -top-1.5 h-10 rounded-t-[26px] bg-blue-soft" />
          <button onClick={() => onTab("forecast")} className="relative block w-full overflow-hidden rounded-[var(--radius-card)] bg-blue p-6 text-left text-white">
            <div className="flex items-center justify-between text-[15px]">
              <span className="font-semibold">Forecast profit</span>
              <span className="opacity-80">Margin {pct(m.forecastMargin)}</span>
            </div>
            <div className="tnum mt-8 text-center text-[52px] font-semibold leading-none tracking-[-0.03em]">{inrShort(m.forecastProfit)}</div>
            <div className="mt-3 text-center text-[14px] opacity-85">
              Original estimate {inrShort(m.baseline.profit)} · {pct(m.baseline.margin)}
            </div>
            <div className="mt-7 flex justify-center">
              <span className={cx("rounded-full px-3 py-1.5 text-[13px] font-medium", profitDelta < 0 ? "bg-white/15" : "bg-white/15")}>
                {profitDelta < 0 ? "▼" : "▲"} {inrShort(Math.abs(profitDelta))} vs original · see why →
              </span>
            </div>
          </button>
        </div>

        <Card>
          <div className="text-[14px] text-[#4a4a55]">Work completed</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tnum text-[44px] font-semibold leading-none tracking-[-0.03em]">{pct(m.progress, 0)}</span>
            <span className="text-[14px] text-muted">of BOQ value</span>
          </div>
          <div className="mt-6">
            <DotProgress value={m.progress} />
          </div>
          <div className="mt-3 flex justify-between text-[14px]">
            <span className="text-muted">Time elapsed {pct(elapsed, 0)}</span>
            <span className={cx("font-semibold", m.progress < elapsed - 0.08 && "text-orange")}>
              {m.progress < elapsed - 0.08 ? "Behind schedule" : "On track"}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-[13px]">
            <div>
              <div className="text-muted">Start</div>
              <div className="font-medium">{fmtDate(p.startDate)}</div>
            </div>
            <div>
              <div className="text-muted">Finish</div>
              <div className="font-medium">{fmtDate(p.endDate)}</div>
            </div>
            <div>
              <div className="text-muted">Items done</div>
              <div className="font-medium">
                {m.itemsCompleted} / {m.items.length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="mb-2 text-[13px] font-medium uppercase tracking-wide text-muted">Plan</div>
          <KV k="Contract value" v={inrShort(m.contract)} />
          <KV k="Estimated cost" v={inrShort(m.estimatedCost)} />
          <KV k="Estimated profit" v={inrShort(m.estimatedProfit)} strong />
        </Card>
        <Card>
          <div className="mb-2 text-[13px] font-medium uppercase tracking-wide text-muted">Cost</div>
          <KV k="Actual cost" v={inrShort(m.actualCost)} />
          <KV k="Committed (open POs)" v={inrShort(m.committedCost)} />
          <KV k="Cost to complete" v={inrShort(m.costToComplete)} />
          <KV k="Forecast final cost" v={<span className={m.forecastCost > m.estimatedCost ? "text-red" : ""}>{inrShort(m.forecastCost)}</span>} strong />
        </Card>
        <Card>
          <div className="mb-2 text-[13px] font-medium uppercase tracking-wide text-muted">Billing</div>
          <KV k="Billed (gross)" v={inrShort(m.billedGross)} />
          <KV k="Collected" v={inrShort(m.collected)} />
          <KV k="Outstanding" v={inrShort(m.outstanding)} strong />
          <KV k="Approved, not billed" v={<span className={m.unbilledValue > 0 ? "text-blue" : ""}>{inrShort(m.unbilledValue)}</span>} />
        </Card>
      </div>

      {/* Module tiles — "Your Stats" style */}
      <SectionHeader title="At a glance" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile icon={<Ring value={m.itemsCompleted / Math.max(1, m.items.length)} size={44} />} title="BOQ" sub={`${m.itemsCompleted}/${m.items.length} items done`} onClick={() => onTab("boq")} />
        <Tile icon={<IconBubble tone="blue"><PackageSearch size={20} /></IconBubble>} title="Procurement" sub={`${m.pendingRequests} pending · ${m.delayedPOs.length} delayed`} onClick={() => onTab("procurement")} alert={m.delayedPOs.length > 0} />
        <Tile icon={<IconBubble tone="soft"><HardHat size={20} /></IconBubble>} title="Labour" sub={`${m.workersToday} workers today`} onClick={() => onTab("site")} />
        <Tile icon={<IconBubble tone="gray"><Ruler size={20} /></IconBubble>} title="Measurements" sub={`${m.pendingMeasurements} awaiting approval`} onClick={() => onTab("measurements")} />
        <Tile icon={<IconBubble tone="soft"><IndianRupee size={20} /></IconBubble>} title="Billing" sub={`${inrShort(m.billedGross)} billed`} onClick={() => onTab("billing")} />
        <Tile icon={<IconBubble tone={crit ? "red" : "gray"}><Bell size={20} /></IconBubble>} title="Alerts" sub={`${crit} critical · ${warn} warnings`} onClick={() => onTab("costs")} alert={crit > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <SectionHeader title="What needs attention" />
          <Card className="divide-y divide-line !p-0">
            {alerts.length === 0 && <div className="p-5 text-[14px] text-muted">Nothing needs attention right now.</div>}
            {alerts.slice(0, 6).map((a) => (
              <AlertRow key={a.id} alert={a} showProject={false} />
            ))}
          </Card>
        </div>
        <div>
          <SectionHeader title="Project in 9 questions" />
          <Card className="divide-y divide-line !py-1">
            {north.map((n) => (
              <button key={n.q} onClick={() => onTab(n.tab)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
                <span className="text-[14px] text-[#4a4a55]">{n.q}</span>
                <span className="tnum shrink-0 text-right text-[14px] font-semibold">{n.a}</span>
              </button>
            ))}
          </Card>
          <div className="mt-3 flex items-center gap-2 px-1 text-[13px] text-muted">
            <ClipboardList size={14} /> Last site report: {m.lastReportDate ? fmtDate(m.lastReportDate) : "none yet"}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ icon, title, sub, onClick, alert }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void; alert?: boolean }) {
  return (
    <Card as="button" onClick={onClick} className="flex min-h-[150px] flex-col justify-between !p-4">
      <div className="relative w-fit">
        {icon}
        {alert && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red" />}
      </div>
      <div>
        <div className="text-[16px] font-semibold">{title}</div>
        <div className="text-[13px] text-muted">{sub}</div>
      </div>
    </Card>
  );
}
