"use client";

import { useState } from "react";
import { Camera, ImageIcon, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, fmtDay, todayISO } from "@/lib/format";
import { PHOTO_CATEGORIES, type Attachment, type IssueStatus } from "@/lib/types";
import { Avatar, Button, Card, Empty, Pill, Segmented, Sheet, cx } from "../ui";
import { useShell } from "../AppShell";
import { AttachmentLink } from "./Procurement";

export function FilesTab({ projectId }: { projectId: string }) {
  const { state } = useStore();
  const { openAdd } = useShell();
  const [cat, setCat] = useState("All");
  const [view, setView] = useState<string | null>(null);
  const photos = state.photos.filter((p) => p.projectId === projectId && (cat === "All" || p.category === cat));
  const docs: { label: string; date: string; a: Attachment }[] = [];
  const name = (id: string) => state.materials.find((m) => m.id === id)?.name;
  for (const q of state.quotations) if (q.projectId === projectId && q.attachment) docs.push({ label: `Quotation · ${name(q.materialId)}`, date: q.createdAt, a: q.attachment });
  for (const p of state.pos) if (p.projectId === projectId && p.attachment) docs.push({ label: `${p.no}`, date: p.createdAt, a: p.attachment });
  for (const r of state.receipts) if (r.projectId === projectId && r.attachment) docs.push({ label: `Challan · ${name(r.materialId)}`, date: r.date, a: r.attachment });
  for (const m of state.measurements) if (m.projectId === projectId && m.attachment) docs.push({ label: `Measurement sheet`, date: m.date, a: m.attachment });
  for (const b of state.bills) if (b.projectId === projectId && b.attachment) docs.push({ label: `Bill ${b.no}`, date: b.date, a: b.attachment });
  for (const e of state.expenses) if (e.projectId === projectId && e.attachment) docs.push({ label: `Expense · ${e.description}`, date: e.date, a: e.attachment });
  const viewing = state.photos.find((p) => p.id === view);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Segmented value={cat} onChange={setCat} options={["All", ...PHOTO_CATEGORIES].map((c) => ({ value: c, label: c }))} />
        <Button size="sm" icon={<Camera size={15} />} onClick={() => openAdd("photo", projectId)} className="shrink-0">
          Photo
        </Button>
      </div>
      {photos.length === 0 ? (
        <Empty icon={<ImageIcon size={28} />} title="No photos" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {photos.map((p) => (
            <button key={p.id} onClick={() => setView(p.id)} className="group overflow-hidden rounded-[22px] bg-card text-left">
              <PhotoThumb src={p.src} category={p.category} />
              <div className="p-3">
                <div className="truncate text-[14px] font-medium">{p.description ?? p.category}</div>
                <div className="text-[12px] text-muted">
                  {fmtDay(p.date)} · {p.category}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <h3 className="mb-3 mt-8 px-1 text-[19px] font-semibold">Documents</h3>
      <Card className="divide-y divide-line !py-1">
        {docs.length === 0 && <div className="py-5 text-center text-[14px] text-muted">Quotations, POs, challans, measurement sheets and bills you attach appear here.</div>}
        {docs.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-3">
            <div>
              <div className="font-medium">{d.label}</div>
              <div className="text-[12px] text-muted">{fmtDate(d.date)}</div>
            </div>
            <AttachmentLink a={d.a} />
          </div>
        ))}
      </Card>
      <Sheet open={!!viewing} onClose={() => setView(null)} title={viewing?.description ?? viewing?.category ?? ""} wide>
        {viewing && (
          <div>
            <PhotoThumb src={viewing.src} category={viewing.category} large />
            <div className="mt-3 text-[14px] text-muted">
              {fmtDate(viewing.date)} · {viewing.category} · by {state.users.find((u) => u.id === viewing.createdBy)?.name}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function PhotoThumb({ src, category, large }: { src?: string; category: string; large?: boolean }) {
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={category} className={cx("w-full object-cover", large ? "max-h-[70vh] rounded-2xl" : "aspect-[4/3]")} />;
  const hue = { Progress: "from-blue-soft to-blue-softer", Material: "from-orange-soft to-[#fff7ee]", Quality: "from-green-soft to-[#f2fbf6]", Issue: "from-red-soft to-[#fff4f4]" }[category] ?? "from-[#e9e9ee] to-[#f5f5f8]";
  return (
    <div className={cx("flex w-full items-center justify-center bg-gradient-to-br text-ink/30", hue, large ? "aspect-video rounded-2xl" : "aspect-[4/3]")}>
      <svg viewBox="0 0 64 40" className="w-1/2" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 36h56M10 36V18l10-6 10 6v18M34 36V10h20v26M38 16h4M46 16h4M38 22h4M46 22h4M38 28h4M46 28h4M16 36v-8h8v8" />
      </svg>
    </div>
  );
}

export function IssuesTab({ projectId }: { projectId: string }) {
  const { state, patch } = useStore();
  const { openAdd } = useShell();
  const [filter, setFilter] = useState<"open" | "all">("open");
  const issues = state.issues.filter((i) => i.projectId === projectId && (filter === "all" || i.status !== "Resolved")).sort((a, b) => b.no - a.no);
  const next: Record<IssueStatus, IssueStatus | null> = { Open: "In progress", "In progress": "Resolved", Resolved: null };
  const today = todayISO();
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Open" },
            { value: "all", label: "All" },
          ]}
        />
        <Button size="sm" icon={<Plus size={15} />} onClick={() => openAdd("issue", projectId)}>
          Issue
        </Button>
      </div>
      <div className="space-y-2">
        {issues.length === 0 && <Empty title="No open issues" />}
        {issues.map((i) => (
          <Card key={i.id} className="!p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-muted">ISSUE #{String(i.no).padStart(3, "0")}</div>
                <div className="text-[16px] font-semibold">{i.title}</div>
                <div className="mt-0.5 text-[14px] text-[#5a5a66]">{i.description}</div>
                <div className={cx("mt-1 text-[13px]", i.dueDate < today && i.status !== "Resolved" ? "text-red" : "text-muted")}>
                  {i.responsible} · due {fmtDay(i.dueDate)} · raised by {state.users.find((u) => u.id === i.createdBy)?.name}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill>{i.severity}</Pill>
                <Pill>{i.status}</Pill>
                {next[i.status] && (
                  <Button size="sm" variant="soft" onClick={() => patch("issues", i.id, { status: next[i.status]! })}>
                    {next[i.status] === "Resolved" ? "Resolve" : "Start"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function HistoryTab({ projectId }: { projectId?: string }) {
  const { state } = useStore();
  const entries = state.audit.filter((a) => !projectId || a.projectId === projectId).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 150);
  return (
    <Card className="divide-y divide-line !py-1">
      {entries.length === 0 && <div className="py-6 text-center text-muted">No changes recorded yet.</div>}
      {entries.map((e) => {
        const u = state.users.find((x) => x.id === e.userId);
        return (
          <div key={e.id} className="flex gap-3 py-3.5">
            <Avatar name={u?.name ?? "System"} className="h-9 w-9 text-[12px]" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px]">
                <b className="font-semibold">{u?.name ?? "System"}</b> {e.summary.charAt(0).toLowerCase() + e.summary.slice(1)}
              </div>
              {e.changes && e.changes.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {e.changes.map((c, i) => (
                    <span key={i} className="rounded-lg bg-bg px-2 py-1 text-[12px]">
                      {c.field}: <span className="text-muted line-through">{c.from}</span> → <b>{c.to}</b>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-0.5 text-[12px] text-muted">
                {e.entity} · {fmtDate(e.at.slice(0, 10))} {e.at.slice(11, 16)}
                {!projectId && e.projectId && ` · ${state.projects.find((p) => p.id === e.projectId)?.name ?? ""}`}
              </div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
