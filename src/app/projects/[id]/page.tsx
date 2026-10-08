"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { can, useStore } from "@/lib/store";
import { getAlerts } from "@/lib/alerts";
import { getMetrics } from "@/lib/calc";
import { Empty, Pill, RoundButton, Segmented } from "@/components/ui";
import { useShell } from "@/components/AppShell";
import { ProjectForm } from "@/components/project/ProjectForm";
import { Overview } from "@/components/project/Overview";
import { BOQTab } from "@/components/project/BOQ";
import { EstimateTab } from "@/components/project/Estimate";
import { ProcurementBoard } from "@/components/project/Procurement";
import { SiteTab } from "@/components/project/Site";
import { MeasurementsTab } from "@/components/project/Measurements";
import { BillingTab } from "@/components/project/Billing";
import { CostsTab } from "@/components/project/Costs";
import { ForecastTab } from "@/components/project/Forecast";
import { FilesTab, HistoryTab, IssuesTab } from "@/components/project/Misc";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "boq", label: "BOQ" },
  { value: "estimate", label: "Estimate" },
  { value: "procurement", label: "Procurement" },
  { value: "site", label: "Site" },
  { value: "measurements", label: "Measurements" },
  { value: "billing", label: "Billing" },
  { value: "costs", label: "Costs" },
  { value: "forecast", label: "Forecast" },
  { value: "files", label: "Photos & files" },
  { value: "issues", label: "Issues" },
  { value: "history", label: "History" },
] as const;
type Tab = (typeof TABS)[number]["value"];

function ProjectInner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { state, role } = useStore();
  const { openAdd } = useShell();
  const [editing, setEditing] = useState(false);
  const project = state.projects.find((p) => p.id === id);
  if (!project) return <Empty title="Project not found" action={<Link href="/projects" className="text-blue">Back to projects</Link>} />;

  const tab = (TABS.some((t) => t.value === params.get("tab")) ? params.get("tab") : "overview") as Tab;
  const setTab = (t: Tab) => router.replace(`/projects/${id}${t === "overview" ? "" : `?tab=${t}`}`, { scroll: false });
  const m = getMetrics(state, id);
  const alerts = getAlerts(state).filter((a) => a.projectId === id);

  const counts: Partial<Record<Tab, number>> = {
    procurement: m.pendingRequests + m.delayedPOs.length,
    measurements: m.pendingMeasurements,
    issues: m.openIssues,
    billing: m.overdueBills.length,
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/projects" className="mb-3 inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink">
            <ArrowLeft size={16} /> Projects
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] md:text-[32px]">{project.name}</h1>
            <Pill>{project.status}</Pill>
          </div>
          <div className="mt-1 text-[14px] text-muted">
            {project.code} · {project.clientName} · {project.contractType}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-8">
          {can(role, "editCommercial") && (
            <button onClick={() => setEditing(true)} aria-label="Edit project" title="Edit project" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white hover:bg-white/70">
              <Pencil size={18} />
            </button>
          )}
          {role !== "finance" && <RoundButton kind="plus" label="Add entry" onClick={() => openAdd(undefined, id)} />}
        </div>
      </div>

      <Segmented
        className="mb-6"
        value={tab}
        onChange={setTab}
        options={TABS.map((t) => ({ ...t, count: counts[t.value] }))}
      />

      {tab === "overview" && <Overview projectId={id} alerts={alerts} onTab={(t) => setTab(t as Tab)} />}
      {tab === "boq" && <BOQTab projectId={id} />}
      {tab === "estimate" && <EstimateTab projectId={id} />}
      {tab === "procurement" && <ProcurementBoard projectId={id} />}
      {tab === "site" && <SiteTab projectId={id} />}
      {tab === "measurements" && <MeasurementsTab projectId={id} />}
      {tab === "billing" && <BillingTab projectId={id} />}
      {tab === "costs" && <CostsTab projectId={id} />}
      {tab === "forecast" && <ForecastTab projectId={id} />}
      {tab === "files" && <FilesTab projectId={id} />}
      {tab === "issues" && <IssuesTab projectId={id} />}
      {tab === "history" && <HistoryTab projectId={id} />}

      <ProjectForm open={editing} onClose={() => setEditing(false)} project={project} />
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense>
      <ProjectInner />
    </Suspense>
  );
}
