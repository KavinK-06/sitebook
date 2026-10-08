"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { TRADE_LIST, TRADE_WAGES } from "@/lib/seed";
import { inr, todayISO, uid } from "@/lib/format";
import { getMetrics } from "@/lib/calc";
import type { DailyReport, Photo } from "@/lib/types";
import { Button, Chips, Field, Input, NumInput, Select, Stepper, Textarea, cx, readAttachment } from "../ui";

type Row<T> = T & { key: string };
interface Draft {
  date: string;
  weather: string;
  labour: Row<{ trade: string; count: number; wage: number }>[];
  work: Row<{ boqItemId: string; qty: number | "" }>[];
  consumed: Row<{ materialId: string; qty: number | ""; boqItemId: string }>[];
  equipment: Row<{ name: string; hours: number | ""; cost: number | "" }>[];
  issues: string;
  delays: string;
  makeMeasurements: boolean;
}

const WEATHER = ["Sunny", "Cloudy", "Light rain", "Heavy rain", "Hot & humid"] as const;
const k = () => Math.random().toString(36).slice(2, 8);

export function DailyReportForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const { state, user, update } = useStore();
  const draftKey = `sitebook-draft-report-${projectId}`;
  const items = state.boqItems.filter((i) => i.projectId === projectId);
  const metrics = getMetrics(state, projectId);
  const materials = useMemo(() => {
    const ids = new Set(metrics.materials.map((m) => m.materialId));
    return state.materials.filter((m) => ids.has(m.id)).concat(state.materials.filter((m) => !ids.has(m.id)));
  }, [state.materials, metrics.materials]);

  // Prefill labour from the most recent report so a typical day is a few taps.
  const lastLabour = useMemo(() => {
    const last = state.reports.filter((r) => r.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!last) return [];
    return state.labour.filter((l) => l.reportId === last.id).map((l) => ({ key: k(), trade: l.trade, count: l.count, wage: l.wage }));
  }, [state.reports, state.labour, projectId]);

  const fresh = (): Draft => ({
    date: todayISO(),
    weather: "Sunny",
    labour: lastLabour.length ? lastLabour : [{ key: k(), trade: "Mason", count: 0, wage: TRADE_WAGES.Mason }, { key: k(), trade: "Helper", count: 0, wage: TRADE_WAGES.Helper }],
    work: [{ key: k(), boqItemId: "", qty: "" }],
    consumed: [{ key: k(), materialId: "", qty: "", boqItemId: "" }],
    equipment: [],
    issues: "",
    delays: "",
    makeMeasurements: true,
  });

  const [d, setD] = useState<Draft>(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) return JSON.parse(raw) as Draft;
    } catch {}
    return fresh();
  });
  const [photos, setPhotos] = useState<{ key: string; src: string }[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasDraft] = useState(() => {
    try {
      return !!localStorage.getItem(draftKey);
    } catch {
      return false;
    }
  });

  // auto-save draft (works offline / weak network)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(d));
        setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [d, draftKey]);

  const set = <K extends keyof Draft>(key: K, v: Draft[K]) => setD((x) => ({ ...x, [key]: v }));
  const setRow = <K extends "labour" | "work" | "consumed" | "equipment">(key: K, rk: string, patch: Partial<Draft[K][number]>) =>
    setD((x) => ({ ...x, [key]: (x[key] as Row<object>[]).map((r) => (r.key === rk ? { ...r, ...patch } : r)) }));
  const delRow = (key: "labour" | "work" | "consumed" | "equipment", rk: string) =>
    setD((x) => ({ ...x, [key]: (x[key] as Row<object>[]).filter((r) => r.key !== rk) }));

  const labourCost = d.labour.reduce((a, l) => a + l.count * l.wage, 0);
  const workers = d.labour.reduce((a, l) => a + l.count, 0);
  const valid = workers > 0 || d.work.some((w) => w.boqItemId && Number(w.qty) > 0);
  const already = state.reports.some((r) => r.projectId === projectId && r.date === d.date);

  const submit = () => {
    const reportId = uid("dr");
    const report: DailyReport = {
      id: reportId,
      projectId,
      date: d.date,
      weather: d.weather,
      work: d.work.filter((w) => w.boqItemId && Number(w.qty) > 0).map((w) => ({ boqItemId: w.boqItemId, qty: Number(w.qty) })),
      equipment: d.equipment.filter((e) => e.name && Number(e.cost) > 0).map((e) => ({ name: e.name, hours: Number(e.hours) || 0, cost: Number(e.cost) })),
      issues: d.issues || undefined,
      delays: d.delays || undefined,
      createdBy: user!.id,
      createdAt: new Date().toISOString(),
    };
    update((s) => {
      s.reports.unshift(report);
      for (const l of d.labour) if (l.count > 0) s.labour.unshift({ id: uid("lab"), projectId, reportId, date: d.date, trade: l.trade, count: l.count, wage: l.wage });
      // On phones the BOQ picker for consumption is hidden; default it to the single work item reported.
      const defaultItem = report.work.length === 1 ? report.work[0].boqItemId : undefined;
      for (const c of d.consumed)
        if (c.materialId && Number(c.qty) > 0)
          s.consumption.unshift({ id: uid("con"), projectId, reportId, date: d.date, materialId: c.materialId, qty: Number(c.qty), boqItemId: c.boqItemId || defaultItem });
      if (d.makeMeasurements)
        for (const w of report.work)
          s.measurements.unshift({ id: uid("ms"), projectId, boqItemId: w.boqItemId, date: d.date, qty: w.qty, status: "Submitted", description: "From daily report", createdBy: user!.id });
      for (const p of photos)
        s.photos.unshift({ id: uid("pho"), projectId, date: d.date, category: "Progress", description: "Daily report photo", src: p.src, createdBy: user!.id } satisfies Photo);
    });
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    onDone();
  };

  return (
    <div className="space-y-6">
      {hasDraft && (
        <div className="flex items-center justify-between rounded-2xl bg-blue-softer px-4 py-3 text-[13px] text-blue">
          Restored your unsent draft.
          <button className="font-semibold" onClick={() => setD(fresh())}>
            Start fresh
          </button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" hint={already ? "A report already exists for this date — this adds another." : undefined}>
          <Input type="date" value={d.date} max={todayISO()} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Weather">
          <Chips value={d.weather as (typeof WEATHER)[number]} onChange={(v) => set("weather", v)} options={WEATHER} />
        </Field>
      </div>

      {/* Labour */}
      <Section title="Labour" right={<span className="tnum text-[14px] text-muted">{workers} workers · {inr(labourCost)}</span>}>
        {d.labour.map((l) => (
          <div key={l.key} className="grid grid-cols-[1fr_140px_36px] items-center gap-2 sm:grid-cols-[1fr_150px_110px_36px]">
            <Select value={l.trade} onChange={(e) => setRow("labour", l.key, { trade: e.target.value, wage: TRADE_WAGES[e.target.value] ?? l.wage })}>
              {TRADE_LIST.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <Stepper value={l.count} onChange={(v) => setRow("labour", l.key, { count: v })} />
            <div className="hidden sm:block">
              <NumInput aria-label="Daily wage" value={l.wage} onChange={(v) => setRow("labour", l.key, { wage: Number(v) || 0 })} />
            </div>
            <DelBtn onClick={() => delRow("labour", l.key)} />
          </div>
        ))}
        <AddRow onClick={() => set("labour", [...d.labour, { key: k(), trade: "Carpenter", count: 0, wage: TRADE_WAGES.Carpenter }])}>Add trade</AddRow>
      </Section>

      {/* Work completed */}
      <Section title="Work completed">
        {d.work.map((w) => {
          const it = items.find((i) => i.id === w.boqItemId);
          return (
            <div key={w.key} className="grid grid-cols-[1fr_120px_36px] items-center gap-2">
              <Select value={w.boqItemId} onChange={(e) => setRow("work", w.key, { boqItemId: e.target.value })}>
                <option value="">Select BOQ item…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.itemNo} · {i.category} — {i.description.slice(0, 40)}
                  </option>
                ))}
              </Select>
              <NumInput placeholder={it ? it.unit : "Qty"} value={w.qty} onChange={(v) => setRow("work", w.key, { qty: v })} />
              <DelBtn onClick={() => delRow("work", w.key)} />
            </div>
          );
        })}
        <AddRow onClick={() => set("work", [...d.work, { key: k(), boqItemId: "", qty: "" }])}>Add work item</AddRow>
        <label className="flex items-center gap-2 px-1 pt-1 text-[13px] text-[#4a4a55]">
          <input type="checkbox" checked={d.makeMeasurements} onChange={(e) => set("makeMeasurements", e.target.checked)} className="h-4 w-4 accent-[var(--blue)]" />
          Also submit these quantities as measurements for approval
        </label>
      </Section>

      {/* Material consumed */}
      <Section title="Material consumed">
        {d.consumed.map((c) => {
          const mat = materials.find((m) => m.id === c.materialId);
          return (
            <div key={c.key} className="grid grid-cols-[1fr_110px_36px] items-center gap-2 sm:grid-cols-[1fr_1fr_110px_36px]">
              <Select value={c.materialId} onChange={(e) => setRow("consumed", c.key, { materialId: e.target.value })}>
                <option value="">Material…</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <Select className="hidden sm:block" value={c.boqItemId} onChange={(e) => setRow("consumed", c.key, { boqItemId: e.target.value })}>
                <option value="">For BOQ item…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.itemNo} · {i.category}
                  </option>
                ))}
              </Select>
              <NumInput placeholder={mat?.unit ?? "Qty"} value={c.qty} onChange={(v) => setRow("consumed", c.key, { qty: v })} />
              <DelBtn onClick={() => delRow("consumed", c.key)} />
            </div>
          );
        })}
        <AddRow onClick={() => set("consumed", [...d.consumed, { key: k(), materialId: "", qty: "", boqItemId: "" }])}>Add material</AddRow>
      </Section>

      {/* Equipment */}
      <Section title="Equipment used">
        {d.equipment.map((e) => (
          <div key={e.key} className="grid grid-cols-[1fr_80px_110px_36px] items-center gap-2">
            <Input placeholder="e.g. JCB, mixer" value={e.name} onChange={(ev) => setRow("equipment", e.key, { name: ev.target.value })} />
            <NumInput placeholder="hrs" value={e.hours} onChange={(v) => setRow("equipment", e.key, { hours: v })} />
            <NumInput placeholder="₹ cost" value={e.cost} onChange={(v) => setRow("equipment", e.key, { cost: v })} />
            <DelBtn onClick={() => delRow("equipment", e.key)} />
          </div>
        ))}
        <AddRow onClick={() => set("equipment", [...d.equipment, { key: k(), name: "", hours: "", cost: "" }])}>Add equipment</AddRow>
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Issues">
          <Textarea placeholder="Anything blocking work?" value={d.issues} onChange={(e) => set("issues", e.target.value)} />
        </Field>
        <Field label="Delays">
          <Textarea placeholder="e.g. Rain stopped work 2 hrs" value={d.delays} onChange={(e) => set("delays", e.target.value)} />
        </Field>
      </div>

      <Section title="Photos">
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.key} className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" className="h-full w-full object-cover" />
              <button onClick={() => setPhotos((x) => x.filter((y) => y.key !== p.key))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white" aria-label="Remove photo">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl bg-white text-[12px] text-muted hover:text-ink">
            <Camera size={20} />
            Add
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = [...(e.target.files ?? [])];
                for (const f of files) {
                  const a = await readAttachment(f);
                  if (a.dataUrl) setPhotos((x) => [...x, { key: k(), src: a.dataUrl! }]);
                }
              }}
            />
          </label>
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t border-line bg-bg px-5 pb-1 pt-4">
        <span className="hidden flex-1 items-center gap-1.5 text-[12px] text-muted sm:flex">
          {savedAt && (
            <>
              <CheckCircle2 size={14} className="text-green" /> Draft saved on this device at {savedAt}
            </>
          )}
        </span>
        <Button variant="white" onClick={onDone} className="flex-1 sm:flex-none">
          Save draft & close
        </Button>
        <Button onClick={submit} disabled={!valid} className="flex-1 sm:flex-none">
          Submit report
        </Button>
      </div>
    </div>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <h4 className="text-[15px] font-semibold">{title}</h4>
        {right}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove row" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-white hover:text-red">
      <Trash2 size={16} />
    </button>
  );
}

function AddRow({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-blue hover:bg-blue-softer")}>
      <Plus size={15} /> {children}
    </button>
  );
}
