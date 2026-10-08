"use client";

import { useMemo, useState } from "react";
import { Camera } from "lucide-react";
import { useStore, can } from "@/lib/store";
import { addDays, num, todayISO, uid } from "@/lib/format";
import { getMetrics, poReceived } from "@/lib/calc";
import { PHOTO_CATEGORIES, type Attachment } from "@/lib/types";
import { Button, Chips, Field, FilePick, Input, NumInput, Select, Textarea, readAttachment } from "../ui";

function Footer({ onSubmit, disabled, label = "Submit" }: { onSubmit: () => void; disabled?: boolean; label?: string }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-6 border-t border-line bg-bg px-5 pb-1 pt-4">
      <Button onClick={onSubmit} disabled={disabled} size="lg" className="w-full">
        {label}
      </Button>
    </div>
  );
}

function BoqSelect({ projectId, value, onChange, placeholder = "Select BOQ item…" }: { projectId: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { state } = useStore();
  const items = state.boqItems.filter((i) => i.projectId === projectId);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {items.map((i) => (
        <option key={i.id} value={i.id}>
          {i.itemNo} · {i.category} — {i.description.slice(0, 48)}
        </option>
      ))}
    </Select>
  );
}

/* ---------------- Material request (indent) ---------------- */

export function MaterialRequestForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const { state, user, add } = useStore();
  const [materialId, setMaterialId] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [requiredDate, setRequiredDate] = useState(addDays(todayISO(), 3));
  const [boqItemId, setBoq] = useState("");
  const [purpose, setPurpose] = useState("");
  const [priority, setPriority] = useState<"Normal" | "Urgent">("Normal");
  const [notes, setNotes] = useState("");
  const mat = state.materials.find((m) => m.id === materialId);
  const stat = getMetrics(state, projectId).materials.find((m) => m.materialId === materialId);

  const submit = (status: "Draft" | "Submitted") => {
    const no = `MR-${200 + state.requests.length + 1}`;
    add("requests", { id: uid("req"), no, projectId, materialId, qty: Number(qty), requiredDate, boqItemId: boqItemId || undefined, purpose, priority, notes: notes || undefined, status, createdBy: user!.id, createdAt: todayISO() }, `Material request ${no} – ${mat?.name}`);
    onDone();
  };

  return (
    <div className="space-y-4">
      <Field label="Material">
        <Select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
          <option value="">Select material…</option>
          {state.materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.unit})
            </option>
          ))}
        </Select>
      </Field>
      {stat && (
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 text-center text-[12px] text-muted">
          <div>
            Est. total<div className="tnum text-[15px] font-semibold text-ink">{num(stat.estQty, 0)}</div>
          </div>
          <div>
            Received<div className="tnum text-[15px] font-semibold text-ink">{num(stat.receivedQty, 0)}</div>
          </div>
          <div>
            In stock<div className="tnum text-[15px] font-semibold text-ink">{num(stat.stock, 0)}</div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Quantity${mat ? ` (${mat.unit})` : ""}`}>
          <NumInput value={qty} onChange={setQty} placeholder="0" />
        </Field>
        <Field label="Required by">
          <Input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Priority">
        <Chips value={priority} onChange={setPriority} options={["Normal", "Urgent"] as const} />
      </Field>
      <Field label="BOQ reference">
        <BoqSelect projectId={projectId} value={boqItemId} onChange={setBoq} placeholder="Optional" />
      </Field>
      <Field label="Purpose">
        <Input placeholder="e.g. Slab casting – 5th floor" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </Field>
      <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t border-line bg-bg px-5 pb-1 pt-4">
        <Button variant="white" size="lg" className="flex-1" disabled={!materialId || !qty} onClick={() => submit("Draft")}>
          Save draft
        </Button>
        <Button size="lg" className="flex-1" disabled={!materialId || !qty} onClick={() => submit("Submitted")}>
          Submit request
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Measurement ---------------- */

export function MeasurementForm({ projectId, onDone, boqItemId: initialItem }: { projectId: string; onDone: () => void; boqItemId?: string }) {
  const { state, user, role, add } = useStore();
  const [boqItemId, setBoq] = useState(initialItem ?? "");
  const [qty, setQty] = useState<number | "">("");
  const [date, setDate] = useState(todayISO());
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const prog = getMetrics(state, projectId).items.find((p) => p.item.id === boqItemId);
  const after = prog ? prog.measuredQty + Number(qty || 0) : 0;
  const over = prog && after > prog.item.qty;

  const submit = () => {
    const autoApprove = can(role, "approve");
    add(
      "measurements",
      {
        id: uid("ms"),
        projectId,
        boqItemId,
        date,
        qty: Number(qty),
        location: location || undefined,
        notes: notes || undefined,
        attachment,
        status: autoApprove ? "Approved" : "Submitted",
        approvedBy: autoApprove ? user!.id : undefined,
        createdBy: user!.id,
      },
      `Measurement ${num(Number(qty))} ${prog?.item.unit} for ${prog?.item.itemNo}`,
    );
    onDone();
  };

  return (
    <div className="space-y-4">
      <Field label="BOQ item">
        <BoqSelect projectId={projectId} value={boqItemId} onChange={setBoq} />
      </Field>
      {prog && (
        <div className="rounded-2xl bg-white p-4">
          <div className="mb-3 text-[14px] font-semibold">{prog.item.description}</div>
          <div className="grid grid-cols-2 gap-y-2 text-[13px] sm:grid-cols-4">
            <Mini label="BOQ total" v={`${num(prog.item.qty)} ${prog.item.unit}`} />
            <Mini label="Completed previously" v={`${num(prog.measuredQty)} ${prog.item.unit}`} />
            <Mini label="Total after this" v={`${num(after)} ${prog.item.unit}`} tone={over ? "text-red" : undefined} />
            <Mini label="Remaining" v={`${num(Math.max(prog.item.qty - after, 0))} ${prog.item.unit}`} />
          </div>
          {over && <div className="mt-3 text-[13px] text-red">Exceeds BOQ quantity — this may need a BOQ revision / variation.</div>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Quantity${prog ? ` (${prog.item.unit})` : ""}`}>
          <NumInput value={qty} onChange={setQty} placeholder="0" />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Location / area">
        <Input placeholder="e.g. Block B, 3rd floor" value={location} onChange={(e) => setLocation(e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </Field>
      <Field label="Measurement sheet / photo">
        <FilePick value={attachment} onChange={setAttachment} capture />
      </Field>
      <Footer onSubmit={submit} disabled={!boqItemId || !qty} label={can(role, "approve") ? "Save & approve" : "Submit for approval"} />
    </div>
  );
}

function Mini({ label, v, tone }: { label: string; v: string; tone?: string }) {
  return (
    <div>
      <div className="text-muted">{label}</div>
      <div className={`tnum text-[15px] font-semibold ${tone ?? ""}`}>{v}</div>
    </div>
  );
}

/* ---------------- Material received ---------------- */

export function ReceiptForm({ projectId, onDone, poId: initialPo }: { projectId: string; onDone: () => void; poId?: string }) {
  const { state, user, update } = useStore();
  const openPOs = useMemo(
    () => state.pos.filter((p) => p.projectId === projectId && ["Approved", "Ordered", "Partially received"].includes(p.status)),
    [state.pos, projectId],
  );
  const [poId, setPoId] = useState(initialPo ?? openPOs[0]?.id ?? "");
  const po = state.pos.find((p) => p.id === poId);
  const mat = state.materials.find((m) => m.id === po?.materialId);
  const received = po ? poReceived(state, po.id) : 0;
  const pending = po ? po.qty - received : 0;
  const [qty, setQty] = useState<number | "">("");
  const [date, setDate] = useState(todayISO());
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<Attachment | undefined>();

  const submit = () => {
    if (!po) return;
    const q = Number(qty);
    update((s) => {
      s.receipts.unshift({ id: uid("rcv"), projectId, poId: po.id, materialId: po.materialId, date, qty: q, vehicle: vehicle || undefined, notes: notes || undefined, attachment, createdBy: user!.id });
      const p = s.pos.find((x) => x.id === po.id)!;
      const newStatus = received + q >= p.qty - 1e-6 ? "Fully received" : "Partially received";
      s.audit.unshift({ id: uid("aud"), at: new Date().toISOString(), userId: user!.id, entity: "Material receipt", entityId: p.id, projectId, action: "created", summary: `Received ${num(q)} ${mat?.unit} ${mat?.name} against ${p.no}`, changes: p.status !== newStatus ? [{ field: "status", from: p.status, to: newStatus }] : undefined });
      p.status = newStatus;
      if (p.requestId) {
        const r = s.requests.find((x) => x.id === p.requestId);
        if (r && newStatus === "Fully received") r.status = "Closed";
      }
    });
    onDone();
  };

  if (!openPOs.length)
    return <div className="rounded-2xl bg-white p-6 text-center text-[14px] text-muted">No open purchase orders for this project.</div>;

  return (
    <div className="space-y-4">
      <Field label="Purchase order">
        <Select value={poId} onChange={(e) => setPoId(e.target.value)}>
          {openPOs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.no} · {state.materials.find((m) => m.id === p.materialId)?.name} · {state.vendors.find((v) => v.id === p.vendorId)?.name}
            </option>
          ))}
        </Select>
      </Field>
      {po && (
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-4 text-[13px]">
          <Mini label="PO quantity" v={`${num(po.qty)} ${mat?.unit}`} />
          <Mini label="Received so far" v={`${num(received)}`} />
          <Mini label="Pending" v={`${num(pending)}`} tone="text-blue" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Received today${mat ? ` (${mat.unit})` : ""}`}>
          <NumInput value={qty} onChange={setQty} placeholder={String(num(pending))} />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      {qty !== "" && po && Number(qty) > pending && <div className="px-1 text-[13px] text-orange">More than pending quantity — check the challan.</div>}
      <Field label="Vehicle / lorry number">
        <Input placeholder="TN 00 XX 0000" value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} />
      </Field>
      <Field label="Bill / challan">
        <FilePick value={attachment} onChange={setAttachment} capture label="Photo of challan" />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </Field>
      <Footer onSubmit={submit} disabled={!po || !qty} label="Record receipt" />
    </div>
  );
}

/* ---------------- Photo ---------------- */

export function PhotoForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const { user, update } = useStore();
  const [srcs, setSrcs] = useState<string[]>([]);
  const [category, setCategory] = useState("Progress");
  const [description, setDescription] = useState("");
  const submit = () => {
    update((s) => {
      for (const src of srcs) s.photos.unshift({ id: uid("pho"), projectId, date: todayISO(), category, description: description || undefined, src, createdBy: user!.id });
    });
    onDone();
  };
  return (
    <div className="space-y-4">
      <label className="flex min-h-40 cursor-pointer flex-wrap items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line bg-white p-3 text-muted hover:text-ink">
        {srcs.length === 0 && (
          <span className="flex flex-col items-center gap-2 text-[14px]">
            <Camera size={28} /> Take or choose photos
          </span>
        )}
        {srcs.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={s} alt="" className="h-24 w-24 rounded-2xl object-cover" />
        ))}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={async (e) => {
            for (const f of [...(e.target.files ?? [])]) {
              const a = await readAttachment(f);
              if (a.dataUrl) setSrcs((x) => [...x, a.dataUrl!]);
            }
          }}
        />
      </label>
      <Field label="Category">
        <Chips value={category} onChange={setCategory} options={PHOTO_CATEGORIES} />
      </Field>
      <Field label="Description">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
      </Field>
      <Footer onSubmit={submit} disabled={!srcs.length} label={`Upload ${srcs.length || ""} photo${srcs.length === 1 ? "" : "s"}`} />
    </div>
  );
}

/* ---------------- Issue ---------------- */

export function IssueForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const { user, update } = useStore();
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"Low" | "Medium" | "High">("Medium");
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState("Project manager");
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 2));
  const submit = () => {
    update((s) => {
      const no = Math.max(0, ...s.issues.map((i) => i.no)) + 1;
      s.issues.unshift({ id: uid("iss"), no, projectId, title, severity, description, responsible, dueDate, status: "Open", createdBy: user!.id, createdAt: todayISO() });
    });
    onDone();
  };
  return (
    <div className="space-y-4">
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Steel delivery delayed" />
      </Field>
      <Field label="Severity">
        <Chips value={severity} onChange={setSeverity} options={["Low", "Medium", "High"] as const} />
      </Field>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened and what is needed?" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Responsible">
          <Select value={responsible} onChange={(e) => setResponsible(e.target.value)}>
            {["Project manager", "Procurement", "Site engineer", "Owner", "Subcontractor", "Client"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <Footer onSubmit={submit} disabled={!title} label="Report issue" />
    </div>
  );
}
