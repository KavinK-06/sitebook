"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Camera, ClipboardList, PackageCheck, PackagePlus, Ruler, ChevronRight, ArrowLeft } from "lucide-react";
import { useStore, useVisibleProjects } from "@/lib/store";
import { Field, IconBubble, Select, Sheet } from "../ui";
import { DailyReportForm } from "./DailyReportForm";
import { IssueForm, MaterialRequestForm, MeasurementForm, PhotoForm, ReceiptForm } from "./QuickForms";

export type QuickAction = "report" | "request" | "measurement" | "receipt" | "photo" | "issue";

export const ACTIONS: { key: QuickAction; label: string; hint: string; icon: React.ReactNode }[] = [
  { key: "report", label: "Daily report", hint: "Labour, work done, material used", icon: <ClipboardList size={20} /> },
  { key: "request", label: "Material request", hint: "Ask office to buy material", icon: <PackagePlus size={20} /> },
  { key: "measurement", label: "Measurement", hint: "Quantity completed vs BOQ", icon: <Ruler size={20} /> },
  { key: "receipt", label: "Material received", hint: "Record delivery against PO", icon: <PackageCheck size={20} /> },
  { key: "photo", label: "Photo", hint: "Progress, quality, issue", icon: <Camera size={20} /> },
  { key: "issue", label: "Issue", hint: "Report a site problem", icon: <AlertTriangle size={20} /> },
];

export function AddSheet({
  open,
  onClose,
  initialAction,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  initialAction?: QuickAction;
  projectId?: string;
}) {
  const projects = useVisibleProjects().filter((p) => p.status === "Active" || p.status === "Planning" || p.status === "On hold");
  const { role } = useStore();
  const [action, setAction] = useState<QuickAction | undefined>(initialAction);
  const [pid, setPid] = useState<string>(projectId ?? projects[0]?.id ?? "");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset sheet each time it opens
      setAction(initialAction);
      setPid(projectId && projects.some((p) => p.id === projectId) ? projectId : (projects[0]?.id ?? ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allowed = ACTIONS.filter((a) => (role === "procurement" ? a.key === "receipt" || a.key === "request" : true));
  const current = ACTIONS.find((a) => a.key === action);
  const done = () => onClose();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide={action === "report"}
      title={
        current ? (
          <span className="flex items-center gap-2">
            {!initialAction && (
              <button onClick={() => setAction(undefined)} aria-label="Back" className="-ml-1 rounded-full p-1.5 hover:bg-white">
                <ArrowLeft size={20} />
              </button>
            )}
            {current.label}
          </span>
        ) : (
          "Add to site"
        )
      }
    >
      {projects.length > 0 && (
        <Field label="Project" className="mb-4">
          <Select value={pid} onChange={(e) => setPid(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {!current && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {allowed.map((a) => (
            <button key={a.key} onClick={() => setAction(a.key)} className="flex items-center gap-3 rounded-[22px] bg-white p-4 text-left transition hover:shadow-[0_4px_18px_rgba(0,0,0,0.05)] active:scale-[0.99]">
              <IconBubble tone={a.key === "issue" ? "red" : a.key === "report" ? "blue" : "soft"}>{a.icon}</IconBubble>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">{a.label}</div>
                <div className="truncate text-[13px] text-muted">{a.hint}</div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </button>
          ))}
        </div>
      )}
      {pid && action === "report" && <DailyReportForm key={pid} projectId={pid} onDone={done} />}
      {pid && action === "request" && <MaterialRequestForm key={pid} projectId={pid} onDone={done} />}
      {pid && action === "measurement" && <MeasurementForm key={pid} projectId={pid} onDone={done} />}
      {pid && action === "receipt" && <ReceiptForm key={pid} projectId={pid} onDone={done} />}
      {pid && action === "photo" && <PhotoForm key={pid} projectId={pid} onDone={done} />}
      {pid && action === "issue" && <IssueForm key={pid} projectId={pid} onDone={done} />}
    </Sheet>
  );
}
