"use client";

import { useStore } from "@/lib/store";
import { getMetrics, profitDrivers } from "@/lib/calc";
import { inr, inrShort, pct, signedShort } from "@/lib/format";
import { Card, KV, Table, Td, Th, cx } from "../ui";

export function ForecastTab({ projectId }: { projectId: string }) {
  const { state } = useStore();
  const m = getMetrics(state, projectId);
  const { original, current, drivers } = profitDrivers(state, projectId);
  const delta = current - original;
  const maxAbs = Math.max(1, ...drivers.map((d) => Math.abs(d.amount)));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-card">
          <div className="grid grid-cols-2">
            <div className="p-6">
              <div className="text-[14px] text-[#4a4a55]">Original profit</div>
              <div className="tnum mt-1 text-[30px] font-semibold tracking-[-0.02em]">{inrShort(original)}</div>
              <div className="text-[13px] text-muted">Margin {pct(m.baseline.margin)}</div>
            </div>
            <div className="bg-blue p-6 text-white">
              <div className="text-[14px] opacity-85">Current forecast</div>
              <div className="tnum mt-1 text-[30px] font-semibold tracking-[-0.02em]">{inrShort(current)}</div>
              <div className="text-[13px] opacity-85">Margin {pct(m.forecastMargin)}</div>
            </div>
          </div>
          <div className={cx("flex items-center justify-between px-6 py-4 text-[15px]", delta < 0 ? "bg-red-soft text-red" : "bg-green-soft text-green")}>
            <span>{delta < 0 ? "Expected profit has fallen" : "Expected profit has improved"}</span>
            <b className="tnum">{signedShort(delta)}</b>
          </div>
          <div className="p-6 pt-4">
            <div className="mb-2 text-[13px] font-medium uppercase tracking-wide text-muted">How the forecast is built</div>
            <KV k="Actual cost to date" v={inr(m.actualCost)} />
            <KV k="+ Estimated cost to complete" v={inr(m.costToComplete - m.contingency)} />
            <KV k="+ Contingency held" v={inr(m.contingency)} />
            <div className="my-1 border-t border-line" />
            <KV k="= Forecast final cost" v={inr(m.forecastCost)} strong />
            <KV k="Contract value" v={inr(m.contract)} />
            <KV k="= Forecast profit" v={inr(m.forecastProfit)} strong />
            <KV k="Forecast margin" v={pct(m.forecastMargin)} strong />
          </div>
        </div>

        <Card>
          <div className="text-[16px] font-semibold">Why the forecast changed</div>
          <div className="mb-4 text-[13px] text-muted">Rule-based drivers, largest impact first</div>
          {drivers.length === 0 && <div className="py-8 text-center text-[14px] text-muted">On track with the original estimate.</div>}
          <div className="space-y-3.5">
            {drivers.map((d) => (
              <div key={d.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium">{d.label}</span>
                  <span className={cx("tnum font-semibold", d.amount < 0 ? "text-red" : "text-green")}>{signedShort(d.amount)}</span>
                </div>
                <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-[#f1f1f4]">
                  <div className={cx("h-full rounded-full", d.amount < 0 ? "bg-red/80" : "bg-green")} style={{ width: `${(Math.abs(d.amount) / maxAbs) * 100}%` }} />
                </div>
                {d.detail && <div className="mt-1 text-[12px] text-muted">{d.detail}</div>}
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between border-t border-line pt-4 font-semibold">
            <span>Net change</span>
            <span className={cx("tnum", delta < 0 ? "text-red" : "text-green")}>{signedShort(delta)}</span>
          </div>
        </Card>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Cost head</Th>
            <Th right>Estimated</Th>
            <Th right>Actual</Th>
            <Th right>Cost to complete</Th>
            <Th right>Forecast</Th>
            <Th right>vs estimate</Th>
          </tr>
        </thead>
        <tbody>
          {m.heads
            .filter((h) => h.estimated || h.actual)
            .map((h) => (
              <tr key={h.head}>
                <Td className="font-medium">{h.head}</Td>
                <Td right>{inrShort(h.estimated)}</Td>
                <Td right>{inrShort(h.actual)}</Td>
                <Td right>{inrShort(h.etc)}</Td>
                <Td right className="font-semibold">
                  {inrShort(h.forecast)}
                </Td>
                <Td right className={cx("font-semibold", h.forecast > h.estimated + 1 ? "text-red" : "text-green")}>{signedShort(h.forecast - h.estimated)}</Td>
              </tr>
            ))}
          <tr>
            <Td className="font-medium">Contingency</Td>
            <Td right>{inrShort(m.contingency)}</Td>
            <Td right>—</Td>
            <Td right>{inrShort(m.contingency)}</Td>
            <Td right className="font-semibold">
              {inrShort(m.contingency)}
            </Td>
            <Td right>—</Td>
          </tr>
        </tbody>
      </Table>
      <p className="px-1 text-[13px] text-muted">
        Method (V1): remaining work is costed at the estimate. Where a cost head is already running over at today’s progress, the same overrun rate (capped at 30%) is applied to its remaining work. Open purchase orders are always included.
      </p>
    </div>
  );
}
