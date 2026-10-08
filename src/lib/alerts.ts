/** Rule-based alert engine (V1). Alerts are derived live from project metrics. */
import { getMetrics, profitDrivers } from "./calc";
import { daysBetween, inrShort, todayISO } from "./format";
import type { State } from "./types";

export type Severity = "critical" | "warning" | "attention" | "info";
export const SEVERITY_ORDER: Severity[] = ["critical", "warning", "attention", "info"];
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  attention: "Attention",
  info: "Info",
};

export interface Alert {
  id: string;
  projectId: string;
  projectName: string;
  type: string;
  severity: Severity;
  title: string;
  detail: string;
  value?: string;
  date: string;
  href: string;
  linkLabel: string;
}

export const THRESHOLDS = {
  costOverrunWarn: 0.05,
  costOverrunCritical: 0.1,
  consumptionWarn: 0.05,
  consumptionCritical: 0.1,
  marginDropWarn: 0.015,
  marginDropCritical: 0.03,
  missingReportDays: 2,
  billingGapMin: 50000,
};

const cache = new WeakMap<State, Alert[]>();

export function getAlerts(s: State, opts: { includeDismissed?: boolean } = {}): Alert[] {
  let all = cache.get(s);
  if (!all) {
    all = s.projects.flatMap((p) => projectAlerts(s, p.id));
    all.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
    cache.set(s, all);
  }
  return opts.includeDismissed ? all : all.filter((a) => !s.dismissedAlerts.includes(a.id));
}

