"use client";

import { useMemo, useState } from "react";
import { Check, FileText, Plus, X } from "lucide-react";
import { can, useStore, useVisibleProjects } from "@/lib/store";
import { poReceived } from "@/lib/calc";
import { addDays, fmtDate, fmtDay, inr, inrShort, num, todayISO, uid } from "@/lib/format";
import type { Attachment, MaterialRequest, PurchaseOrder, Quotation } from "@/lib/types";
import { Button, Card, Empty, Field, FilePick, Input, NumInput, PageHeader, Pill, Segmented, Select, Sheet, Textarea, cx } from "../ui";
import { ReceiptForm } from "../forms/QuickForms";
import { useShell } from "../AppShell";

type Tab = "requests" | "quotations" | "pos" | "receipts";

export function ProcurementBoard({ title, projectId }: { title?: string; projectId?: string }) {
  const { state, role, patch, user } = useStore();
  const { openAdd } = useShell();
  const visible = useVisibleProjects();
  const pids = useMemo(() => new Set(projectId ? [projectId] : visible.map((p) => p.id)), [projectId, visible]);
  const [tab, setTab] = useState<Tab>(role === "procurement" ? "requests" : "pos");
  const [quoteFor, setQuoteFor] = useState<MaterialRequest | null>(null);
  const [poFrom, setPoFrom] = useState<{ q?: Quotation; r?: MaterialRequest; blank?: boolean } | null>(null);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const today = todayISO();

  const requests = state.requests.filter((r) => pids.has(r.projectId));
  const quotations = state.quotations.filter((q) => pids.has(q.projectId));
  const pos = state.pos.filter((p) => pids.has(p.projectId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const receipts = state.receipts.filter((r) => pids.has(r.projectId)).sort((a, b) => b.date.localeCompare(a.date));
  const openPOs = pos.filter((p) => !["Fully received", "Cancelled"].includes(p.status));
  const matName = (id: string) => state.materials.find((m) => m.id === id)?.name ?? "—";
  const matUnit = (id: string) => state.materials.find((m) => m.id === id)?.unit ?? "";
  const vendorName = (id: string) => state.vendors.find((v) => v.id === id)?.name ?? "—";
  const projName = (id: string) => state.projects.find((p) => p.id === id)?.name ?? "";
  const canBuy = can(role, "purchase");
  const canApprove = can(role, "approve");

  const reqStatus = (r: MaterialRequest, status: MaterialRequest["status"]) => patch("requests", r.id, { status }, `${status} material request ${r.no}`);

  return (
    <div>
      {title && (
        <PageHeader
          title={title}
          subtitle={`${requests.filter((r) => r.status === "Approved").length} approved requests to buy · ${openPOs.length} open POs`}
          actions={canBuy ? <Button icon={<Plus size={18} />} onClick={() => setPoFrom({ blank: true })}>New PO</Button> : undefined}
        />
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "requests", label: "Requests", count: requests.filter((r) => r.status === "Submitted" || r.status === "Approved").length },
            { value: "quotations", label: "Quotations", count: quotations.length },
            { value: "pos", label: "Purchase orders", count: openPOs.length },
            { value: "receipts", label: "Receipts" },
          ]}
        />
        {!title && canBuy && (
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setPoFrom({ blank: true })} className="shrink-0">
            New PO
          </Button>
        )}
      </div>

      {tab === "requests" && (
        <div className="space-y-2">
          {projectId && role !== "finance" && (
            <button onClick={() => openAdd("request", projectId)} className="flex w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line py-4 text-[14px] font-medium text-muted hover:text-ink">
              <Plus size={16} /> New material request
            </button>
          )}
          {requests.length === 0 && <Empty title="No material requests" hint="Site engineers raise requests from the + button." />}
          {requests
            .slice()
            .sort((a, b) => order(a.status) - order(b.status) || b.createdAt.localeCompare(a.createdAt))
            .map((r) => {
              const quotes = quotations.filter((q) => q.requestId === r.id).length;
              return (
                <Card key={r.id} className="!p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{matName(r.materialId)}</span>
                        <span className="tnum text-muted">
                          {num(r.qty)} {matUnit(r.materialId)}
                        </span>
                        {r.priority === "Urgent" && <Pill>Urgent</Pill>}
                      </div>
                      <div className="mt-0.5 text-[13px] text-muted">
                        {r.no} · {!projectId && `${projName(r.projectId)} · `}
                        {r.purpose || "—"} · needed {fmtDay(r.requiredDate)} · by {state.users.find((u) => u.id === r.createdBy)?.name}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill>{r.status}</Pill>
                      {r.status === "Draft" && r.createdBy === user?.id && (
                        <Button size="sm" variant="soft" onClick={() => reqStatus(r, "Submitted")}>Submit</Button>
                      )}
                      {r.status === "Submitted" && canApprove && (
                        <>
                          <Button size="sm" variant="danger" icon={<X size={14} />} onClick={() => reqStatus(r, "Rejected")}>Reject</Button>
                          <Button size="sm" variant="black" icon={<Check size={14} />} onClick={() => reqStatus(r, "Approved")}>Approve</Button>
                        </>
                      )}
                      {r.status === "Approved" && canBuy && (
                        <>
                          <Button size="sm" variant="white" onClick={() => setQuoteFor(r)}>
                            Add quote{quotes ? ` (${quotes})` : ""}
                          </Button>
                          <Button size="sm" onClick={() => setPoFrom({ r })}>Create PO</Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      )}

      {tab === "quotations" && (
        <div className="space-y-4">
          {quotations.length === 0 && <Empty title="No quotations yet" hint="Add vendor quotes against an approved request." />}
          {groupBy(quotations, (q) => q.requestId ?? q.id).map(([key, qs]) => {
            const r = requests.find((x) => x.id === key);
            const best = Math.min(...qs.map((q) => q.total));
            return (
              <div key={key}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="text-[15px] font-semibold">
                    {matName(qs[0].materialId)} · {num(qs[0].qty)} {matUnit(qs[0].materialId)}
                    <span className="ml-2 text-[13px] font-normal text-muted">{r ? `${r.no} · ${r.status}` : ""}</span>
                  </div>
                  {r && canBuy && r.status === "Approved" && (
                    <button onClick={() => setQuoteFor(r)} className="text-[13px] font-medium text-blue">
                      + Add quote
                    </button>
                  )}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {qs.map((q) => (
                    <Card key={q.id} className={cx("!p-4", q.total === best && qs.length > 1 && "ring-2 ring-blue/30")}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{vendorName(q.vendorId)}</div>
                          <div className="text-[13px] text-muted">
                            ₹{num(q.rate)}/{matUnit(q.materialId)} · tax {inrShort(q.tax)} · delivery {inrShort(q.delivery)}
                          </div>
                          <div className="text-[13px] text-muted">Delivery by {fmtDate(q.expectedDate)}</div>
                        </div>
                        <div className="text-right">
                          <div className="tnum text-[18px] font-semibold">{inrShort(q.total)}</div>
                          {q.total === best && qs.length > 1 && <Pill tone="blue">Lowest</Pill>}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        {q.attachment ? <AttachmentLink a={q.attachment} /> : <span />}
                        {canBuy && r?.status === "Approved" && (
                          <Button size="sm" onClick={() => setPoFrom({ q, r })}>
                            Create PO
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "pos" && (
        <div className="space-y-2">
          {pos.length === 0 && <Empty title="No purchase orders" />}
          {pos.slice(0, 60).map((po) => {
            const rec = poReceived(state, po.id);
            const late = po.expectedDate < today && ["Approved", "Ordered", "Partially received"].includes(po.status);
            return (
              <Card key={po.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{po.no}</span>
                      <span>{matName(po.materialId)}</span>
                      {late && <Pill tone="red">Delayed</Pill>}
                    </div>
                    <div className="mt-0.5 text-[13px] text-muted">
                      {!projectId && `${projName(po.projectId)} · `}
                      {vendorName(po.vendorId)} · {num(po.qty)} {matUnit(po.materialId)} @ ₹{num(po.rate)} · expected {fmtDay(po.expectedDate)}
                    </div>
                    {rec > 0 && rec < po.qty && (
                      <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-blue-soft">
                          <div className="h-full bg-blue" style={{ width: `${(rec / po.qty) * 100}%` }} />
                        </div>
                        {num(rec)} of {num(po.qty)} received · {num(po.qty - rec)} pending
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tnum mr-1 font-semibold">{inrShort(po.total)}</span>
                    <Pill>{po.status}</Pill>
                    {po.status === "Draft" && canBuy && (
                      <Button size="sm" variant="soft" onClick={() => patch("pos", po.id, { status: "Pending approval" }, `Submitted ${po.no} for approval`)}>
                        Submit
                      </Button>
                    )}
                    {po.status === "Pending approval" && canApprove && (
                      <Button size="sm" icon={<Check size={14} />} onClick={() => patch("pos", po.id, { status: "Approved" }, `Approved ${po.no}`)}>
                        Approve
                      </Button>
                    )}
                    {po.status === "Approved" && canBuy && (
                      <Button size="sm" variant="soft" onClick={() => patch("pos", po.id, { status: "Ordered" }, `Placed order ${po.no}`)}>
                        Mark ordered
                      </Button>
                    )}
                    {["Approved", "Ordered", "Partially received"].includes(po.status) && role !== "finance" && (
                      <Button size="sm" variant="white" onClick={() => setReceivePo(po)}>
                        Receive
                      </Button>
                    )}
                    {["Draft", "Pending approval", "Approved"].includes(po.status) && (canBuy || canApprove) && (
                      <button className="px-2 text-[13px] text-muted hover:text-red" onClick={() => patch("pos", po.id, { status: "Cancelled" }, `Cancelled ${po.no}`)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "receipts" && (
        <Card className="divide-y divide-line !py-1">
          {receipts.length === 0 && <div className="py-6 text-center text-muted">No receipts yet.</div>}
          {receipts.slice(0, 80).map((r) => {
            const po = state.pos.find((p) => p.id === r.poId);
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {matName(r.materialId)} · {num(r.qty)} {matUnit(r.materialId)}
                  </div>
                  <div className="truncate text-[13px] text-muted">
                    {fmtDate(r.date)} · {po?.no} · {po && vendorName(po.vendorId)} {r.vehicle && `· ${r.vehicle}`} {!projectId && `· ${projName(r.projectId)}`}
                  </div>
                </div>
                {r.attachment && <AttachmentLink a={r.attachment} />}
              </div>
            );
          })}
        </Card>
      )}

      <QuotationSheet request={quoteFor} onClose={() => setQuoteFor(null)} />
      <POSheet init={poFrom} projectId={projectId} onClose={() => setPoFrom(null)} />
      <Sheet open={!!receivePo} onClose={() => setReceivePo(null)} title="Material received">
        {receivePo && <ReceiptForm projectId={receivePo.projectId} poId={receivePo.id} onDone={() => setReceivePo(null)} />}
      </Sheet>
    </div>
  );
}

function order(s: string) {
  return ["Submitted", "Approved", "Draft", "Purchased", "Rejected", "Closed"].indexOf(s);
}

function groupBy<T>(arr: T[], f: (x: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const x of arr) m.set(f(x), [...(m.get(f(x)) ?? []), x]);
  return [...m.entries()];
}

export function AttachmentLink({ a }: { a: Attachment }) {
  return a.dataUrl ? (
    <a href={a.dataUrl} download={a.name} target="_blank" rel="noreferrer" className="inline-flex max-w-[200px] items-center gap-1.5 truncate rounded-full bg-bg px-3 py-1.5 text-[12px] font-medium hover:bg-blue-softer">
      <FileText size={14} /> <span className="truncate">{a.name}</span>
    </a>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 text-[12px] text-muted">
      <FileText size={14} /> {a.name}
    </span>
  );
}

function QuotationSheet({ request, onClose }: { request: MaterialRequest | null; onClose: () => void }) {
  const { state, add } = useStore();
  const [vendorId, setVendorId] = useState("");
  const [rate, setRate] = useState<number | "">("");
  const [taxPct, setTaxPct] = useState<number | "">(18);
  const [delivery, setDelivery] = useState<number | "">(0);
  const [expectedDate, setExpected] = useState(addDays(todayISO(), 5));
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  if (!request) return null;
  const qty = request.qty;
  const base = qty * Number(rate || 0);
  const tax = Math.round((base * Number(taxPct || 0)) / 100);
  const total = Math.round(base + tax + Number(delivery || 0));
  const unit = state.materials.find((m) => m.id === request.materialId)?.unit;
  const save = () => {
    add("quotations", { id: uid("quo"), projectId: request.projectId, requestId: request.id, vendorId, materialId: request.materialId, qty, rate: Number(rate), tax, delivery: Number(delivery || 0), total, expectedDate, notes: notes || undefined, attachment, createdAt: todayISO() }, `Quotation from ${state.vendors.find((v) => v.id === vendorId)?.name} for ${request.no}`);
    setRate("");
    setVendorId("");
    setAttachment(undefined);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={`Quotation · ${request.no}`} footer={<Button className="flex-1" size="lg" disabled={!vendorId || !rate} onClick={save}>Save quotation · {inr(total)}</Button>}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 text-[14px]">
          {state.materials.find((m) => m.id === request.materialId)?.name} · <b>{num(qty)} {unit}</b>
        </div>
        <Field label="Vendor">
          <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Select vendor…</option>
            {state.vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.supplies}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={`Rate / ${unit}`}>
            <NumInput value={rate} onChange={setRate} />
          </Field>
          <Field label="GST %">
            <NumInput value={taxPct} onChange={setTaxPct} />
          </Field>
          <Field label="Delivery ₹">
            <NumInput value={delivery} onChange={setDelivery} />
          </Field>
        </div>
        <Field label="Expected delivery">
          <Input type="date" value={expectedDate} onChange={(e) => setExpected(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Quotation PDF / photo">
          <FilePick value={attachment} onChange={setAttachment} />
        </Field>
      </div>
    </Sheet>
  );
}

function POSheet({ init, projectId, onClose }: { init: { q?: Quotation; r?: MaterialRequest; blank?: boolean } | null; projectId?: string; onClose: () => void }) {
  if (!init) return null;
  return <POForm init={init} projectId={projectId} onClose={onClose} />;
}

function POForm({ init, projectId, onClose }: { init: { q?: Quotation; r?: MaterialRequest }; projectId?: string; onClose: () => void }) {
  const { state, role, user, update } = useStore();
  const visible = useVisibleProjects().filter((p) => p.status === "Active" || p.status === "Planning");
  const q = init.q;
  const r = init.r;
  const [pid, setPid] = useState(q?.projectId ?? r?.projectId ?? projectId ?? visible[0]?.id ?? "");
  const [vendorId, setVendorId] = useState(q?.vendorId ?? "");
  const [materialId, setMaterialId] = useState(q?.materialId ?? r?.materialId ?? "");
  const [qty, setQty] = useState<number | "">(q?.qty ?? r?.qty ?? "");
  const [rate, setRate] = useState<number | "">(q?.rate ?? state.materials.find((m) => m.id === (r?.materialId ?? ""))?.rate ?? "");
  const [charges, setCharges] = useState<number | "">(q ? q.tax + q.delivery : 0);
  const [expectedDate, setExpected] = useState(q?.expectedDate ?? r?.requiredDate ?? addDays(todayISO(), 5));
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const total = Number(qty || 0) * Number(rate || 0) + Number(charges || 0);
  const owner = can(role, "approve");

  const save = () => {
    update((s) => {
      const no = `PO-${100 + s.pos.length + 1}`;
      const po: PurchaseOrder = {
        id: uid("po"),
        no,
        projectId: pid,
        vendorId,
        materialId,
        requestId: r?.id,
        quotationId: q?.id,
        boqItemId: r?.boqItemId,
        qty: Number(qty),
        rate: Number(rate),
        charges: Number(charges || 0),
        total,
        expectedDate,
        notes: notes || undefined,
        attachment,
        status: owner ? "Approved" : "Pending approval",
        createdBy: user!.id,
        createdAt: todayISO(),
      };
      s.pos.unshift(po);
      if (r) {
        const req = s.requests.find((x) => x.id === r.id);
        if (req) req.status = "Purchased";
      }
      s.audit.unshift({ id: uid("aud"), at: new Date().toISOString(), userId: user!.id, entity: "Purchase order", entityId: po.id, projectId: pid, action: "created", summary: `Created ${no} · ${inr(total)} · ${po.status}` });
    });
    onClose();
  };
  const unit = state.materials.find((m) => m.id === materialId)?.unit;
  return (
    <Sheet
      open
      onClose={onClose}
      title="Purchase order"
      footer={
        <Button className="flex-1" size="lg" disabled={!pid || !vendorId || !materialId || !qty || !rate} onClick={save}>
          {owner ? "Create & approve" : "Submit for approval"} · {inrShort(total)}
        </Button>
      }
    >
      <div className="space-y-4">
        {!q && !r && (
          <Field label="Project">
            <Select value={pid} onChange={(e) => setPid(e.target.value)}>
              {visible.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Vendor">
          <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Select vendor…</option>
            {state.vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Material">
          <Select value={materialId} onChange={(e) => { setMaterialId(e.target.value); if (!rate) setRate(state.materials.find((m) => m.id === e.target.value)?.rate ?? ""); }}>
            <option value="">Select material…</option>
            {state.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={`Qty${unit ? ` (${unit})` : ""}`}>
            <NumInput value={qty} onChange={setQty} />
          </Field>
          <Field label="Rate ₹">
            <NumInput value={rate} onChange={setRate} />
          </Field>
          <Field label="Tax + charges ₹">
            <NumInput value={charges} onChange={setCharges} />
          </Field>
        </div>
        <Field label="Expected delivery">
          <Input type="date" value={expectedDate} onChange={(e) => setExpected(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Attachment">
          <FilePick value={attachment} onChange={setAttachment} />
        </Field>
        <div className="rounded-2xl bg-white p-4 text-[14px]">
          <div className="flex justify-between">
            <span className="text-muted">Total</span>
            <b className="tnum">{inr(total)}</b>
          </div>
          <div className="mt-1 text-[12px] text-muted">Approved POs count as committed cost on the project immediately.</div>
        </div>
      </div>
    </Sheet>
  );
}
