"use client";

import { useState } from "react";
import { ChevronDown, CloudSun, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { getMetrics } from "@/lib/calc";
import { addDays, fmtDay, inr, inrShort, num, todayISO } from "@/lib/format";
import { Button, Card, Empty, Pill, Segmented, Stat, Table, Td, Th, cx } from "../ui";
import { useShell } from "../AppShell";

export function SiteTab({ projectId }: { projectId: string }) {
  const { state } = useStore();
  const { openAdd } = useShell();
  const [view, setView] = useState<"reports" | "labour" | "materials">("reports");
  const m = getMetrics(state, projectId);
  const today = todayISO();
  const reports = state.reports.filter((r) => r.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const labour = state.labour.filter((l) => l.projectId === projectId);
  const last14 = labour.filter((l) => l.date > addDays(today, -14));

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Workers today" value={m.workersToday} sub={inr(m.labourCostToday) + " labour"} />
        <Stat label="Reports (14 days)" value={reports.filter((r) => r.date > addDays(today, -14)).length} sub={m.lastReportDate ? `Last ${fmtDay(m.lastReportDate)}` : "None yet"} />
        <Stat label="Labour (14 days)" value={inrShort(last14.reduce((a, l) => a + l.count * l.wage, 0))} sub={`${Math.round(last14.reduce((a, l) => a + l.count, 0) / 14)} avg workers/day`} />
        <Stat label="Material in stock" value={inrShort(m.stockValue)} sub="Received − consumed" />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "reports", label: "Daily reports" },
            { value: "labour", label: "Labour" },
            { value: "materials", label: "Material consumption" },
          ]}
        />
        <Button size="sm" icon={<Plus size={16} />} onClick={() => openAdd("report", projectId)} className="shrink-0">
          Daily report
        </Button>
      </div>

      {view === "reports" && (
        <div className="space-y-2">
          {reports.length === 0 && <Empty title="No daily reports yet" hint="Site engineers submit one each day from the + button." />}
          {reports.slice(0, 30).map((r) => (
            <ReportCard key={r.id} reportId={r.id} />
          ))}
        </div>
      )}

      {view === "labour" && <LabourView projectId={projectId} />}

      {view === "materials" && (
        <div className="space-y-4">
          <Table>
            <thead>
              <tr>
                <Th>Material</Th>
                <Th right>BOQ allowance</Th>
                <Th right>Expected so far</Th>
                <Th right>Received</Th>
                <Th right>Consumed</Th>
                <Th right>Stock</Th>
                <Th right>Variance</Th>
              </tr>
            </thead>
            <tbody>
              {m.materials.map((x) => (
                <tr key={x.materialId}>
                  <Td>
                    <div className="font-medium">{x.name}</div>
                    <div className="text-[12px] text-muted">{x.unit}</div>
                  </Td>
                  <Td right>{num(x.estQty, 0)}</Td>
                  <Td right>{num(x.expectedQty, 1)}</Td>
                  <Td right>{num(x.receivedQty, 1)}</Td>
                  <Td right className="font-semibold">
                    {num(x.consumedQty, 1)}
                  </Td>
                  <Td right className={cx(x.stock < 0 && "text-red")}>{num(x.stock, 1)}</Td>
                  <Td right>
                    <VarPill v={x.consumptionVar} has={x.expectedQty > 0} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div>
            <div className="mb-2 px-1 text-[15px] font-semibold">By BOQ item</div>
            <Table>
              <thead>
                <tr>
                  <Th>BOQ item</Th>
                  <Th>Material</Th>
                  <Th right>Estimated</Th>
                  <Th right>Expected at progress</Th>
                  <Th right>Used</Th>
                  <Th right>Variance</Th>
                </tr>
              </thead>
              <tbody>
                {m.itemMaterialVar
                  .filter((v) => v.usedQty > 0)
                  .sort((a, b) => b.variancePct - a.variancePct)
                  .map((v) => {
                    const it = state.boqItems.find((b) => b.id === v.boqItemId);
                    const mat = state.materials.find((x) => x.id === v.materialId);
                    return (
                      <tr key={v.boqItemId + v.materialId}>
                        <Td>
                          {it?.itemNo} {it?.category}
                        </Td>
                        <Td>{mat?.name}</Td>
                        <Td right>
                          {num(v.estQty, 1)} {mat?.unit}
                        </Td>
                        <Td right>{num(v.expectedQty, 1)}</Td>
                        <Td right className="font-semibold">
                          {num(v.usedQty, 1)}
                        </Td>
                        <Td right>
                          <VarPill v={v.variancePct} has />
                        </Td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

export function VarPill({ v, has }: { v: number; has: boolean }) {
  if (!has) return <span className="text-muted">—</span>;
  const tone = v > 0.1 ? "red" : v > 0.05 ? "orange" : v < -0.05 ? "green" : "gray";
  return (
    <Pill tone={tone}>
      {v >= 0 ? "+" : ""}
      {(v * 100).toFixed(1)}%
    </Pill>
  );
}

function ReportCard({ reportId }: { reportId: string }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const r = state.reports.find((x) => x.id === reportId)!;
  const lab = state.labour.filter((l) => l.reportId === r.id);
  const cons = state.consumption.filter((c) => c.reportId === r.id);
  const workers = lab.reduce((a, l) => a + l.count, 0);
  const cost = lab.reduce((a, l) => a + l.count * l.wage, 0);
  const by = state.users.find((u) => u.id === r.createdBy)?.name;
  return (
    <Card className="!p-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="w-16 shrink-0 text-center">
          <div className="text-[22px] font-semibold leading-none">{new Date(r.date + "T00:00").getDate()}</div>
          <div className="text-[12px] text-muted">{new Date(r.date + "T00:00").toLocaleString("en-IN", { month: "short" })}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {workers} workers · {r.work.length} work item{r.work.length === 1 ? "" : "s"} · {cons.length} materials
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-muted">
            <CloudSun size={14} /> {r.weather ?? "—"} · by {by} {r.issues && <Pill tone="orange" className="ml-1">Issue</Pill>}
          </div>
        </div>
        <div className="tnum text-right text-[14px] font-semibold">{inr(cost)}</div>
        <ChevronDown size={18} className={cx("shrink-0 text-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-line p-4 text-[14px] md:grid-cols-3">
          <div>
            <div className="mb-1 text-[12px] font-medium uppercase text-muted">Labour</div>
            {lab.map((l) => (
              <div key={l.id} className="tnum flex justify-between">
                <span>
                  {l.trade} {l.count} × {inr(l.wage)}
                </span>
                <span>{inr(l.count * l.wage)}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-1 text-[12px] font-medium uppercase text-muted">Work done</div>
            {r.work.map((w, i) => {
              const it = state.boqItems.find((b) => b.id === w.boqItemId);
              return (
                <div key={i} className="tnum flex justify-between gap-2">
                  <span className="truncate">
                    {it?.itemNo} {it?.category}
                  </span>
                  <span>
                    {num(w.qty)} {it?.unit}
                  </span>
                </div>
              );
            })}
          </div>
          <div>
            <div className="mb-1 text-[12px] font-medium uppercase text-muted">Material used</div>
            {cons.map((c) => {
              const mat = state.materials.find((x) => x.id === c.materialId);
              return (
                <div key={c.id} className="tnum flex justify-between gap-2">
                  <span className="truncate">{mat?.name}</span>
                  <span>
                    {num(c.qty)} {mat?.unit}
                  </span>
                </div>
              );
            })}
            {r.equipment.map((e, i) => (
              <div key={i} className="tnum mt-1 flex justify-between text-muted">
                <span>{e.name}</span>
                <span>{inr(e.cost)}</span>
              </div>
            ))}
          </div>
          {(r.issues || r.delays) && (
            <div className="rounded-2xl bg-orange-soft p-3 text-[#b5600d] md:col-span-3">
              {r.issues && <div>Issue: {r.issues}</div>}
              {r.delays && <div>Delay: {r.delays}</div>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function LabourView({ projectId }: { projectId: string }) {
  const { state } = useStore();
  const today = todayISO();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -13 + i));
  const labour = state.labour.filter((l) => l.projectId === projectId && l.date >= days[0]);
  const trades = [...new Set(labour.map((l) => l.trade))];
  const imported = state.expenses.filter((e) => e.projectId === projectId && e.head === "Labour").reduce((a, e) => a + e.amount, 0);
  return (
    <div className="space-y-3">
      <Table>
        <thead>
          <tr>
            <Th>Trade</Th>
            {days.map((d) => (
              <Th key={d} right className="!px-2">
                {new Date(d + "T00:00").getDate()}
              </Th>
            ))}
            <Th right>Cost</Th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t}>
              <Td className="whitespace-nowrap font-medium">{t}</Td>
              {days.map((d) => {
                const c = labour.filter((l) => l.trade === t && l.date === d).reduce((a, l) => a + l.count, 0);
                return (
                  <Td key={d} right className={cx("!px-2", !c && "text-muted/50")}>
                    {c || "·"}
                  </Td>
                );
              })}
              <Td right className="font-semibold">
                {inrShort(labour.filter((l) => l.trade === t).reduce((a, l) => a + l.count * l.wage, 0))}
              </Td>
            </tr>
          ))}
          <tr>
            <Td className="font-semibold">Total</Td>
            {days.map((d) => (
              <Td key={d} right className="!px-2 font-semibold">
                {labour.filter((l) => l.date === d).reduce((a, l) => a + l.count, 0) || ""}
              </Td>
            ))}
            <Td right className="font-semibold">
              {inrShort(labour.reduce((a, l) => a + l.count * l.wage, 0))}
            </Td>
          </tr>
        </tbody>
      </Table>
      <p className="px-1 text-[13px] text-muted">Earlier labour costs imported from muster rolls: {inrShort(imported)}.</p>
    </div>
  );
}