function projectAlerts(s: State, pid: string): Alert[] {
  const p = s.projects.find((x) => x.id === pid)!;
  if (p.status !== "Active" && p.status !== "On hold") return [];
  const today = todayISO();
  const m = getMetrics(s, pid);
  const out: Alert[] = [];
  const base = { projectId: pid, projectName: p.name, date: today };
  const link = (tab: string) => `/projects/${pid}?tab=${tab}`;

  // 1. Cost overrun by head
  for (const h of m.heads) {
    if (h.expected < 50000) continue;
    if (h.variancePct > THRESHOLDS.costOverrunWarn) {
      out.push({
        ...base,
        id: `cost:${pid}:${h.head}`,
        type: "Cost overrun",
        severity: h.variancePct > THRESHOLDS.costOverrunCritical ? "critical" : "warning",
        title: `${h.head} cost ${(h.variancePct * 100).toFixed(1)}% above expected`,
        detail: `Actual ${inrShort(h.actual)} vs ${inrShort(h.expected)} expected at current progress.`,
        value: `+${inrShort(h.variance)}`,
        href: link("costs"),
        linkLabel: "View cost analysis",
      });
    }
  }

  // 2. Material consumption
  for (const mat of m.materials) {
    if (mat.expectedQty <= 0) continue;
    if (mat.consumptionVar > THRESHOLDS.consumptionWarn) {
      out.push({
        ...base,
        id: `cons:${pid}:${mat.materialId}`,
        type: "Material consumption",
        severity: mat.consumptionVar > THRESHOLDS.consumptionCritical ? "critical" : "warning",
        title: `${mat.name} consumption ${(mat.consumptionVar * 100).toFixed(1)}% above expected`,
        detail: `Used ${fmtQ(mat.consumedQty)} ${mat.unit} vs ${fmtQ(mat.expectedQty)} ${mat.unit} expected for work completed.`,
        value: inrShort(mat.overconsumptionCost),
        href: link("site"),
        linkLabel: "View consumption",
      });
    }
  }

  // 3. Delayed procurement
  for (const d of m.delayedPOs) {
    const mat = s.materials.find((x) => x.id === d.po.materialId);
    out.push({
      ...base,
      id: `po:${d.po.id}`,
      type: "Delayed procurement",
      severity: d.days > 3 ? "critical" : "warning",
      title: `${mat?.name ?? "Material"} delivery ${d.days === 1 ? "due yesterday" : `overdue by ${d.days} days`}`,
      detail: `${d.po.no}: ${fmtQ(d.pendingQty)} ${mat?.unit ?? ""} still pending from ${s.vendors.find((v) => v.id === d.po.vendorId)?.name ?? "vendor"}.`,
      date: d.po.expectedDate,
      href: link("procurement"),
      linkLabel: "View purchase order",
    });
  }

  // 4. Billing gap
  if (m.unbilledValue > THRESHOLDS.billingGapMin) {
    out.push({
      ...base,
      id: `bill:${pid}`,
      type: "Billing gap",
      severity: m.unbilledValue > 0.02 * m.contract ? "warning" : "attention",
      title: `${inrShort(m.unbilledValue)} of approved work not billed`,
      detail: `Approved measurements exist that are not included in any bill yet.`,
      value: inrShort(m.unbilledValue),
      href: link("billing"),
      linkLabel: "Create bill",
    });
  }

  // 5. Payment outstanding
  for (const o of m.overdueBills) {
    out.push({
      ...base,
      id: `pay:${o.bill.id}`,
      type: "Payment outstanding",
      severity: o.daysOverdue > 30 ? "critical" : "warning",
      title: `Client payment overdue by ${o.daysOverdue} days`,
      detail: `${o.bill.no} — ${inrShort(o.outstanding)} outstanding from ${p.clientName}.`,
      value: inrShort(o.outstanding),
      date: o.bill.dueDate,
      href: link("billing"),
      linkLabel: "View bill",
    });
  }

  // 6. Profitability
  const drop = m.baseline.margin - m.forecastMargin;
  if (drop > THRESHOLDS.marginDropWarn && m.progress > 0.02) {
    const drivers = profitDrivers(s, pid).drivers.filter((d) => d.amount < 0);
    // Name a concrete cause (e.g. steel overconsumption) rather than the generic run-rate projection
    const main = drivers.find((d) => !d.label.startsWith("Projected")) ?? drivers[0];
    out.push({
      ...base,
      id: `margin:${pid}`,
      type: "Profitability",
      severity: drop > THRESHOLDS.marginDropCritical ? "critical" : "warning",
      title: `Forecast margin dropped from ${(m.baseline.margin * 100).toFixed(1)}% to ${(m.forecastMargin * 100).toFixed(1)}%`,
      detail: main ? `Main cause: ${main.label.toLowerCase()} (${inrShort(main.amount)}).` : "Costs are running above estimate.",
      value: inrShort(m.forecastProfit - m.baseline.profit),
      href: link("forecast"),
      linkLabel: "View forecast",
    });
  }

  // 7. Missing site reports
  if (p.status === "Active") {
    const days = m.lastReportDate ? daysBetween(m.lastReportDate, today) : 99;
    if (days >= THRESHOLDS.missingReportDays) {
      out.push({
        ...base,
        id: `report:${pid}:${m.lastReportDate}`,
        type: "Missing site reports",
        severity: "attention",
        title: m.lastReportDate ? `No daily report for ${days} days` : "No daily report submitted yet",
        detail: `Last report: ${m.lastReportDate ?? "never"}. Ask the site engineer to update.`,
        href: link("site"),
        linkLabel: "Open site",
      });
    }
  }

  // Informational: approvals waiting
  if (m.pendingMeasurements > 0)
    out.push({
      ...base,
      id: `appr-meas:${pid}:${m.pendingMeasurements}`,
      type: "Approval",
      severity: "info",
      title: `${m.pendingMeasurements} measurement${m.pendingMeasurements > 1 ? "s" : ""} awaiting approval`,
      detail: "Approved measurements flow into billing.",
      href: link("measurements"),
      linkLabel: "Review",
    });
  const pendingReq = s.requests.filter((r) => r.projectId === pid && r.status === "Submitted").length;
  if (pendingReq > 0)
    out.push({
      ...base,
      id: `appr-req:${pid}:${pendingReq}`,
      type: "Approval",
      severity: "info",
      title: `${pendingReq} material request${pendingReq > 1 ? "s" : ""} awaiting approval`,
      detail: "Site is waiting on these requests.",
      href: link("procurement"),
      linkLabel: "Review",
    });

  return out;
}

function fmtQ(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}
