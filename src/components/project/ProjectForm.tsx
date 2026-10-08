"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { addDays, todayISO, uid } from "@/lib/format";
import type { ContractType, Project, ProjectStatus, ProjectType } from "@/lib/types";
import { Button, Chips, Field, Input, NumInput, Select, Sheet } from "../ui";

export function ProjectForm({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project }) {
  if (!open) return null;
  return <Inner onClose={onClose} project={project} />;
}

function Inner({ onClose, project }: { onClose: () => void; project?: Project }) {
  const { state, add, patch } = useStore();
  const router = useRouter();
  const pms = state.users.filter((u) => u.role === "pm" || u.role === "owner");
  const engineers = state.users.filter((u) => u.role === "engineer");
  const [f, setF] = useState({
    name: project?.name ?? "",
    clientName: project?.clientName ?? "",
    clientPhone: project?.clientPhone ?? "",
    clientEmail: project?.clientEmail ?? "",
    type: (project?.type ?? "Building") as ProjectType,
    address: project?.address ?? "",
    startDate: project?.startDate ?? todayISO(),
    endDate: project?.endDate ?? addDays(todayISO(), 365),
    contractValue: (project?.contractValue ?? "") as number | "",
    contractType: (project?.contractType ?? "Item rate") as ContractType,
    pmId: project?.pmId ?? pms[0]?.id ?? "",
    engineerIds: project?.engineerIds ?? [],
    status: (project?.status ?? "Planning") as ProjectStatus,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.name && f.clientName && f.contractValue && f.startDate && f.endDate;

  const save = () => {
    const data = { ...f, contractValue: Number(f.contractValue), clientEmail: f.clientEmail || undefined };
    if (project) {
      patch("projects", project.id, data, `Updated project ${f.name}`);
      onClose();
    } else {
      const id = uid("prj");
      const code = `PRJ-${2601 + state.projects.length}`;
      add("projects", { ...data, id, code, boqVersion: 1, boqLocked: false, createdAt: todayISO() }, `Created project ${f.name}`);
      onClose();
      router.push(`/projects/${id}?tab=boq`);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      wide
      title={project ? "Edit project" : "New project"}
      footer={
        <>
          <Button variant="white" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!valid} onClick={save}>
            {project ? "Save changes" : "Create project → add BOQ"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name" className="sm:col-span-2">
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Greenfield Residency – Tower C" />
        </Field>
        <Field label="Client name">
          <Input value={f.clientName} onChange={(e) => set("clientName", e.target.value)} />
        </Field>
        <Field label="Client phone">
          <Input type="tel" inputMode="tel" value={f.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} />
        </Field>
        <Field label="Client email (optional)">
          <Input type="email" value={f.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} />
        </Field>
        <Field label="Project type">
          <Chips value={f.type} onChange={(v) => set("type", v)} options={["Building", "Civil", "Other"] as const} />
        </Field>
        <Field label="Site address" className="sm:col-span-2">
          <Input value={f.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Start date">
          <Input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Planned completion">
          <Input type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
        <Field label="Contract value (₹)" hint={project ? "Changes are recorded in the audit trail." : undefined}>
          <NumInput value={f.contractValue} onChange={(v) => set("contractValue", v)} placeholder="50000000" />
        </Field>
        <Field label="Contract type">
          <Select value={f.contractType} onChange={(e) => set("contractType", e.target.value as ContractType)}>
            {["Item rate", "Lump sum", "Cost plus", "Labour only"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Project manager">
          <Select value={f.pmId} onChange={(e) => set("pmId", e.target.value)}>
            {pms.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => set("status", e.target.value as ProjectStatus)}>
            {["Planning", "Active", "On hold", "Completed", "Cancelled"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Site engineers" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {engineers.map((u) => {
              const on = f.engineerIds.includes(u.id);
              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => set("engineerIds", on ? f.engineerIds.filter((x) => x !== u.id) : [...f.engineerIds, u.id])}
                  className={`h-10 rounded-full px-4 text-[14px] font-medium ${on ? "bg-ink text-white" : "bg-white text-[#4a4a55]"}`}
                >
                  {u.name}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </Sheet>
  );
}
