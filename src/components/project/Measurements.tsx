"use client";

import { useState } from "react";
import { Check, Download, Plus, X } from "lucide-react";
import { can, useStore } from "@/lib/store";
import { getMetrics } from "@/lib/calc";
import { exportXlsx } from "@/lib/excel";
import { fmtDate, num, uid } from "@/lib/format";
import type { MeasurementStatus } from "@/lib/types";
import { Button, Card, Pill, ProgressBar, Segmented, Sheet, Table, Td, Th } from "../ui";
import { MeasurementForm } from "../forms/QuickForms";
import { AttachmentLink } from "./Procurement";

export function MeasurementsTab({ projectId }: { projectId: string }) {
  const { state, role, user, patch, update } = useStore();
  const project = state.projects.find((p) => p.id === projectId)!;
  const m = getMetrics(state, projectId);
  const [view, setView] = useState<"progress" | "Submitted" | "Approved" | "all">(m.pendingMeasurements ? "Submitted" : "progress");
  const [adding, setAdding] = useState<string | null>(null);
  const canApprove = can(role, "approve");
  const list = state.measurements
    .filter((x) => x.projectId === projectId && (view === "all" || x.status === view))
    .sort((a, b) => b.date.localeCompare(a.date));

  const setStatus = (id: string, status: MeasurementStatus) => patch("measurements", id, { status, approvedBy: status === "Approved" ? user!.id : undefined }, `${status} measurement`);
  const approveAll = () =>
    update((s) => {
      const pending = s.measurements.filter((x) => x.projectId === projectId && x.status === "Submitted");
      for (const x of pending) {
        x.status = "Approved";
        x.approvedBy = user!.id;
      }
      s.audit.unshift({ id: uid("aud"), at: new Date().toISOString(), userId: user!.id, entity: "Measurement", entityId: projectId, projectId, action: "updated", summary: `Approved ${pending.length} measurements` });
    });

  const doExport = () =>
    exportXlsx(`${project.code}-Measurements.xlsx`, [
      { name: "Progress", rows: m.items.map((p) => ({ "Item No": p.item.itemNo, Description: p.item.description, Unit: p.item.unit, "BOQ qty": p.item.qty, Approved: p.approvedQty, Pending: p.pendingQty, Remaining: p.remainingQty, "Billed qty": p.billedQty })) },
      {
        name: "Entries",
        rows: state.measurements
          .filter((x) => x.projectId === projectId)
          .map((x) => {
            const it = state.boqItems.find((b) => b.id === x.boqItemId);
            return { Date: x.date, "Item No": it?.itemNo, Description: it?.description, Qty: x.qty, Unit: it?.unit, Location: x.location ?? "", Status: x.status, "Entered by": state.users.find((u) => u.id === x.createdBy)?.name };
          }),
      },
    ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "progress", label: "BOQ progress" },
            { value: "Submitted", label: "Awaiting approval", count: m.pendingMeasurements },
            { value: "Approved", label: "Approved" },
            { value: "all", label: "All entries" },
          ]}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="white" icon={<Download size={15} />} onClick={doExport}>
            Export
          </Button>
          {role !== "finance" && role !== "procurement" && (
            <Button size="sm" icon={<Plus size={15} />} onClick={() => setAdding("")}>
              Measurement
            </Button>
          )}
        </div>
      </div>

      {view === "progress" ? (
        <Table>
          <thead>
            <tr>
              <Th>BOQ item</Th>
              <Th right>BOQ qty</Th>
              <Th right>Approved</Th>
              <Th right>Pending</Th>
              <Th right>Remaining</Th>
              <Th className="w-44">Progress</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {m.items.map((p) => (
              <tr key={p.item.id}>
                <Td>
                  <div className="font-semibold">
                    {p.item.itemNo} · {p.item.category}
                  </div>
                  <div className="max-w-[320px] truncate text-[12px] text-muted">{p.item.description}</div>
                </Td>
                <Td right>
                  {num(p.item.qty)} <span className="text-muted">{p.item.unit}</span>
                </Td>
                <Td right className="font-semibold">
                  {num(p.approvedQty)}
                </Td>
                <Td right className="text-blue">
                  {p.pendingQty ? num(p.pendingQty) : "—"}
                </Td>
                <Td right>{num(p.remainingQty)}</Td>
                <Td>
                  <div className="tnum mb-1 text-[12px]">{(p.approvedPct * 100).toFixed(0)}%</div>
                  <ProgressBar value={p.approvedPct} height={5} />
                </Td>
                <Td>
                  {role !== "finance" && (
                    <button onClick={() => setAdding(p.item.id)} className="rounded-full px-3 py-1.5 text-[13px] font-medium text-blue hover:bg-blue-softer">
                      + Add
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <>
          {view === "Submitted" && canApprove && list.length > 1 && (
            <div className="mb-3 flex items-center justify-between rounded-[22px] bg-blue-softer px-5 py-3">
              <span className="text-[14px] text-blue">{list.length} measurements waiting. Only approved quantities flow into billing.</span>
              <Button size="sm" variant="blue" icon={<Check size={15} />} onClick={approveAll}>
                Approve all
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {list.length === 0 && <Card className="text-[14px] text-muted">Nothing here.</Card>}
            {list.slice(0, 80).map((x) => {
              const it = state.boqItems.find((b) => b.id === x.boqItemId);
              return (
                <Card key={x.id} className="flex flex-wrap items-center gap-3 !p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {it?.itemNo} {it?.category} · {num(x.qty)} {it?.unit}
                    </div>
                    <div className="text-[13px] text-muted">
                      {fmtDate(x.date)} · {x.location ?? "—"} · by {state.users.find((u) => u.id === x.createdBy)?.name}
                      {x.notes && ` · ${x.notes}`}
                    </div>
                  </div>
                  {x.attachment && <AttachmentLink a={x.attachment} />}
                  <Pill>{x.status}</Pill>
                  {x.status === "Submitted" && canApprove && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" icon={<X size={14} />} onClick={() => setStatus(x.id, "Rejected")}>
                        Reject
                      </Button>
                      <Button size="sm" icon={<Check size={14} />} onClick={() => setStatus(x.id, "Approved")}>
                        Approve
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Sheet open={adding !== null} onClose={() => setAdding(null)} title="Measurement">
        {adding !== null && <MeasurementForm projectId={projectId} boqItemId={adding || undefined} onDone={() => setAdding(null)} />}
      </Sheet>
    </div>
  );
}
