"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { can, useStore } from "@/lib/store";
import { getMetrics } from "@/lib/calc";
import { exportXlsx } from "@/lib/excel";
import { fmtDate, inr, inrShort, num, pct, todayISO, uid } from "@/lib/format";
import { ESTIMATE_HEADS, type EstimateHead, type EstimateItem } from "@/lib/types";
import { Button, Card, Field, Input, KV, NumInput, Pill, Select, Sheet, Table, Td, Th, cx } from "../ui";

export function EstimateTab({ projectId }: { projectId: string }) {
  const { state, role, user, update, remove } = useStore();
  const project = state.projects.find((p) => p.id === projectId)!;
  const m = getMetrics(state, projectId);
  const items = state.estimateItems.filter((e) => e.projectId === projectId);
  const editable = can(role, "editCommercial");
  const [open, setOpen] = useState<Record<string, boolean>>({ Material: true });
  const [editing, setEditing] = useState<EstimateItem | { head: EstimateHead } | null>(null);
  const byHead = (h: EstimateHead) => items.filter((e) => e.head === h);
  const headTotal = (h: EstimateHead) => byHead(h).reduce((a, e) => a + e.amount, 0);

  const approve = () =>
    update((s) => {
      const p = s.projects.find((x) => x.id === projectId)!;
      p.baseline = { cost: m.estimatedCost, profit: m.contract - m.estimatedCost, margin: (m.contract - m.estimatedCost) / m.contract, date: todayISO() };
      if (p.status === "Planning") p.status = "Active";
      p.boqLocked = true;
      s.audit.unshift({ id: uid("aud"), at: new Date().toISOString(), userId: user!.id, entity: "Estimate", entityId: projectId, projectId, action: "updated", summary: `Approved estimate baseline: cost ${inrShort(m.estimatedCost)}, margin ${pct(p.baseline.margin)}` });
    });

  const doExport = () =>
    exportXlsx(`${project.code}-Estimate.xlsx`, [
      { name: "Summary", rows: [...ESTIMATE_HEADS.map((h) => ({ Head: h, Amount: headTotal(h) })), { Head: "Estimated cost", Amount: m.estimatedCost }, { Head: "Contract value", Amount: m.contract }, { Head: "Target profit", Amount: m.estimatedProfit }] },
      {
        name: "Items",
        rows: items.map((e) => ({ Head: e.head, Item: e.name, "BOQ item": state.boqItems.find((b) => b.id === e.boqItemId)?.itemNo ?? "", Qty: e.qty ?? "", Unit: e.unit ?? "", Rate: e.rate ?? "", Amount: e.amount })),
      },
    ]);

  const changedSinceBaseline = project.baseline && Math.abs(project.baseline.cost - m.estimatedCost) > 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <div className="flex items-start justify-between">
            <div className="text-[14px] text-[#4a4a55]">Estimate summary</div>
            {project.baseline ? (
              <Pill tone="green">
                <CheckCircle2 size={12} className="mr-1" /> Baseline {fmtDate(project.baseline.date)}
              </Pill>
            ) : (
              <Pill tone="orange">Not approved</Pill>
            )}
          </div>
          <div className="mt-3">
            <KV k="BOQ / contract value" v={inr(m.contract)} strong />
            <div className="my-2 border-t border-line" />
            {ESTIMATE_HEADS.map((h) => (
              <KV key={h} k={h} v={inr(headTotal(h))} />
            ))}
            <div className="my-2 border-t border-line" />
            <KV k="Estimated cost" v={inr(m.estimatedCost)} strong />
            <KV k="Target profit" v={<span className="text-green">{inr(m.estimatedProfit)}</span>} strong />
            <KV k="Target margin" v={pct(m.estimatedMargin)} strong />
          </div>
          {changedSinceBaseline && (
            <div className="mt-3 rounded-2xl bg-orange-soft p-3 text-[13px] text-[#b5600d]">
              Estimate changed since baseline ({inrShort(project.baseline!.cost)} → {inrShort(m.estimatedCost)}). Forecast still compares against the approved baseline.
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="white" icon={<Download size={15} />} onClick={doExport}>
              Export
            </Button>
            {editable && (
              <Button size="sm" onClick={approve} disabled={!items.length}>
                {project.baseline ? "Re-approve baseline" : "Approve baseline & start project"}
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-1 text-[14px] text-[#4a4a55]">BOQ rate vs estimated cost</div>
          <div className="mb-3 text-[13px] text-muted">Estimate items linked to BOQ items — the basis for cost variance later.</div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 text-right font-medium">BOQ rate</th>
                  <th className="py-2 text-right font-medium">Est. cost/unit</th>
                  <th className="py-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {m.items.map((p) => {
                  const margin = p.item.rate > 0 ? 1 - p.estUnitCost / p.item.rate : 0;
                  return (
                    <tr key={p.item.id} className="border-t border-line">
                      <td className="py-2.5">
                        <div className="font-medium">
                          {p.item.itemNo} {p.item.category}
                        </div>
                        <div className="text-muted">
                          {num(p.item.qty)} {p.item.unit} · est. {inrShort(p.estCost)}
                        </div>
                      </td>
                      <td className="tnum py-2.5 text-right">{inr(p.item.rate)}</td>
                      <td className="tnum py-2.5 text-right">{p.estCost ? inr(p.estUnitCost) : <span className="text-orange">not estimated</span>}</td>
                      <td className={cx("tnum py-2.5 text-right font-semibold", margin < 0.08 ? "text-red" : margin < 0.14 ? "text-orange" : "text-green")}>{p.estCost ? pct(margin, 0) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {ESTIMATE_HEADS.map((h) => {
        const list = byHead(h);
        const isOpen = open[h];
        return (
          <div key={h} className="overflow-hidden rounded-[var(--radius-card)] bg-card">
            <button onClick={() => setOpen((o) => ({ ...o, [h]: !o[h] }))} className="flex w-full items-center justify-between px-5 py-4">
              <span className="flex items-center gap-2 text-[16px] font-semibold">
                <ChevronDown size={18} className={cx("transition", !isOpen && "-rotate-90")} />
                {h}
                <span className="text-[13px] font-normal text-muted">{list.length} lines</span>
              </span>
              <span className="tnum text-[16px] font-semibold">{inr(headTotal(h))}</span>
            </button>
            {isOpen && (
              <div className="border-t border-line">
                <Table className="!rounded-none">
                  <thead>
                    <tr>
                      <Th>Item</Th>
                      <Th>BOQ link</Th>
                      <Th right>Qty</Th>
                      <Th right>Rate</Th>
                      <Th right>Amount</Th>
                      {editable && <Th />}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((e) => (
                      <tr key={e.id}>
                        <Td>{e.name}</Td>
                        <Td className="text-muted">{state.boqItems.find((b) => b.id === e.boqItemId)?.itemNo ?? "—"}</Td>
                        <Td right>{e.qty !== undefined ? `${num(e.qty)} ${e.unit ?? ""}` : "—"}</Td>
                        <Td right>{e.rate !== undefined ? inr(e.rate, e.rate < 100 ? 2 : 0) : "—"}</Td>
                        <Td right className="font-semibold">
                          {inr(e.amount)}
                        </Td>
                        {editable && (
                          <Td className="whitespace-nowrap text-right">
                            <button aria-label="Edit" onClick={() => setEditing(e)} className="rounded-full p-2 text-muted hover:bg-bg hover:text-ink">
                              <Pencil size={15} />
                            </button>
                            <button aria-label="Delete" onClick={() => remove("estimateItems", e.id, `Deleted estimate line ${e.name}`)} className="rounded-full p-2 text-muted hover:bg-bg hover:text-red">
                              <Trash2 size={15} />
                            </button>
                          </Td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {editable && (
                  <button onClick={() => setEditing({ head: h })} className="m-3 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-blue hover:bg-blue-softer">
                    <Plus size={15} /> Add {h.toLowerCase()} line
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {editing && <EstimateItemSheet projectId={projectId} init={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EstimateItemSheet({ projectId, init, onClose }: { projectId: string; init: EstimateItem | { head: EstimateHead }; onClose: () => void }) {
  const { state, add, patch } = useStore();
  const existing = "id" in init ? init : undefined;
  const boq = state.boqItems.filter((b) => b.projectId === projectId);
  const [f, setF] = useState({
    head: init.head,
    name: existing?.name ?? "",
    boqItemId: existing?.boqItemId ?? "",
    materialId: existing?.materialId ?? "",
    qty: (existing?.qty ?? "") as number | "",
    unit: existing?.unit ?? "",
    rate: (existing?.rate ?? "") as number | "",
    lump: (existing && existing.qty === undefined ? existing.amount : "") as number | "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const usesQty = f.qty !== "" || f.rate !== "";
  const amount = usesQty ? Number(f.qty || 0) * Number(f.rate || 0) : Number(f.lump || 0);
  const save = () => {
    const data: Omit<EstimateItem, "id" | "projectId"> = {
      head: f.head,
      name: f.name,
      boqItemId: f.boqItemId || undefined,
      materialId: f.materialId || undefined,
      qty: usesQty ? Number(f.qty) : undefined,
      unit: usesQty ? f.unit : undefined,
      rate: usesQty ? Number(f.rate) : undefined,
      amount: Math.round(amount),
    };
    if (existing) patch("estimateItems", existing.id, data, `Updated estimate line ${f.name}`);
    else add("estimateItems", { ...data, id: uid("est"), projectId }, `Added estimate line ${f.name} (${inrShort(amount)})`);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={existing ? "Edit estimate line" : `Add ${f.head.toLowerCase()} line`} footer={<Button className="flex-1" size="lg" disabled={!f.name || !amount} onClick={save}>Save · {inr(amount)}</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost head">
          <Select value={f.head} onChange={(e) => set("head", e.target.value as EstimateHead)}>
            {ESTIMATE_HEADS.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </Select>
        </Field>
        {f.head === "Material" ? (
          <Field label="Material">
            <Select
              value={f.materialId}
              onChange={(e) => {
                const mat = state.materials.find((x) => x.id === e.target.value);
                setF((x) => ({ ...x, materialId: e.target.value, name: mat?.name ?? x.name, unit: mat?.unit ?? x.unit, rate: x.rate === "" ? (mat?.rate ?? "") : x.rate }));
              }}
            >
              <option value="">Select…</option>
              {state.materials.map((mm) => (
                <option key={mm.id} value={mm.id}>
                  {mm.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div />
        )}
        <Field label="Description" className="col-span-2">
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Mason labour – RCC" />
        </Field>
        <Field label="Linked BOQ item" className="col-span-2" hint="Linking lets the system compare cost against work done on that item.">
          <Select value={f.boqItemId} onChange={(e) => set("boqItemId", e.target.value)}>
            <option value="">Not linked (project-level)</option>
            {boq.map((b) => (
              <option key={b.id} value={b.id}>
                {b.itemNo} · {b.category} — {b.description.slice(0, 40)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity">
          <NumInput value={f.qty} onChange={(v) => set("qty", v)} />
        </Field>
        <Field label="Unit">
          <Input value={f.unit} onChange={(e) => set("unit", e.target.value)} />
        </Field>
        <Field label="Rate (₹)">
          <NumInput value={f.rate} onChange={(v) => set("rate", v)} />
        </Field>
        <Field label="…or lump sum (₹)">
          <NumInput value={f.lump} onChange={(v) => set("lump", v)} disabled={usesQty} />
        </Field>
      </div>
    </Sheet>
  );
}
