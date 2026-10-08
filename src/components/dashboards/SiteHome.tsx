"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { useStore, useVisibleProjects } from "@/lib/store";
import { getMetrics, poReceived } from "@/lib/calc";
import { fmtDay, num, pct, todayISO } from "@/lib/format";
import { Card, IconBubble, PageHeader, Pill, ProgressBar, SectionHeader, cx } from "../ui";
import { useShell } from "../AppShell";
import { ACTIONS } from "../forms/AddSheet";

/** Site engineer home: quick actions first, dashboards second. */
export function SiteHome() {
  const { state, user } = useStore();
  const { openAdd } = useShell();
  const projects = useVisibleProjects().filter((p) => p.status === "Active");
  const [pid, setPid] = useState(projects[0]?.id ?? "");
  const project = projects.find((p) => p.id === pid);
  if (!project) return <PageHeader title="Today" subtitle="No active site assigned to you yet." />;

  const today = todayISO();
  const m = getMetrics(state, pid);
  const todayReport = state.reports.find((r) => r.projectId === pid && r.date === today);
  const workDone = todayReport?.work.length ?? 0;
  const receivedToday = state.receipts.filter((r) => r.projectId === pid && r.date === today).length;
  const openPOs = state.pos.filter((p) => p.projectId === pid && ["Ordered", "Partially received", "Approved"].includes(p.status));
  const myRequests = state.requests.filter((r) => r.projectId === pid && r.createdBy === user?.id).slice(0, 4);
  const issues = state.issues.filter((i) => i.projectId === pid && i.status !== "Resolved");
  const inProgress = m.items.filter((p) => p.pct > 0 && p.pct < 1);

  return (
    <div>
      <PageHeader title={`Today — ${project.name.split("–")[0].trim()}`} subtitle={fmtDay(today)} />
      {projects.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
          {projects.map((p) => (
            <button key={p.id} onClick={() => setPid(p.id)} className={cx("h-10 shrink-0 rounded-full px-4 text-[14px] font-medium", p.id === pid ? "bg-ink text-white" : "bg-white text-[#4a4a55]")}>
              {p.name.split("–")[0].trim()}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card className="!p-4">
          <div className="text-[13px] text-muted">Workers</div>
          <div className="tnum mt-1 text-[28px] font-semibold">{m.workersToday}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[13px] text-muted">Work items</div>
          <div className="tnum mt-1 text-[28px] font-semibold">{workDone}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[13px] text-muted">Received</div>
          <div className="tnum mt-1 text-[28px] font-semibold">{receivedToday}</div>
        </Card>
      </div>

      <div
        className={cx(
          "mt-3 flex items-center gap-3 rounded-[var(--radius-card)] px-5 py-4 text-[15px]",
          todayReport ? "bg-green-soft text-green" : "bg-gradient-to-r from-blue to-blue-2 text-white",
        )}
      >
        {todayReport ? <CheckCircle2 size={20} /> : <Clock size={20} />}
        <span className="flex-1">{todayReport ? "Today's daily report is submitted" : "Today's daily report is pending"}</span>
        {!todayReport && (
          <button onClick={() => openAdd("report", pid)} className="rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-blue">
            Fill now
          </button>
        )}
      </div>

      <SectionHeader title="Quick add" />
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-card">
        {ACTIONS.map((a, i) => (
          <button key={a.key} onClick={() => openAdd(a.key, pid)} className={cx("flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-bg/60", i > 0 && "border-t border-line")}>
            <IconBubble tone={a.key === "report" ? "blue" : a.key === "issue" ? "red" : "soft"}>{a.icon}</IconBubble>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-semibold">{a.label}</div>
              <div className="text-[13px] text-muted">{a.hint}</div>
            </div>
            <span className="rounded-full bg-bg px-3 py-1.5 text-[13px] font-semibold">+ Add</span>
          </button>
        ))}
      </div>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <div>
          <SectionHeader title="Deliveries expected" href={`/projects/${pid}?tab=procurement`} />
          <div className="space-y-2">
            {openPOs.length === 0 && <Card className="text-[14px] text-muted">No pending deliveries.</Card>}
            {openPOs.slice(0, 4).map((po) => {
              const mat = state.materials.find((x) => x.id === po.materialId);
              const rec = poReceived(state, po.id);
              const late = po.expectedDate < today;
              return (
                <Card key={po.id} as="button" onClick={() => openAdd("receipt", pid)} className="flex w-full items-center gap-3 !p-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{mat?.name}</div>
                    <div className="text-[13px] text-muted">
                      {po.no} · {num(po.qty - rec)} {mat?.unit} pending
                    </div>
                  </div>
                  <Pill tone={late ? "red" : "blue"}>{late ? "Late" : fmtDay(po.expectedDate)}</Pill>
                  <ChevronRight size={18} className="text-muted" />
                </Card>
              );
            })}
          </div>

          <SectionHeader title="Open issues" href={`/projects/${pid}?tab=issues`} />
          <div className="space-y-2">
            {issues.length === 0 && <Card className="text-[14px] text-muted">No open issues.</Card>}
            {issues.map((i) => (
              <Card key={i.id} className="!p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">
                    #{String(i.no).padStart(3, "0")} {i.title}
                  </div>
                  <Pill>{i.severity}</Pill>
                </div>
                <div className="mt-1 text-[13px] text-muted">
                  {i.responsible} · due {fmtDay(i.dueDate)} · {i.status}
                </div>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Work in progress" href={`/projects/${pid}?tab=measurements`} />
          <Card className="space-y-4">
            {inProgress.slice(0, 6).map((p) => (
              <div key={p.item.id}>
                <div className="mb-1.5 flex justify-between gap-3 text-[14px]">
                  <span className="truncate">
                    <b className="font-semibold">{p.item.category}</b> <span className="text-muted">{p.item.itemNo}</span>
                  </span>
                  <span className="tnum shrink-0 text-muted">
                    {num(p.measuredQty, 0)} / {num(p.item.qty, 0)} {p.item.unit}
                  </span>
                </div>
                <ProgressBar value={p.pct} height={6} />
              </div>
            ))}
            {inProgress.length === 0 && <div className="text-[14px] text-muted">No items in progress.</div>}
            <div className="text-[13px] text-muted">Overall progress {pct(m.progress, 0)}</div>
          </Card>

          <SectionHeader title="My material requests" />
          <div className="space-y-2">
            {myRequests.length === 0 && <Card className="text-[14px] text-muted">No requests yet.</Card>}
            {myRequests.map((r) => (
              <Card key={r.id} className="flex items-center justify-between gap-3 !p-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    {state.materials.find((x) => x.id === r.materialId)?.name} · {num(r.qty)}
                  </div>
                  <div className="text-[13px] text-muted">
                    {r.no} · needed {fmtDay(r.requiredDate)}
                  </div>
                </div>
                <Pill>{r.status}</Pill>
              </Card>
            ))}
          </div>
          <Link href={`/projects/${pid}`} className="mt-4 block text-center text-[14px] font-medium text-blue">
            Open full project →
          </Link>
        </div>
      </div>
    </div>
  );
}
