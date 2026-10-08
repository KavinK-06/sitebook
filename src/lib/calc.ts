/**
 * Central calculation engine. Every number shown on a dashboard comes from here,
 * derived from the raw records in State — nothing is stored pre-computed.
 */
import { COST_HEADS, type BOQItem, type Bill, type CostHead, type PurchaseOrder, type State } from "./types";
import { addDays, clamp, daysBetween, sum, todayISO } from "./format";

export interface ItemProgress {
  item: BOQItem;
  approvedQty: number;
  pendingQty: number;
  measuredQty: number;
  billedQty: number;
  unbilledQty: number;
  remainingQty: number;
  pct: number; // measured / boq qty (0..1)
  approvedPct: number;
  estCost: number; // estimated cost for full item
  estUnitCost: number;
}

export interface HeadCost {
  head: CostHead;
  estimated: number;
  expected: number; // estimated cost at the current level of completion
  committed: number;
  actual: number;
  remaining: number; // estimated - actual
  variance: number; // actual - expected
  variancePct: number;
  forecast: number;
  etc: number; // estimate to complete
}

export interface MaterialStat {
  materialId: string;
  name: string;
  unit: string;
  estQty: number;
  expectedQty: number;
  orderedQty: number;
  receivedQty: number;
  consumedQty: number;
  stock: number;
  estRate: number;
  avgRate: number;
  consumptionVar: number; // consumed/expected - 1
  overconsumptionCost: number;
  priceVarianceCost: number;
}

export interface ItemMaterialVar {
  boqItemId: string;
  materialId: string;
  estQty: number;
  expectedQty: number;
  usedQty: number;
  variancePct: number;
}

export interface ProjectMetrics {
  projectId: string;
  boqValue: number;
  contract: number;
  progress: number; // value-weighted measured progress
  approvedProgress: number;
  items: ItemProgress[];
  itemsCompleted: number;
  heads: HeadCost[];
  contingency: number;
  estimatedCost: number;
  estimatedProfit: number;
  estimatedMargin: number;
  actualCost: number;
  committedCost: number;
  expectedCost: number;
  costToComplete: number;
  forecastCost: number;
  forecastProfit: number;
  forecastMargin: number;
  baseline: { cost: number; profit: number; margin: number; approved: boolean };
  billedGross: number;
  billedNet: number;
  collected: number;
  outstanding: number;
  unbilledValue: number;
  overdueBills: { bill: Bill; outstanding: number; daysOverdue: number }[];
  materials: MaterialStat[];
  itemMaterialVar: ItemMaterialVar[];
  stockValue: number;
  purchasedValue: number;
  workersToday: number;
  labourCostToday: number;
  lastReportDate: string | null;
  pendingRequests: number;
  openPOs: number;
  delayedPOs: { po: PurchaseOrder; days: number; pendingQty: number }[];
  pendingMeasurements: number;
  openIssues: number;
  monthly: { month: string; planned: number; actual: number }[];
}

const cache = new WeakMap<State, Map<string, ProjectMetrics>>();

export function poUnitCost(po: PurchaseOrder): number {
  return po.qty > 0 ? po.total / po.qty : 0;
}

export function poReceived(s: State, poId: string): number {
  return sum(
    s.receipts.filter((r) => r.poId === poId),
    (r) => r.qty,
  );
}

export function getMetrics(s: State, projectId: string): ProjectMetrics {
  let m = cache.get(s);
  if (!m) {
    m = new Map();
    cache.set(s, m);
  }
  let r = m.get(projectId);
  if (!r) {
    r = compute(s, projectId);
    m.set(projectId, r);
  }
  return r;
}

