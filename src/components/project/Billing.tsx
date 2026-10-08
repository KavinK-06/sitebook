"use client";

import { useState } from "react";
import { Download, FileText, IndianRupee, Plus } from "lucide-react";
import { can, useStore } from "@/lib/store";
import { getMetrics } from "@/lib/calc";
import { exportXlsx } from "@/lib/excel";
import { addDays, daysBetween, fmtDate, inr, inrShort, num, todayISO, uid } from "@/lib/format";
import type { Attachment, Bill, BillStatus } from "@/lib/types";
import { Button, Card, Field, FilePick, Input, KV, NumInput, Pill, Select, Sheet, Stat, Table, Td, Th } from "../ui";

const NEXT: Partial<Record<BillStatus, BillStatus>> = { Draft: "Submitted", Submitted: "Approved", Approved: "Sent" };

export function BillingTab({ projectId }: { projectId: string }) {
  const { state, role, patch } = useStore();
  const project = state.projects.find((p) => p.id === projectId)!;
  const m = getMetrics(state, projectId);
  const bills = state.bills.filter((b) => b.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date));
  const [building, setBuilding] = useState(false);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [viewing, setViewing] = useState<Bill | null>(null);
  const canBill = can(role, "finance") || can(role, "editCommercial");
  const paidFor = (id: string) => state.payments.filter((p) => p.billId === id).reduce((a, p) => a + p.amount, 0);
  const today = todayISO();

  const doExport = () =>
    exportXlsx(`${project.code}-Billing.xlsx`, [
      { name: "Bills", rows: bills.map((b) => ({ "Bill no": b.no, Date: b.date, From: b.periodFrom, To: b.periodTo, Gross: b.gross, Deductions: b.deductions, Net: b.net, Paid: paidFor(b.id), Outstanding: b.net - paidFor(b.id), Status: b.status })) },
      { name: "Item status", rows: m.items.map((p) => ({ Item: p.item.itemNo, Description: p.item.description, "BOQ qty": p.item.qty, Approved: p.approvedQty, Billed: p.billedQty, Unbilled: p.unbilledQty, Rate: p.item.rate, "Unbilled value": p.unbilledQty * p.item.rate })) },
    ]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Billed (gross)" value={inrShort(m.billedGross)} sub={`${inrShort(m.billedNet)} net`} />
        <Stat label="Collected" value={inrShort(m.collected)} />
        <Stat label="Outstanding" value={inrShort(m.outstanding)} sub={m.overdueBills.length ? <span className="text-red">{m.overdueBills.length} overdue</span> : "None overdue"} />
        <Stat label="Approved, not billed" value={<span className="text-blue">{inrShort(m.unbilledValue)}</span>} sub="Ready to bill" />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="px-1 text-[19px] font-semibold">Bills</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="white" icon={<Download size={15} />} onClick={doExport}>
            Export
          </Button>
          {canBill && (
            <Button size="sm" icon={<Plus size={15} />} onClick={() => setBuilding(true)} disabled={m.unbilledValue <= 0}>
              New bill from measurements
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {bills.length === 0 && <Card className="text-[14px] text-muted">No bills yet. Approved measurements can be billed here.</Card>}
        {bills.map((b) => {
          const paid = paidFor(b.id);
          const out = b.net - paid;
          const overdue = out > 1 && b.dueDate < today && b.status !== "Draft";
          return (
            <Card key={b.id} className="flex flex-wrap items-center gap-3 !p-4">
              <button onClick={() => setViewing(b)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-softer text-blue">
                  <FileText size={19} />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold">
                    {b.no} <span className="font-normal text-muted">· {b.items.length} items</span>
                  </div>
                  <div className="text-[13px] text-muted">
                    {fmtDate(b.periodFrom)} – {fmtDate(b.periodTo)} · due {fmtDate(b.dueDate)}
                    {overdue && <span className="text-red"> · {daysBetween(b.dueDate, today)} days overdue</span>}
                  </div>
                </div>
              </button>
              <div className="text-right">
                <div className="tnum font-semibold">{inr(b.net)}</div>
                <div className="tnum text-[12px] text-muted">{out > 1 ? `${inrShort(out)} outstanding` : "Fully paid"}</div>
              </div>
              <Pill>{b.status}</Pill>
              {canBill && NEXT[b.status] && (
                <Button size="sm" variant="soft" onClick={() => patch("bills", b.id, { status: NEXT[b.status]! }, `${b.no} marked ${NEXT[b.status]}`)}>
                  Mark {NEXT[b.status]!.toLowerCase()}
                </Button>
              )}
              {canBill && ["Sent", "Partially paid", "Approved"].includes(b.status) && out > 1 && (
                <Button size="sm" icon={<IndianRupee size={14} />} onClick={() => setPaying(b)}>
                  Record payment
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {building && <BillBuilder projectId={projectId} onClose={() => setBuilding(false)} />}
      {paying && <PaymentSheet bill={paying} onClose={() => setPaying(null)} />}
      {viewing && <BillDetail bill={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function BillBuilder({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { state, user, update } = useStore();
  const m = getMetrics(state, projectId);
  const project = state.projects.find((p) => p.id === projectId)!;
  const billable = m.items.filter((p) => p.unbilledQty > 0.001);
  const [qty, setQty] = useState<Record<string, number | "">>(() => Object.fromEntries(billable.map((p) => [p.item.id, Math.round(p.unbilledQty * 100) / 100])));
  const [retention, setRetention] = useState<number | "">(5);
  const [tds, setTds] = useState<number | "">(2);
  const prevBills = state.bills.filter((b) => b.projectId === projectId);
  const lastTo = prevBills.reduce((a, b) => (b.periodTo > a ? b.periodTo : a), project.startDate);
  const [periodFrom, setFrom] = useState(addDays(lastTo, 1));
  const [periodTo, setTo] = useState(todayISO());
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const lines = billable.map((p) => ({ p, q: Number(qty[p.item.id] || 0) })).filter((l) => l.q > 0);
  const gross = lines.reduce((a, l) => a + l.q * l.p.item.rate, 0);
  const deductions = Math.round((gross * (Number(retention || 0) + Number(tds || 0))) / 100);
  const overBilled = lines.some((l) => l.q > l.p.unbilledQty + 0.001);

  const create = () => {
    const key = project.code.split("-")[1] ?? "X";
    const no = `RA-${key}-${String(prevBills.length + 1).padStart(2, "0")}`;
    update((s) => {
      s.bills.unshift({
        id: uid("bill"),
        no,
        projectId,
        periodFrom,
        periodTo,
        date: todayISO(),
        dueDate: addDays(todayISO(), 30),
        items: lines.map((l) => ({ boqItemId: l.p.item.id, qty: l.q, rate: l.p.item.rate, amount: Math.round(l.q * l.p.item.rate) })),
        gross: Math.round(gross),
        deductions,
        net: Math.round(gross) - deductions,
        status: "Draft",
        attachment,
        createdBy: user!.id,
      });
      s.audit.unshift({ id: uid("aud"), at: new Date().toISOString(), userId: user!.id, entity: "Bill", entityId: no, projectId, action: "created", summary: `Created bill ${no} for ${inrShort(gross)} (gross)` });
    });
    onClose();
  };

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title="New RA bill"
      footer={
        <Button className="flex-1" size="lg" disabled={!lines.length || overBilled} onClick={create}>
          Generate draft bill · {inr(Math.round(gross) - deductions)} net
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="Period from">
          <Input type="date" value={periodFrom} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Period to">
          <Input type="date" value={periodTo} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th right>BOQ qty</Th>
            <Th right>Completed</Th>
            <Th right>Prev. billed</Th>
            <Th right className="w-32">Current</Th>
            <Th right>Amount</Th>
          </tr>
        </thead>
        <tbody>
          {billable.map((p) => {
            const q = Number(qty[p.item.id] || 0);
            return (
              <tr key={p.item.id}>
                <Td>
                  <div className="font-medium">
                    {p.item.itemNo} {p.item.category}
                  </div>
                  <div className="text-[12px] text-muted">
                    {inr(p.item.rate)}/{p.item.unit}
                  </div>
                </Td>
                <Td right>{num(p.item.qty)}</Td>
                <Td right>{num(p.approvedQty)}</Td>
                <Td right>{num(p.billedQty)}</Td>
                <Td right>
                  <NumInput
                    value={qty[p.item.id] ?? ""}
                    onChange={(v) => setQty((x) => ({ ...x, [p.item.id]: v }))}
                    className={`!h-10 !rounded-xl !bg-bg text-right ${q > p.unbilledQty + 0.001 ? "!border-red" : ""}`}
                  />
                </Td>
                <Td right className="font-semibold">
                  {inr(q * p.item.rate)}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      {overBilled && <p className="mt-2 px-1 text-[13px] text-red">Current quantity can’t exceed approved minus previously billed.</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Retention %">
            <NumInput value={retention} onChange={setRetention} />
          </Field>
          <Field label="TDS %">
            <NumInput value={tds} onChange={setTds} />
          </Field>
          <Field label="Bill document" className="col-span-2">
            <FilePick value={attachment} onChange={setAttachment} />
          </Field>
        </div>
        <Card className="!p-4">
          <KV k="Gross amount" v={inr(gross)} />
          <KV k="Deductions" v={`− ${inr(deductions)}`} />
          <KV k="Net amount" v={inr(Math.round(gross) - deductions)} strong />
          <div className="mt-2 text-[12px] text-muted">Project billing only — GST invoicing stays in your accounting software.</div>
        </Card>
      </div>
    </Sheet>
  );
}

function PaymentSheet({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { state, user, update } = useStore();
  const paid = state.payments.filter((p) => p.billId === bill.id).reduce((a, p) => a + p.amount, 0);
  const [amount, setAmount] = useState<number | "">(bill.net - paid);
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState("NEFT");
  const [ref, setRef] = useState("");
  const save = () => {
    const a = Number(amount);
    update((s) => {
      s.payments.unshift({ id: uid("pay"), projectId: bill.projectId, billId: bill.id, date, amount: a, mode, ref: ref || undefined });
      const b = s.bills.find((x) => x.id === bill.id)!;
      const newStatus: BillStatus = paid + a >= b.net - 1 ? "Paid" : "Partially paid";
      s.audit.unshift({ id: uid("aud"), at: new Date().toISOString(), userId: user!.id, entity: "Payment", entityId: bill.id, projectId: bill.projectId, action: "created", summary: `Received ${inr(a)} against ${b.no}`, changes: [{ field: "status", from: b.status, to: newStatus }] });
      b.status = newStatus;
    });
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={`Payment · ${bill.no}`} footer={<Button className="flex-1" size="lg" disabled={!amount} onClick={save}>Record {inr(Number(amount || 0))}</Button>}>
      <div className="mb-4 rounded-2xl bg-white p-4">
        <KV k="Net bill" v={inr(bill.net)} />
        <KV k="Received so far" v={inr(paid)} />
        <KV k="Outstanding" v={inr(bill.net - paid)} strong />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)">
          <NumInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Mode">
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>
            {["NEFT", "RTGS", "Cheque", "UPI", "Cash"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Field>
        <Field label="Reference">
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UTR / cheque no." />
        </Field>
      </div>
    </Sheet>
  );
}

function BillDetail({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { state } = useStore();
  const payments = state.payments.filter((p) => p.billId === bill.id);
  return (
    <Sheet open wide onClose={onClose} title={`${bill.no} · ${bill.status}`}>
      <div className="mb-3 text-[14px] text-muted">
        Period {fmtDate(bill.periodFrom)} – {fmtDate(bill.periodTo)} · issued {fmtDate(bill.date)} · due {fmtDate(bill.dueDate)}
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th right>Qty</Th>
            <Th right>Rate</Th>
            <Th right>Amount</Th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((i) => {
            const it = state.boqItems.find((b) => b.id === i.boqItemId);
            return (
              <tr key={i.boqItemId}>
                <Td>
                  {it?.itemNo} {it?.description}
                </Td>
                <Td right>
                  {num(i.qty)} {it?.unit}
                </Td>
                <Td right>{inr(i.rate)}</Td>
                <Td right>{inr(i.amount)}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="!p-4">
          <KV k="Gross" v={inr(bill.gross)} />
          <KV k="Deductions" v={`− ${inr(bill.deductions)}`} />
          <KV k="Net" v={inr(bill.net)} strong />
        </Card>
        <Card className="!p-4">
          <div className="mb-1 text-[13px] font-medium uppercase text-muted">Payments</div>
          {payments.length === 0 && <div className="text-[14px] text-muted">None yet</div>}
          {payments.map((p) => (
            <KV key={p.id} k={`${fmtDate(p.date)} · ${p.mode}`} v={inr(p.amount)} />
          ))}
        </Card>
      </div>
    </Sheet>
  );
}
