"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore, useVisibleProjects } from "@/lib/store";
import { fmtDate, inrShort, num } from "@/lib/format";
import { Card, PageHeader, Pill, SearchInput } from "@/components/ui";

interface Hit {
  kind: string;
  title: string;
  sub: string;
  href: string;
  date?: string;
}

export default function SearchPage() {
  const { state } = useStore();
  const projects = useVisibleProjects();
  const [q, setQ] = useState("");
  const hits = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const ids = new Set(projects.map((p) => p.id));
    const pname = (id: string) => state.projects.find((p) => p.id === id)?.name ?? "";
    const mat = (id: string) => state.materials.find((m) => m.id === id)?.name ?? "";
    const ven = (id: string) => state.vendors.find((v) => v.id === id)?.name ?? "";
    const user = (id: string) => state.users.find((u) => u.id === id)?.name ?? "";
    const out: Hit[] = [];
    const m = (...xs: (string | undefined)[]) => xs.some((x) => x?.toLowerCase().includes(s));
    for (const p of projects) if (m(p.name, p.code, p.clientName, p.address)) out.push({ kind: "Project", title: p.name, sub: `${p.code} · ${p.clientName}`, href: `/projects/${p.id}` });
    for (const b of state.boqItems) if (ids.has(b.projectId) && m(b.description, b.category, b.itemNo)) out.push({ kind: "BOQ item", title: `${b.itemNo} ${b.description}`, sub: `${pname(b.projectId)} · ${num(b.qty)} ${b.unit}`, href: `/projects/${b.projectId}?tab=boq` });
    for (const p of state.pos) if (ids.has(p.projectId) && m(p.no, mat(p.materialId), ven(p.vendorId), user(p.createdBy))) out.push({ kind: "PO", title: `${p.no} · ${mat(p.materialId)}`, sub: `${ven(p.vendorId)} · ${inrShort(p.total)} · ${p.status}`, href: `/projects/${p.projectId}?tab=procurement`, date: p.createdAt });
    for (const r of state.requests) if (ids.has(r.projectId) && m(r.no, mat(r.materialId), r.purpose, user(r.createdBy))) out.push({ kind: "Request", title: `${r.no} · ${mat(r.materialId)}`, sub: `${pname(r.projectId)} · ${r.status}`, href: `/projects/${r.projectId}?tab=procurement`, date: r.createdAt });
    for (const b of state.bills) if (ids.has(b.projectId) && m(b.no, pname(b.projectId))) out.push({ kind: "Bill", title: b.no, sub: `${pname(b.projectId)} · ${inrShort(b.net)} · ${b.status}`, href: `/projects/${b.projectId}?tab=billing`, date: b.date });
    for (const v of state.vendors) if (m(v.name, v.supplies, v.city)) out.push({ kind: "Vendor", title: v.name, sub: `${v.supplies} · ${v.city} · ${v.phone}`, href: `/more` });
    for (const x of state.materials) if (m(x.name)) out.push({ kind: "Material", title: x.name, sub: `₹${num(x.rate)}/${x.unit}`, href: `/more` });
    for (const i of state.issues) if (ids.has(i.projectId) && m(i.title, i.description)) out.push({ kind: "Issue", title: i.title, sub: `${pname(i.projectId)} · ${i.status}`, href: `/projects/${i.projectId}?tab=issues` });
    for (const u of state.users) if (m(u.name, u.email)) out.push({ kind: "User", title: u.name, sub: u.email, href: `/more` });
    for (const r of state.reports) if (ids.has(r.projectId) && m(r.date, fmtDate(r.date))) out.push({ kind: "Daily report", title: fmtDate(r.date), sub: pname(r.projectId), href: `/projects/${r.projectId}?tab=site` });
    return out.slice(0, 60);
  }, [q, state, projects]);

  return (
    <div>
      <PageHeader title="Search" subtitle="Projects, BOQ items, materials, vendors, POs, bills, users, dates" />
      <SearchInput value={q} onChange={setQ} placeholder="Try “steel”, “PO-1”, “Lakeview”, “2026-10”…" />
      <div className="mt-4 space-y-2">
        {q.length >= 2 && hits.length === 0 && <Card className="text-muted">No results.</Card>}
        {hits.map((h, i) => (
          <Link key={i} href={h.href} className="block">
            <Card className="flex items-center justify-between gap-3 !p-4">
              <div className="min-w-0">
                <div className="truncate font-semibold">{h.title}</div>
                <div className="truncate text-[13px] text-muted">{h.sub}{h.date && ` · ${fmtDate(h.date)}`}</div>
              </div>
              <Pill tone="blue">{h.kind}</Pill>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