function compute(s: State, pid: string): ProjectMetrics {
  const today = todayISO();
  const project = s.projects.find((p) => p.id === pid)!;
  const items = s.boqItems.filter((i) => i.projectId === pid);
  const boqValue = sum(items, (i) => i.qty * i.rate);
  const meas = s.measurements.filter((x) => x.projectId === pid);
  const bills = s.bills.filter((b) => b.projectId === pid);
  const est = s.estimateItems.filter((e) => e.projectId === pid);
  const pos = s.pos.filter((p) => p.projectId === pid);
  const posById = new Map(pos.map((p) => [p.id, p]));
  const receipts = s.receipts.filter((r) => r.projectId === pid);
  const labour = s.labour.filter((l) => l.projectId === pid);
  const reports = s.reports.filter((r) => r.projectId === pid);
  const expenses = s.expenses.filter((e) => e.projectId === pid);
  const consumption = s.consumption.filter((c) => c.projectId === pid);

  // ---- BOQ item progress -------------------------------------------------
  const itemProg: ItemProgress[] = items.map((item) => {
    const im = meas.filter((x) => x.boqItemId === item.id);
    const approvedQty = sum(
      im.filter((x) => x.status === "Approved"),
      (x) => x.qty,
    );
    const pendingQty = sum(
      im.filter((x) => x.status === "Submitted"),
      (x) => x.qty,
    );
    const measuredQty = approvedQty + pendingQty;
    let billedQty = 0;
    for (const b of bills) for (const bi of b.items) if (bi.boqItemId === item.id) billedQty += bi.qty;
    const estCost = sum(
      est.filter((e) => e.boqItemId === item.id),
      (e) => e.amount,
    );
    return {
      item,
      approvedQty,
      pendingQty,
      measuredQty,
      billedQty,
      unbilledQty: Math.max(approvedQty - billedQty, 0),
      remainingQty: Math.max(item.qty - approvedQty, 0),
      pct: item.qty > 0 ? clamp(measuredQty / item.qty, 0, 1) : 0,
      approvedPct: item.qty > 0 ? clamp(approvedQty / item.qty, 0, 1) : 0,
      estCost,
      estUnitCost: item.qty > 0 ? estCost / item.qty : 0,
    };
  });
  const progById = new Map(itemProg.map((p) => [p.item.id, p]));
  const progress = boqValue > 0 ? sum(itemProg, (p) => p.pct * p.item.qty * p.item.rate) / boqValue : 0;
  const approvedProgress =
    boqValue > 0 ? sum(itemProg, (p) => p.approvedPct * p.item.qty * p.item.rate) / boqValue : 0;

  const itemPct = (id?: string) => (id && progById.has(id) ? progById.get(id)!.pct : progress);

  // ---- Estimate --------------------------------------------------------------
  const estByHead = new Map<string, number>();
  const expByHead = new Map<string, number>();
  for (const e of est) {
    estByHead.set(e.head, (estByHead.get(e.head) ?? 0) + e.amount);
    expByHead.set(e.head, (expByHead.get(e.head) ?? 0) + e.amount * itemPct(e.boqItemId));
  }
  const contingency = estByHead.get("Contingency") ?? 0;
  const estimatedCost = sum([...estByHead.values()], (x) => x);

  // ---- Materials ----------------------------------------------------------------
  const matIds = new Set<string>();
  est.forEach((e) => e.materialId && matIds.add(e.materialId));
  pos.forEach((p) => matIds.add(p.materialId));
  consumption.forEach((c) => matIds.add(c.materialId));
  const materials: MaterialStat[] = [...matIds].map((mid) => {
    const mat = s.materials.find((x) => x.id === mid);
    const me = est.filter((e) => e.materialId === mid);
    const estQty = sum(me, (e) => e.qty ?? 0);
    const expectedQty = sum(me, (e) => (e.qty ?? 0) * itemPct(e.boqItemId));
    const estRate = estQty > 0 ? sum(me, (e) => e.amount) / estQty : (mat?.rate ?? 0);
    const mpos = pos.filter((p) => p.materialId === mid && p.status !== "Cancelled");
    const orderedQty = sum(mpos, (p) => p.qty);
    const mrec = receipts.filter((r) => r.materialId === mid);
    const receivedQty = sum(mrec, (r) => r.qty);
    const receivedValue = sum(mrec, (r) => r.qty * poUnitCost(posById.get(r.poId) ?? ({ qty: 1, total: 0 } as PurchaseOrder)));
    const avgRate = receivedQty > 0 ? receivedValue / receivedQty : estRate;
    const consumedQty = sum(
      consumption.filter((c) => c.materialId === mid),
      (c) => c.qty,
    );
    const consumptionVar = expectedQty > 0 ? consumedQty / expectedQty - 1 : 0;
    return {
      materialId: mid,
      name: mat?.name ?? "Unknown",
      unit: mat?.unit ?? "",
      estQty,
      expectedQty,
      orderedQty,
      receivedQty,
      consumedQty,
      stock: receivedQty - consumedQty,
      estRate,
      avgRate,
      consumptionVar,
      overconsumptionCost: (consumedQty - expectedQty) * avgRate,
      priceVarianceCost: (avgRate - estRate) * consumedQty,
    };
  });
  materials.sort((a, b) => b.estQty * b.estRate - a.estQty * a.estRate);

  // ---- Actuals ---------------------------------------------------------------
  const actual: Record<CostHead, number> = {
    Material: 0,
    Labour: 0,
    Subcontract: 0,
    Equipment: 0,
    Overhead: 0,
    Other: 0,
  };
  // Material cost = material actually put into work (consumed × avg purchase rate).
  // Material bought but still on site is stock, tracked separately.
  for (const mat of materials) actual.Material += mat.consumedQty * mat.avgRate;
  const stockValue = sum(materials, (m) => Math.max(m.stock, 0) * m.avgRate);
  const purchasedValue = sum(receipts, (r) => r.qty * poUnitCost(posById.get(r.poId) ?? ({ qty: 1, total: 0 } as PurchaseOrder)));
  for (const l of labour) actual.Labour += l.count * l.wage;
  for (const r of reports) for (const eq of r.equipment) actual.Equipment += eq.cost;
  for (const e of expenses) actual[e.head] += e.amount;

  const committed: Record<CostHead, number> = { ...actual };
  for (const k of COST_HEADS) committed[k] = 0;
  const receivedByPo = new Map<string, number>();
  for (const r of receipts) receivedByPo.set(r.poId, (receivedByPo.get(r.poId) ?? 0) + r.qty);
  for (const po of pos) {
    if (["Approved", "Ordered", "Partially received"].includes(po.status)) {
      const pending = Math.max(po.qty - (receivedByPo.get(po.id) ?? 0), 0);
      committed.Material += pending * poUnitCost(po);
    }
  }

  const heads: HeadCost[] = COST_HEADS.map((head) => {
    const estimated = estByHead.get(head) ?? 0;
    const expected = expByHead.get(head) ?? 0;
    const a = actual[head];
    const remainingEst = Math.max(estimated - expected, 0);
    // If a cost head is running over, assume the remaining work runs over at the same
    // rate (capped at 30%). Under-runs are not extrapolated — conservative by design.
    const factor = expected > estimated * 0.02 && expected > 0 ? clamp(a / expected, 1, 1.3) : 1;
    let etc = remainingEst * factor;
    etc = Math.max(etc, committed[head]);
    return {
      head,
      estimated,
      expected,
      committed: committed[head],
      actual: a,
      remaining: estimated - a,
      variance: a - expected,
      variancePct: expected > 0 ? (a - expected) / expected : 0,
      forecast: a + etc,
      etc,
    };
  });

  const actualCost = sum(heads, (h) => h.actual);
  const committedCost = sum(heads, (h) => h.committed);
  const expectedCost = sum(heads, (h) => h.expected);
  const costToComplete = sum(heads, (h) => h.etc) + contingency;
  const forecastCost = actualCost + costToComplete;
  const contract = project.contractValue;
  const estimatedProfit = contract - estimatedCost;
  const forecastProfit = contract - forecastCost;
  const baseline = project.baseline
    ? { ...project.baseline, approved: true }
    : {
        cost: estimatedCost,
        profit: estimatedProfit,
        margin: contract > 0 ? estimatedProfit / contract : 0,
        approved: false,
      };

  // ---- Billing ----------------------------------------------------------------
  const live = bills.filter((b) => b.status !== "Draft");
  const billedGross = sum(live, (b) => b.gross);
  const billedNet = sum(live, (b) => b.net);
  const payments = s.payments.filter((p) => p.projectId === pid);
  const collected = sum(payments, (p) => p.amount);
  const unbilledValue = sum(itemProg, (p) => p.unbilledQty * p.item.rate);
  const overdueBills = live
    .map((bill) => {
      const paid = sum(
        payments.filter((p) => p.billId === bill.id),
        (p) => p.amount,
      );
      return { bill, outstanding: bill.net - paid, daysOverdue: daysBetween(bill.dueDate, today) };
    })
    .filter((x) => x.outstanding > 1 && x.daysOverdue > 0);

  const itemMaterialVar: ItemMaterialVar[] = [];
  for (const e of est) {
    if (!e.materialId || !e.boqItemId || !e.qty) continue;
    const used = sum(
      consumption.filter((c) => c.materialId === e.materialId && c.boqItemId === e.boqItemId),
      (c) => c.qty,
    );
    const expectedQty = e.qty * itemPct(e.boqItemId);
    itemMaterialVar.push({
      boqItemId: e.boqItemId,
      materialId: e.materialId,
      estQty: e.qty,
      expectedQty,
      usedQty: used,
      variancePct: expectedQty > 0 ? used / expectedQty - 1 : 0,
    });
  }

  // ---- Site & procurement -------------------------------------------------------
  const todays = labour.filter((l) => l.date === today);
  const lastReportDate = reports.reduce<string | null>((acc, r) => (!acc || r.date > acc ? r.date : acc), null);
  const delayedPOs = pos
    .filter((p) => ["Approved", "Ordered", "Partially received"].includes(p.status) && p.expectedDate < today)
    .map((po) => ({ po, days: daysBetween(po.expectedDate, today), pendingQty: po.qty - (receivedByPo.get(po.id) ?? 0) }))
    .filter((x) => x.pendingQty > 0);

  // ---- Monthly cumulative spend vs plan -------------------------------------------
  const monthly = monthlySeries(s, pid, project.startDate, project.endDate, estimatedCost - contingency, posById);

  return {
    projectId: pid,
    boqValue,
    contract,
    progress,
    approvedProgress,
    items: itemProg,
    itemsCompleted: itemProg.filter((p) => p.approvedPct >= 0.999).length,
    heads,
    contingency,
    estimatedCost,
    estimatedProfit,
    estimatedMargin: contract > 0 ? estimatedProfit / contract : 0,
    actualCost,
    committedCost,
    expectedCost,
    costToComplete,
    forecastCost,
    forecastProfit,
    forecastMargin: contract > 0 ? forecastProfit / contract : 0,
    baseline,
    billedGross,
    billedNet,
    collected,
    outstanding: billedNet - collected,
    unbilledValue,
    overdueBills,
    materials,
    itemMaterialVar,
    stockValue,
    purchasedValue,
    workersToday: sum(todays, (l) => l.count),
    labourCostToday: sum(todays, (l) => l.count * l.wage),
    lastReportDate,
    pendingRequests: s.requests.filter((r) => r.projectId === pid && ["Submitted", "Approved"].includes(r.status)).length,
    openPOs: pos.filter((p) => ["Pending approval", "Approved", "Ordered", "Partially received"].includes(p.status)).length,
    delayedPOs,
    pendingMeasurements: meas.filter((x) => x.status === "Submitted").length,
    openIssues: s.issues.filter((i) => i.projectId === pid && i.status !== "Resolved").length,
    monthly,
  };
}

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function monthlySeries(
  s: State,
  pid: string,
  start: string,
  end: string,
  plannedTotal: number,
  posById: Map<string, PurchaseOrder>,
) {
  const today = todayISO();
  const byMonth = new Map<string, number>();
  const add = (d: string, v: number) => byMonth.set(monthKey(d), (byMonth.get(monthKey(d)) ?? 0) + v);
  for (const r of s.receipts) if (r.projectId === pid) {
    const po = posById.get(r.poId);
    if (po) add(r.date, r.qty * poUnitCost(po));
  }
  for (const l of s.labour) if (l.projectId === pid) add(l.date, l.count * l.wage);
  for (const e of s.expenses) if (e.projectId === pid) add(e.date, e.amount);
  for (const r of s.reports) if (r.projectId === pid) add(r.date, sum(r.equipment, (q) => q.cost));

  const duration = Math.max(daysBetween(start, end), 1);
  const out: { month: string; planned: number; actual: number }[] = [];
  let cursor = start.slice(0, 8) + "01";
  let cum = 0;
  const last = today < end ? today : end;
  let guard = 0;
  while (monthKey(cursor) <= monthKey(last) && guard++ < 60) {
    cum += byMonth.get(monthKey(cursor)) ?? 0;
    const monthEnd = addDays(addMonths(cursor, 1), -1);
    const tau = clamp(daysBetween(start, monthEnd < last ? monthEnd : last) / duration, 0, 1);
    // smooth S-curve for planned spend
    const sCurve = tau * tau * (3 - 2 * tau);
    out.push({ month: cursor, planned: plannedTotal * sCurve, actual: cum });
    cursor = addMonths(cursor, 1);
  }
  return out;
}

