"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, Download, Lock, Pencil, Plus, Trash2, Unlock, Upload, History } from "lucide-react";
import { can, useStore } from "@/lib/store";
import { getMetrics } from "@/lib/calc";
import { exportXlsx, parseBOQ, type ImportedBOQRow } from "@/lib/excel";
import { fmtDate, inr, inrShort, num, todayISO, uid } from "@/lib/format";
import { UNITS, type BOQItem } from "@/lib/types";
import { Button, Card, Empty, Field, Input, NumInput, Pill, ProgressBar, SearchInput, Select, Sheet, Textarea, Table, Td, Th } from "../ui";

const DEFAULT_CATEGORIES = ["Earthwork", "PCC", "RCC", "Steel", "Formwork", "Masonry", "Plaster", "Flooring", "Painting", "Plumbing", "Electrical", "Roads", "Drainage", "Other"];

export function BOQTab({ projectId }: { projectId: string }) {
  const { state, role, user, update, add, remove } = useStore();
  const project = state.projects.find((p) => p.id === projectId)!;
  const m = getMetrics(state, projectId);
  const items = state.boqItems.filter((i) => i.projectId === projectId);
  const revisions = state.boqRevisions.filter((r) => r.projectId === projectId).sort((a, b) => b.version - a.version);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<BOQItem | "new" | null>(null);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [importRows, setImportRows] = useState<{ rows: ImportedBOQRow[]; skipped: number } | null>(null);
  const [showRevs, setShowRevs] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = can(role, "editCommercial") && !project.boqLocked;
  const canCommercial = can(role, "editCommercial");

  const categories = useMemo(() => [...new Set([...DEFAULT_CATEGORIES, ...items.map((i) => i.category)])], [items]);
  const filtered = items.filter((i) => (!cat || i.category === cat) && (i.description + i.itemNo + i.category).toLowerCase().includes(q.toLowerCase()));
  const progById = new Map(m.items.map((p) => [p.item.id, p]));

  const doExport = () =>
    exportXlsx(`${project.code}-BOQ-V${project.boqVersion}.xlsx`, [
      {
        name: `BOQ V${project.boqVersion}`,
        rows: items.map((i) => ({ "Item No": i.itemNo, Category: i.category, Description: i.description, Unit: i.unit, Qty: i.qty, Rate: i.rate, Amount: i.qty * i.rate, "Completed qty": progById.get(i.id)?.approvedQty ?? 0 })),
      },
    ]);

  const lock = () =>
    update((s) => {
      const p = s.projects.find((x) => x.id === projectId)!;
      p.boqLocked = true;
      s.audit.unshift({ id: uid("aud"), at: new Date().toISOString(), userId: user!.id, entity: "BOQ", entityId: projectId, projectId, action: "updated", summary: `Approved & locked BOQ V${p.boqVersion} (${inrShort(m.boqValue)})` });
    });

  return (
    <div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Card className="md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[14px] text-[#4a4a55]">BOQ value</div>
              <div className="tnum mt-1 text-[32px] font-semibold tracking-[-0.02em]">{inr(m.boqValue)}</div>
              {Math.abs(m.boqValue - project.contractValue) > 1 && (
                <div className="mt-1 text-[13px] text-orange">Contract value is {inrShort(project.contractValue)} — {m.boqValue > project.contractValue ? "variation not yet in contract" : "BOQ below contract"}</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Pill tone={project.boqLocked ? "green" : "orange"}>
                {project.boqLocked ? <Lock size={12} className="mr-1" /> : <Unlock size={12} className="mr-1" />}V{project.boqVersion} · {project.boqLocked ? "Approved" : "Draft"}
              </Pill>
              {revisions.length > 0 && (
                <button onClick={() => setShowRevs(true)} className="inline-flex items-center gap-1 text-[13px] text-blue">
                  <History size={14} /> {revisions.length} earlier version{revisions.length > 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-[14px] text-[#4a4a55]">Items</div>
          <div className="tnum mt-1 text-[32px] font-semibold">{items.length}</div>
          <div className="text-[13px] text-muted">{m.itemsCompleted} completed</div>
        </Card>
        <Card>
          <div className="text-[14px] text-[#4a4a55]">Completed value</div>
          <div className="tnum mt-1 text-[32px] font-semibold">{inrShort(m.progress * m.boqValue)}</div>
          <ProgressBar value={m.progress} className="mt-2" height={6} />
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 gap-2">
          <div className="flex-1 lg:max-w-xs">
            <SearchInput value={q} onChange={setQ} placeholder="Search BOQ items" />
          </div>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="!h-11 !w-44 shrink-0">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="white" icon={<Download size={15} />} onClick={doExport}>
            Export Excel
          </Button>
          {editable && (
            <>
              <Button size="sm" variant="white" icon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>
                Import Excel
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setImportRows(await parseBOQ(f));
                  e.target.value = "";
                }}
              />
              <Button size="sm" variant="white" icon={<Plus size={15} />} onClick={() => setEditing("new")}>
                Add item
              </Button>
              {items.length > 0 && (
                <Button size="sm" icon={<Lock size={15} />} onClick={lock}>
                  Approve & lock V{project.boqVersion}
                </Button>
              )}
            </>
          )}
          {canCommercial && project.boqLocked && (
            <Button size="sm" variant="soft" icon={<Pencil size={15} />} onClick={() => setReviseOpen(true)}>
              Revise BOQ (V{project.boqVersion + 1})
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <Empty
          title="No BOQ items yet"
          hint="Import your BOQ from Excel (Item No | Description | Qty | Unit | Rate) or add items one by one."
          action={
            editable && (
              <div className="flex gap-2">
                <Button variant="white" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>
                  Import Excel
                </Button>
                <Button icon={<Plus size={16} />} onClick={() => setEditing("new")}>
                  Add item
                </Button>
              </div>
            )
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>Description</Th>
              <Th right>Qty</Th>
              <Th right>Rate</Th>
              <Th right>Amount</Th>
              <Th className="w-40">Completed</Th>
              {editable && <Th />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const p = progById.get(i.id);
              return (
                <tr key={i.id} className="group hover:bg-bg/40">
                  <Td className="whitespace-nowrap">
                    <div className="font-semibold">{i.itemNo}</div>
                    <div className="text-[12px] text-muted">{i.category}</div>
                  </Td>
                  <Td className="min-w-[240px]">
                    {i.description}
                    {i.notes && <div className="text-[12px] text-muted">{i.notes}</div>}
                  </Td>
                  <Td right>
                    {num(i.qty)} <span className="text-muted">{i.unit}</span>
                  </Td>
                  <Td right>{inr(i.rate)}</Td>
                  <Td right className="font-semibold">
                    {inr(i.qty * i.rate)}
                  </Td>
                  <Td>
                    <div className="tnum mb-1 text-[12px] text-muted">
                      {num(p?.approvedQty ?? 0, 1)} / {num(i.qty, 0)}
                    </div>
                    <ProgressBar value={p?.approvedPct ?? 0} height={5} />
                  </Td>
                  {editable && (
                    <Td className="whitespace-nowrap text-right">
                      <IconBtn label="Edit" onClick={() => setEditing(i)}>
                        <Pencil size={15} />
                      </IconBtn>
                      <IconBtn label="Duplicate" onClick={() => add("boqItems", { ...i, id: uid("boq"), itemNo: i.itemNo + "a" }, `Duplicated BOQ item ${i.itemNo}`)}>
                        <Copy size={15} />
                      </IconBtn>
                      <IconBtn
                        label="Delete"
                        onClick={() => {
                          if ((p?.measuredQty ?? 0) > 0) return;
                          remove("boqItems", i.id, `Deleted BOQ item ${i.itemNo} – ${i.description}`);
                        }}
                        disabled={(p?.measuredQty ?? 0) > 0}
                      >
                        <Trash2 size={15} />
                      </IconBtn>
                    </Td>
                  )}
                </tr>
              );
            })}
            <tr>
              <Td colSpan={4} className="font-semibold">
                Total ({filtered.length} items)
              </Td>
              <Td right className="font-semibold">
                {inr(filtered.reduce((a, i) => a + i.qty * i.rate, 0))}
              </Td>
              <Td colSpan={editable ? 2 : 1} />
            </tr>
          </tbody>
        </Table>
      )}

      {project.boqLocked && (
        <p className="mt-3 px-1 text-[13px] text-muted">
          This BOQ is approved and in use. Changes create a new revision so historical measurements and bills stay traceable.
        </p>
      )}

      <ItemSheet projectId={projectId} item={editing} categories={categories} onClose={() => setEditing(null)} />
      <ReviseSheet open={reviseOpen} projectId={projectId} onClose={() => setReviseOpen(false)} />
      <ImportSheet data={importRows} projectId={projectId} onClose={() => setImportRows(null)} />
      <Sheet open={showRevs} onClose={() => setShowRevs(false)} title="BOQ versions">
        <div className="space-y-2">
          <Card className="!p-4">
            <div className="flex justify-between font-semibold">
              <span>V{project.boqVersion} (current)</span>
              <span className="tnum">{inrShort(m.boqValue)}</span>
            </div>
          </Card>
          {revisions.map((r) => (
            <Card key={r.id} className="!p-4">
              <div className="flex justify-between">
                <span className="font-semibold">V{r.version}</span>
                <span className="tnum font-semibold">{inrShort(r.value)}</span>
              </div>
              <div className="text-[13px] text-muted">
                Superseded {fmtDate(r.date)} by {state.users.find((u) => u.id === r.userId)?.name} · {r.items.length} items
              </div>
              <div className="mt-1 text-[14px]">“{r.note}”</div>
            </Card>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={disabled ? "Has measurements – cannot delete" : label} disabled={disabled} className="rounded-full p-2 text-muted hover:bg-bg hover:text-ink disabled:opacity-30">
      {children}
    </button>
  );
}

function ItemSheet({ projectId, item, categories, onClose }: { projectId: string; item: BOQItem | "new" | null; categories: string[]; onClose: () => void }) {
  if (!item) return null;
  return <ItemForm key={item === "new" ? "new" : item.id} projectId={projectId} item={item === "new" ? undefined : item} categories={categories} onClose={onClose} />;
}

function ItemForm({ projectId, item, categories, onClose }: { projectId: string; item?: BOQItem; categories: string[]; onClose: () => void }) {
  const { state, add, patch } = useStore();
  const count = state.boqItems.filter((i) => i.projectId === projectId).length;
  const [f, setF] = useState({
    itemNo: item?.itemNo ?? String(count + 1),
    category: item?.category ?? "RCC",
    description: item?.description ?? "",
    unit: item?.unit ?? "m³",
    qty: (item?.qty ?? "") as number | "",
    rate: (item?.rate ?? "") as number | "",
    notes: item?.notes ?? "",
  });
  const [customUnit, setCustomUnit] = useState(item && !UNITS.includes(item.unit));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    const data = { ...f, qty: Number(f.qty), rate: Number(f.rate), notes: f.notes || undefined };
    if (item) patch("boqItems", item.id, data, `Updated BOQ item ${f.itemNo}`);
    else add("boqItems", { ...data, id: uid("boq"), projectId }, `Added BOQ item ${f.itemNo} – ${f.description}`);
    onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={item ? `Edit item ${item.itemNo}` : "Add BOQ item"}
      footer={
        <Button className="flex-1" size="lg" disabled={!f.description || !f.qty || f.rate === ""} onClick={save}>
          Save · {inr(Number(f.qty || 0) * Number(f.rate || 0))}
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Item number">
          <Input value={f.itemNo} onChange={(e) => set("itemNo", e.target.value)} />
        </Field>
        <Field label="Category">
          <Input list="boq-cats" value={f.category} onChange={(e) => set("category", e.target.value)} />
          <datalist id="boq-cats">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Description" className="col-span-2">
          <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. RCC M25 in slabs" />
        </Field>
        <Field label="Unit">
          {customUnit ? (
            <Input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Custom unit" />
          ) : (
            <Select value={f.unit} onChange={(e) => (e.target.value === "__custom" ? (setCustomUnit(true), set("unit", "")) : set("unit", e.target.value))}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
              <option value="__custom">Custom…</option>
            </Select>
          )}
        </Field>
        <Field label="Quantity">
          <NumInput value={f.qty} onChange={(v) => set("qty", v)} />
        </Field>
        <Field label="Rate (₹)" className="col-span-2">
          <NumInput value={f.rate} onChange={(v) => set("rate", v)} />
        </Field>
        <Field label="Notes" className="col-span-2">
          <Input value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
        </Field>
      </div>
    </Sheet>
  );
}

function ReviseSheet({ open, projectId, onClose }: { open: boolean; projectId: string; onClose: () => void }) {
  const { state, user, update } = useStore();
  const [note, setNote] = useState("");
  const project = state.projects.find((p) => p.id === projectId)!;
  const start = () => {
    update((s) => {
      const p = s.projects.find((x) => x.id === projectId)!;
      const items = s.boqItems.filter((i) => i.projectId === projectId).map((i) => ({ ...i }));
      s.boqRevisions.unshift({ id: uid("rev"), projectId, version: p.boqVersion, date: todayISO(), userId: user!.id, note, value: items.reduce((a, i) => a + i.qty * i.rate, 0), items });
      s.audit.unshift({ id: uid("aud"), at: new Date().toISOString(), userId: user!.id, entity: "BOQ", entityId: projectId, projectId, action: "updated", summary: `Started BOQ revision V${p.boqVersion + 1}: ${note}`, changes: [{ field: "version", from: `V${p.boqVersion}`, to: `V${p.boqVersion + 1}` }] });
      p.boqVersion += 1;
      p.boqLocked = false;
    });
    setNote("");
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={`Create BOQ V${project.boqVersion + 1}`} footer={<Button className="flex-1" size="lg" disabled={!note} onClick={start}>Snapshot V{project.boqVersion} & start revision</Button>}>
      <p className="mb-4 text-[14px] text-[#4a4a55]">
        V{project.boqVersion} will be saved as a read-only snapshot. You can then edit items, and approve V{project.boqVersion + 1} when done. Measurements and bills keep pointing to the same items.
      </p>
      <Field label="Reason for revision">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Client added terrace waterproofing (variation #3)" />
      </Field>
    </Sheet>
  );
}

function ImportSheet({ data, projectId, onClose }: { data: { rows: ImportedBOQRow[]; skipped: number } | null; projectId: string; onClose: () => void }) {
  const { user, update } = useStore();
  if (!data) return null;
  const total = data.rows.reduce((a, r) => a + r.qty * r.rate, 0);
  const doImport = (replace: boolean) => {
    update((s) => {
      if (replace) s.boqItems = s.boqItems.filter((i) => i.projectId !== projectId);
      for (const r of data.rows) s.boqItems.push({ ...r, id: uid("boq"), projectId });
      s.audit.unshift({ id: uid("aud"), at: new Date().toISOString(), userId: user!.id, entity: "BOQ", entityId: projectId, projectId, action: "created", summary: `Imported ${data.rows.length} BOQ items from Excel (${inrShort(total)})` });
    });
    onClose();
  };
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={`Import ${data.rows.length} items`}
      footer={
        <>
          <Button variant="white" className="flex-1" onClick={() => doImport(false)} disabled={!data.rows.length}>
            Append to BOQ
          </Button>
          <Button className="flex-1" onClick={() => doImport(true)} disabled={!data.rows.length}>
            Replace BOQ
          </Button>
        </>
      }
    >
      <p className="mb-3 text-[14px] text-muted">
        Total {inr(total)}
        {data.skipped > 0 && ` · ${data.skipped} rows skipped (missing description/qty/rate)`}
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th>Category</Th>
            <Th>Description</Th>
            <Th right>Qty</Th>
            <Th right>Rate</Th>
          </tr>
        </thead>
        <tbody>
          {data.rows.slice(0, 100).map((r, i) => (
            <tr key={i}>
              <Td>{r.itemNo}</Td>
              <Td>{r.category}</Td>
              <Td>{r.description}</Td>
              <Td right>
                {num(r.qty)} {r.unit}
              </Td>
              <Td right>{inr(r.rate)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Sheet>
  );
}
