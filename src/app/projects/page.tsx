"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { can, useStore, useVisibleProjects } from "@/lib/store";
import { getMetrics, projectHealth } from "@/lib/calc";
import { fmtDate, inrShort, pct } from "@/lib/format";
import { Card, HealthDot, PageHeader, Pill, ProgressBar, RoundButton, SearchInput, Segmented, cx } from "@/components/ui";
import { ProjectForm } from "@/components/project/ProjectForm";

function ProjectsInner() {
  const { state, role } = useStore();
  const projects = useVisibleProjects();
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "Active" | "Planning" | "Other">("all");
  const creating = params.get("new") === "1";

  const list = projects
    .filter((p) => (status === "all" ? true : status === "Other" ? !["Active", "Planning"].includes(p.status) : p.status === status))
    .filter((p) => (p.name + p.clientName + p.code).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} projects · ${projects.filter((p) => p.status === "Active").length} active`}
        actions={can(role, "editCommercial") && <RoundButton kind="plus" label="New project" onClick={() => router.push("/projects?new=1")} />}
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:w-80">
          <SearchInput value={q} onChange={setQ} placeholder="Search projects or clients" />
        </div>
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All" },
            { value: "Active", label: "Active" },
            { value: "Planning", label: "Planning" },
            { value: "Other", label: "On hold / closed" },
          ]}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => {
          const m = getMetrics(state, p.id);
          const h = projectHealth(m);
          return (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="flex h-full flex-col transition hover:shadow-[0_6px_24px_rgba(10,10,40,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium uppercase tracking-wide text-muted">
                      {p.code} · {p.type}
                    </div>
                    <div className="mt-1 text-[18px] font-semibold leading-snug">{p.name}</div>
                    <div className="mt-1 flex items-center gap-1 text-[13px] text-muted">
                      <MapPin size={13} /> <span className="truncate">{p.address}</span>
                    </div>
                  </div>
                  <Pill>{p.status}</Pill>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[13px] text-muted">Contract</div>
                    <div className="tnum text-[20px] font-semibold">{inrShort(m.contract)}</div>
                  </div>
                  <div>
                    <div className="text-[13px] text-muted">Forecast profit</div>
                    <div className="tnum flex items-center gap-2 text-[20px] font-semibold">
                      {inrShort(m.forecastProfit)} {p.status === "Active" && <HealthDot health={h} />}
                    </div>
                    <div className={cx("text-[12px]", m.forecastMargin < m.baseline.margin - 0.015 ? "text-red" : "text-muted")}>
                      {pct(m.forecastMargin)} margin
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-5">
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-muted">Progress</span>
                    <span className="tnum font-medium">{pct(m.progress, 0)}</span>
                  </div>
                  <ProgressBar value={m.progress} height={6} />
                  <div className="mt-3 text-[12px] text-muted">
                    {fmtDate(p.startDate)} → {fmtDate(p.endDate)} · PM {state.users.find((u) => u.id === p.pmId)?.name}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
      <ProjectForm open={creating} onClose={() => router.replace("/projects")} />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsInner />
    </Suspense>
  );
}