function addMonths(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export interface ProfitDriver {
  label: string;
  amount: number; // positive increases profit, negative reduces it
  detail?: string;
}

/** Explains why forecast profit differs from the original (baseline) profit. */
export function profitDrivers(s: State, pid: string): { original: number; current: number; drivers: ProfitDriver[] } {
  const m = getMetrics(s, pid);
  const drivers: ProfitDriver[] = [];
  for (const mat of m.materials) {
    if (Math.abs(mat.overconsumptionCost) > 25000 && mat.consumptionVar > 0.02)
      drivers.push({
        label: `${mat.name} overconsumption`,
        amount: -mat.overconsumptionCost,
        detail: `${(mat.consumptionVar * 100).toFixed(1)}% above expected at current progress`,
      });
    if (Math.abs(mat.priceVarianceCost) > 25000)
      drivers.push({
        label: `${mat.name} price ${mat.priceVarianceCost > 0 ? "increase" : "saving"}`,
        amount: -mat.priceVarianceCost,
        detail: `Bought at avg ₹${Math.round(mat.avgRate).toLocaleString("en-IN")} vs est. ₹${Math.round(mat.estRate).toLocaleString("en-IN")}`,
      });
  }
  for (const h of m.heads) {
    if (h.head === "Material") continue;
    const impact = h.estimated - h.forecast;
    if (Math.abs(impact) > 25000)
      drivers.push({
        label: `${h.head} ${impact < 0 ? "overrun" : "saving"}`,
        amount: impact,
        detail: `${h.variancePct >= 0 ? "+" : ""}${(h.variancePct * 100).toFixed(1)}% vs expected so far, projected to completion`,
      });
  }
  const contractDelta = m.contract - (m.baseline.cost + m.baseline.profit);
  if (Math.abs(contractDelta) > 1) drivers.push({ label: "Contract value change", amount: contractDelta });
  const estimateDelta = m.baseline.cost - m.estimatedCost;
  if (Math.abs(estimateDelta) > 1) drivers.push({ label: "Estimate revised after baseline", amount: estimateDelta });

  const explained = sum(drivers, (d) => d.amount);
  const total = m.forecastProfit - m.baseline.profit;
  const other = total - explained;
  if (Math.abs(other) > 25000) drivers.push({ label: other < 0 ? "Projected overrun on remaining work" : "Other", amount: other, detail: "Current cost run-rate applied to work still to be done" });
  drivers.sort((a, b) => a.amount - b.amount);
  return { original: m.baseline.profit, current: m.forecastProfit, drivers };
}

export function projectHealth(m: ProjectMetrics): "good" | "warn" | "bad" {
  const drop = m.baseline.margin - m.forecastMargin;
  if (drop >= 0.03 || m.forecastMargin < 0.05) return "bad";
  if (drop >= 0.01 || m.unbilledValue > 0.03 * m.contract || m.overdueBills.length) return "warn";
  return "good";
}
