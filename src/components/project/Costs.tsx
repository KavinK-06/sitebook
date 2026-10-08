"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { can, useStore } from "@/lib/store";
import { getMetrics } from "@/lib/calc";
import { exportXlsx } from "@/lib/excel";
import { fmtDate, inr, inrShort, monthLabel, num, pct, signedShort, todayISO, uid } from "@/lib/format";
import { COST_HEADS, type Attachment, type CostHead } from "@/lib/types";
import { Button, Card, Field, FilePick, Input, NumInput, Select, Sheet, Stat, Table, Td, Th, cx } from "../ui";
import { CompareBars, LineChart } from "../charts";
import { VarPill } from "./Site";

export function CostsTab({ projectId }: { projectId: string }) {
  const { state, role } = useStore();
  const project = state.projects.find((p) => p.id === projectId)!;
  const m = getMetrics(state, projectId);
  const [adding, setAdding] = useState(false);
  const expenses = state.expenses.filter((e) => e.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date));
  const heads = m.heads.filter((h) => h.estimated > 0 || h.actual > 0);

  const doExport = () =>
    exportXlsx(`${project.code}-Cost-report.xlsx`, [
      {
        name: "By head",
        rows: m.heads.map((h) => ({ Head: h.head, Estimated: Math.round(h.estimated), "Expected at progress": Math.round(h.expected), Committed: Math.round(h.committed), Actual: Math.round(h.actual), Variance: Math.round(h.variance), "Variance %": +(h.variancePct * 100).toFixed(1), Forecast: Math.round(h.forecast) })),
      },
      { name: "Materials", rows: m.materials.map((x) => ({ Material: x.name, Unit: x.unit, Estimated: x.estQty, Expected: +x.expectedQty.toFixed(2), Received: x.receivedQty, Consumed: x.consumedQty, "Avg rate": Math.round(x.avgRate), "Est rate": Math.round(x.estRate) })) },
      { name: "Expenses", rows: expenses.map((e) => ({ Date: e.date, Head: e.head, Description: e.description, Vendor: e.vendor ?? "", Amount: e.amount })) },
    ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Contract value" value={inrShort(m.contract)} />
        <Stat label="Estimated cost" value={inrShort(m.estimatedCost)} />
        <Stat label="Actual cost" value={inrShort(m.actualCost)} sub={`${pct(m.progress, 0)} work done`} />
        <Stat label="Committed" value={inrShort(m.committedCost)} sub="Open purchase orders" />
        <Stat label="Forecast cost" value={<span className={m.forecastCost > m.estimatedCost ? "text-red" : ""}>{inrShort(m.forecastCost)}</span>} sub={signedShort(m.forecastCost - m.estimatedCost) + " vs estimate"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="mb-1 text-[16px] font-semibold">Estimated → Committed → Actual</div>
          <div className="mb-5 text-[13px] text-muted">The black tick shows what each head should have cost at today’s level of completion.</div>
          <CompareBars rows={heads.map((h) => ({ label: h.head, estimated: h.estimated, actual: h.actual, committed: h.committed, expected: h.expected }))} format={inrShort} />
        </Card>
        <Card>
          <div className="mb-1 text-[16px] font-semibold">Variance at current progress</div>
          <div className="mb-3 text-[13px] text-muted">Actual − expected cost for work done so far</div>
          <div className="divide-y divide-line">
            {heads.map((h) => {
              const tone = h.variancePct > 0.1 ? "bg-red" : h.variancePct > 0.03 ? "bg-orange" : h.variancePct < -0.02 ? "bg-green" : "bg-[#c9c9d0]";
              return (
                <div key={h.head} className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2.5 text-[15px]">
                    <span className={cx("h-2.5 w-2.5 rounded-full", tone)} />
                    {h.head}
                  </span>
                  <span className="text-right">
                    <span className={cx("tnum font-semibold", h.variance > 0 ? "text-red" : "text-green")}>{signedShort(h.variance)}</span>
                    <span className="tnum ml-2 text-[13px] text-muted">{h.expected > 0 ? `${h.variancePct >= 0 ? "+" : ""}${(h.variancePct * 100).toFixed(1)}%` : "—"}</span>
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between py-3 font-semibold">
              <span>Total</span>
              <span className={cx("tnum", m.actualCost > m.expectedCost ? "text-red" : "text-green")}>{signedShort(m.actualCost - m.expectedCost)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-[16px] font-semibold">Cumulative spend vs plan</div>
          <div className="mb-2 text-[13px] text-muted">Purchases, labour and expenses by month</div>
          <LineChart
            labels={m.monthly.map((x) => monthLabel(x.month))}
            series={[
              { name: "Actual spend", values: m.monthly.map((x) => x.actual), color: "#5b5bea", width: 2.2 },
              { name: "Planned (S-curve)", values: m.monthly.map((x) => x.planned), color: "#a9c7f5" },
            ]}
            format={inrShort}
          />
        </Card>
        <Card>
          <div className="mb-3 text-[16px] font-semibold">Material variance</div>
          <div className="divide-y divide-line">
            {m.materials.slice(0, 7).map((x) => (
              <div key={x.materialId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate font-medium">{x.name}</div>
                  <div className="tnum text-[12px] text-muted">
                    Expected {num(x.expectedQty, 1)} · used {num(x.consumedQty, 1)} {x.unit} · avg ₹{num(x.avgRate, 0)} vs est ₹{num(x.estRate, 0)}
                  </div>
                </div>
                <VarPill v={x.consumptionVar} has={x.expectedQty > 0} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between pt-2">
        <h3 className="px-1 text-[19px] font-semibold">Expenses & other costs</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="white" icon={<Download size={15} />} onClick={doExport}>
            Cost report
          </Button>
          {(can(role, "finance") || can(role, "editCommercial")) && (
            <Button size="sm" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
              Expense
            </Button>
          )}
        </div>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Head</Th>
            <Th>Description</Th>
            <Th>Vendor</Th>
            <Th right>Amount</Th>
          </tr>
        </thead>
        <tbody>
          {expenses.slice(0, 40).map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap">{fmtDate(e.date)}</Td>
              <Td>{e.head}</Td>
              <Td>
                {e.description} {e.imported && <span className="text-[12px] text-muted">· imported</span>}
              </Td>
              <Td className="text-muted">{e.vendor ?? "—"}</Td>
              <Td right className="font-semibold">
                {inr(e.amount)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="px-1 text-[13px] text-muted">
        Material cost comes from consumption × purchase rate; labour from daily reports. Expenses capture subcontract, equipment hire, overheads and other costs.
      </p>
      {adding && <ExpenseSheet projectId={projectId} onClose={() => setAdding(false)} />}
    </div>
  );
}

function ExpenseSheet({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { add } = useStore();
  const [head, setHead] = useState<CostHead>("Subcontract");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const save = () => {
    add("expenses", { id: uid("exp"), projectId, head, amount: Number(amount), date, description, vendor: vendor || undefined, attachment }, `Added ${head.toLowerCase()} expense ${inr(Number(amount))} – ${description}`);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Add expense" footer={<Button className="flex-1" size="lg" disabled={!amount || !description} onClick={save}>Save expense</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost head">
          <Select value={head} onChange={(e) => setHead(e.target.value as CostHead)}>
            {COST_HEADS.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Description" className="col-span-2">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Electrical subcontractor RA-3" />
        </Field>
        <Field label="Vendor / payee">
          <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </Field>
        <Field label="Amount (₹)">
          <NumInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Invoice" className="col-span-2">
          <FilePick value={attachment} onChange={setAttachment} />
        </Field>
      </div>
    </Sheet>
  );
}
