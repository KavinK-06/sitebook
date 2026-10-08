/**
 * Demo data generator. Builds realistic, internally consistent projects relative to today:
 * BOQ → estimate (linked to BOQ items) → measurements over time → bills/payments →
 * purchases/receipts → consumption → labour → expenses. All dashboards derive from these.
 */
import { addDays, clamp, daysBetween, round, todayISO } from "./format";
import type {
  BOQItem,
  Bill,
  Consumption,
  DailyReport,
  EstimateItem,
  Expense,
  LabourEntry,
  Material,
  MaterialRequest,
  Measurement,
  Payment,
  Photo,
  Project,
  PurchaseOrder,
  Quotation,
  Receipt,
  SiteIssue,
  State,
  User,
  Vendor,
  AuditEntry,
} from "./types";

export const STATE_VERSION = 3;

let n = 0;
const id = (p: string) => `${p}_${(++n).toString(36)}`;

const MATERIALS: Material[] = [
  { id: "mat_cement", name: "Cement (OPC 53)", unit: "bags", rate: 420 },
  { id: "mat_steel", name: "Steel Fe500D", unit: "tonne", rate: 62000 },
  { id: "mat_sand", name: "M-Sand", unit: "m³", rate: 1800 },
  { id: "mat_aggregate", name: "Aggregate 20 mm", unit: "m³", rate: 1600 },
  { id: "mat_bricks", name: "Red bricks", unit: "nos", rate: 7.5 },
  { id: "mat_tiles", name: "Vitrified tiles 600×600", unit: "m²", rate: 650 },
  { id: "mat_paint", name: "Acrylic emulsion paint", unit: "litre", rate: 280 },
  { id: "mat_shuttering", name: "Shuttering ply & props (hire)", unit: "m²", rate: 260 },
  { id: "mat_murrum", name: "Murrum / borrow soil", unit: "m³", rate: 120 },
  { id: "mat_gsb", name: "GSB material", unit: "m³", rate: 900 },
  { id: "mat_wmm", name: "WMM material", unit: "m³", rate: 1100 },
  { id: "mat_humepipe", name: "NP3 hume pipe 900 mm", unit: "m", rate: 5200 },
];
const MAT = Object.fromEntries(MATERIALS.map((m) => [m.id.replace("mat_", ""), m]));

const VENDORS: Vendor[] = [
  { id: "ven_1", name: "Sri Balaji Cements", phone: "98400 11223", city: "Chennai", supplies: "Cement" },
  { id: "ven_2", name: "JSW Steel Distributors", phone: "98410 33445", city: "Chennai", supplies: "Steel" },
  { id: "ven_3", name: "Kaveri Sand & Aggregates", phone: "94440 55667", city: "Kanchipuram", supplies: "Sand, Aggregate, GSB, WMM" },
  { id: "ven_4", name: "Lakshmi Bricks", phone: "97890 77889", city: "Tiruvallur", supplies: "Bricks" },
  { id: "ven_5", name: "Tile World", phone: "90030 99001", city: "Chennai", supplies: "Tiles" },
  { id: "ven_6", name: "Asian Paints Depot", phone: "98840 12121", city: "Chennai", supplies: "Paint" },
  { id: "ven_7", name: "Raja Shuttering Hire", phone: "99620 34343", city: "Chennai", supplies: "Shuttering" },
  { id: "ven_8", name: "UltraTech Cement Dealer", phone: "98401 56565", city: "Chennai", supplies: "Cement" },
  { id: "ven_9", name: "Sakthi Pipes", phone: "94441 78787", city: "Coimbatore", supplies: "Hume pipes" },
];
const VENDOR_FOR: Record<string, string> = {
  cement: "ven_1",
  steel: "ven_2",
  sand: "ven_3",
  aggregate: "ven_3",
  bricks: "ven_4",
  tiles: "ven_5",
  paint: "ven_6",
  shuttering: "ven_7",
  murrum: "ven_3",
  gsb: "ven_3",
  wmm: "ven_3",
  humepipe: "ven_9",
};

const USERS: User[] = [
  { id: "u_owner", name: "Kavin Kumar", role: "owner", phone: "98400 00001", email: "kavin@sitebook.in" },
  { id: "u_pm1", name: "Ravi Shankar", role: "pm", phone: "98400 00002", email: "ravi@sitebook.in" },
  { id: "u_pm2", name: "Meena Iyer", role: "pm", phone: "98400 00003", email: "meena@sitebook.in" },
  { id: "u_se1", name: "Suresh Babu", role: "engineer", phone: "98400 00004", email: "suresh@sitebook.in" },
  { id: "u_se2", name: "Arjun Prakash", role: "engineer", phone: "98400 00005", email: "arjun@sitebook.in" },
  { id: "u_se3", name: "Divya Raman", role: "engineer", phone: "98400 00006", email: "divya@sitebook.in" },
  { id: "u_proc", name: "Priya Nair", role: "procurement", phone: "98400 00007", email: "priya@sitebook.in" },
  { id: "u_fin", name: "Anita George", role: "finance", phone: "98400 00008", email: "anita@sitebook.in" },
];

type Tpl = {
  no: string;
  cat: string;
  desc: string;
  unit: string;
  qty: number;
  rate: number;
  seq: [number, number];
  mat?: [string, number][];
  labour?: number;
  equip?: number;
  sub?: number;
};

const BUILDING: Tpl[] = [
  { no: "1.01", cat: "Earthwork", desc: "Excavation in all soils incl. disposal up to 50 m", unit: "m³", qty: 2400, rate: 370, seq: [0, 0.12], labour: 90, equip: 180 },
  { no: "1.02", cat: "PCC", desc: "PCC M10 (1:3:6) below foundations", unit: "m³", qty: 180, rate: 5600, seq: [0.05, 0.15], mat: [["cement", 4.4], ["sand", 0.5], ["aggregate", 0.95]], labour: 450, equip: 150 },
  { no: "2.01", cat: "RCC", desc: "RCC M25 in footings, columns, beams & slabs", unit: "m³", qty: 1450, rate: 8600, seq: [0.1, 0.72], mat: [["cement", 8], ["sand", 0.45], ["aggregate", 0.9]], labour: 900, equip: 400 },
  { no: "2.02", cat: "Steel", desc: "Reinforcement steel Fe500D – cut, bend & place", unit: "tonne", qty: 185, rate: 80000, seq: [0.1, 0.72], mat: [["steel", 1.03]], labour: 4500 },
  { no: "2.03", cat: "Formwork", desc: "Centering & shuttering for RCC members", unit: "m²", qty: 9800, rate: 700, seq: [0.1, 0.72], mat: [["shuttering", 1]], labour: 220 },
  { no: "3.01", cat: "Masonry", desc: "Brick masonry 230 mm in CM 1:6", unit: "m³", qty: 1100, rate: 7000, seq: [0.35, 0.82], mat: [["bricks", 480], ["cement", 1.3], ["sand", 0.3]], labour: 900 },
  { no: "4.01", cat: "Plaster", desc: "Internal plaster 12 mm CM 1:4", unit: "m²", qty: 16000, rate: 270, seq: [0.5, 0.9], mat: [["cement", 0.12], ["sand", 0.02]], labour: 110 },
  { no: "4.02", cat: "Plaster", desc: "External sand-faced plaster 20 mm", unit: "m²", qty: 6000, rate: 345, seq: [0.55, 0.92], mat: [["cement", 0.15], ["sand", 0.025]], labour: 150 },
  { no: "5.01", cat: "Flooring", desc: "Vitrified tile flooring 600×600 incl. bedding", unit: "m²", qty: 5200, rate: 1240, seq: [0.7, 0.96], mat: [["tiles", 1.05], ["cement", 0.2]], labour: 170 },
  { no: "6.01", cat: "Painting", desc: "Acrylic emulsion – 2 coats over putty & primer", unit: "m²", qty: 22000, rate: 125, seq: [0.82, 1], mat: [["paint", 0.18]], labour: 40 },
  { no: "7.01", cat: "Plumbing", desc: "Plumbing & sanitary works (per unit)", unit: "nos", qty: 48, rate: 56000, seq: [0.45, 0.95], sub: 46500 },
  { no: "8.01", cat: "Electrical", desc: "Electrical wiring & fittings (per unit)", unit: "nos", qty: 48, rate: 64000, seq: [0.45, 0.95], sub: 52500 },
];

const CIVIL: Tpl[] = [
  { no: "1.01", cat: "Earthwork", desc: "Earthwork excavation for roadway", unit: "m³", qty: 18000, rate: 250, seq: [0, 0.25], labour: 40, equip: 150 },
  { no: "1.02", cat: "Earthwork", desc: "Embankment with approved soil, compacted", unit: "m³", qty: 14000, rate: 330, seq: [0.05, 0.35], mat: [["murrum", 1.1]], labour: 30, equip: 110 },
  { no: "2.01", cat: "Roads", desc: "Granular sub-base (GSB) Grade I", unit: "m³", qty: 6500, rate: 1720, seq: [0.25, 0.55], mat: [["gsb", 1.25]], labour: 60, equip: 180 },
  { no: "2.02", cat: "Roads", desc: "Wet mix macadam (WMM)", unit: "m³", qty: 5200, rate: 2020, seq: [0.35, 0.65], mat: [["wmm", 1.2]], labour: 60, equip: 200 },
  { no: "3.01", cat: "Roads", desc: "Dense bituminous macadam (DBM) 50 mm", unit: "m³", qty: 1600, rate: 9900, seq: [0.6, 0.85], sub: 8300 },
  { no: "3.02", cat: "Roads", desc: "Bituminous concrete (BC) 30 mm", unit: "m³", qty: 950, rate: 11400, seq: [0.75, 0.95], sub: 9500 },
  { no: "4.01", cat: "Drainage", desc: "RCC box drain M25 incl. excavation", unit: "m", qty: 2400, rate: 5300, seq: [0.12, 0.7], mat: [["cement", 2.2], ["sand", 0.12], ["aggregate", 0.25], ["steel", 0.028]], labour: 650, equip: 150 },
  { no: "4.02", cat: "Drainage", desc: "NP3 hume pipe culverts 900 mm", unit: "m", qty: 420, rate: 7900, seq: [0.2, 0.6], mat: [["humepipe", 1]], labour: 700, equip: 400 },
  { no: "5.01", cat: "Other", desc: "Road marking & signages", unit: "m²", qty: 3800, rate: 650, seq: [0.9, 1], sub: 520 },
];

type Spec = {
  key: string;
  name: string;
  client: string;
  type: "Building" | "Civil";
  address: string;
  contract: number;
  duration: number; // days
  t: number; // elapsed fraction of timeline
  status: Project["status"];
  pm: string;
  engineers: string[];
  tpl: Tpl[];
  labourFactor: number;
  equipFactor: number;
  subFactor: number;
  overheadFactor: number;
  consumption: Record<string, number>; // material key → consumption factor
  price: Record<string, number>; // material key → price factor
  missingDays: number; // no reports for the last N days
  billLag: number; // days since last RA bill
  unpaidBills: number; // number of most recent bills still unpaid
  delayedPO?: { mat: string; daysLate: number; partial: boolean };
  baselineApproved: boolean;
};

const SPECS: Spec[] = [
  {
    key: "A", billLag: 20, name: "Greenfield Residency – Tower B", client: "Greenfield Homes Pvt Ltd", type: "Building",
    address: "Survey No. 112, OMR, Sholinganallur, Chennai", contract: 50000000, duration: 480, t: 0.61, status: "Active",
    pm: "u_pm1", engineers: ["u_se1"], tpl: BUILDING, labourFactor: 1.06, equipFactor: 1.02, subFactor: 1.0, overheadFactor: 1.04,
    consumption: { steel: 1.105, cement: 1.07 }, price: { steel: 1.07, cement: 1.03 }, missingDays: 0, unpaidBills: 1,
    delayedPO: { mat: "cement", daysLate: 1, partial: true }, baselineApproved: true,
  },
  {
    key: "B", billLag: 6, name: "NH-48 Service Road – Package 2", client: "State Highways Dept.", type: "Civil",
    address: "NH-48, Sriperumbudur – Oragadam stretch", contract: 32000000, duration: 360, t: 0.72, status: "Active",
    pm: "u_pm2", engineers: ["u_se2"], tpl: CIVIL, labourFactor: 0.97, equipFactor: 1.01, subFactor: 0.98, overheadFactor: 1.0,
    consumption: { gsb: 1.02 }, price: {}, missingDays: 0, unpaidBills: 1, baselineApproved: true,
  },
  {
    key: "C", billLag: 8, name: "Sunrise Public School – Academic Block", client: "Sunrise Educational Trust", type: "Building",
    address: "Avadi Main Road, Tiruvallur", contract: 21000000, duration: 400, t: 0.38, status: "Active",
    pm: "u_pm2", engineers: ["u_se3"], tpl: BUILDING, labourFactor: 0.98, equipFactor: 1.0, subFactor: 1.0, overheadFactor: 0.98,
    consumption: { cement: 1.01 }, price: { steel: 0.98 }, missingDays: 0, unpaidBills: 1, baselineApproved: true,
  },
  {
    key: "D", billLag: 12, name: "Lakeview Villas – Phase 1", client: "Lakeview Developers LLP", type: "Building",
    address: "Porur Lake Road, Chennai", contract: 45000000, duration: 450, t: 0.54, status: "Active",
    pm: "u_pm1", engineers: ["u_se2", "u_se3"], tpl: BUILDING, labourFactor: 1.13, equipFactor: 1.05, subFactor: 1.02, overheadFactor: 1.06,
    consumption: { cement: 1.04, bricks: 1.06 }, price: { steel: 1.04 }, missingDays: 3, unpaidBills: 2,
    delayedPO: { mat: "steel", daysLate: 4, partial: false }, baselineApproved: true,
  },
  {
    key: "E", billLag: 0, name: "Anand Nagar Drainage Upgrade", client: "Avadi City Municipal Corp.", type: "Civil",
    address: "Anand Nagar, Avadi", contract: 12000000, duration: 240, t: 0, status: "Planning",
    pm: "u_pm2", engineers: ["u_se1"], tpl: CIVIL.filter((x) => ["1.01", "4.01", "4.02", "5.01"].includes(x.no)),
    labourFactor: 1, equipFactor: 1, subFactor: 1, overheadFactor: 1, consumption: {}, price: {}, missingDays: 0, unpaidBills: 0,
    baselineApproved: false,
  },
];

const TRADES = [
  { trade: "Mason", wage: 950, share: 0.32 },
  { trade: "Helper", wage: 650, share: 0.33 },
  { trade: "Carpenter", wage: 1000, share: 0.15 },
  { trade: "Bar bender", wage: 1000, share: 0.12 },
  { trade: "Electrician", wage: 1050, share: 0.04 },
  { trade: "Plumber", wage: 1050, share: 0.04 },
];
export const TRADE_WAGES: Record<string, number> = Object.fromEntries(TRADES.map((t) => [t.trade, t.wage]));
export const TRADE_LIST = [...TRADES.map((t) => t.trade), "Operator", "Painter", "Welder"];
TRADE_WAGES.Operator = 1100;
TRADE_WAGES.Painter = 850;
TRADE_WAGES.Welder = 1000;

const prog = (seq: [number, number], tau: number) => clamp((tau - seq[0]) / (seq[1] - seq[0]), 0, 1);
const WEATHER = ["Sunny", "Sunny", "Cloudy", "Sunny", "Light rain", "Hot & humid"];

export function buildSeed(): State {
  n = 0;
  const today = todayISO();
  const s: State = {
    version: STATE_VERSION,
    company: { name: "Sitebook Constructions", city: "Chennai", gstin: "33ABCDE1234F1Z5" },
    users: USERS,
    currentUserId: null,
    projects: [],
    boqItems: [],
    boqRevisions: [],
    estimateItems: [],
    materials: MATERIALS,
    vendors: VENDORS,
    requests: [],
    quotations: [],
    pos: [],
    receipts: [],
    reports: [],
    labour: [],
    consumption: [],
    photos: [],
    issues: [],
    measurements: [],
    bills: [],
    payments: [],
    expenses: [],
    audit: [],
    dismissedAlerts: [],
  };
  let poNo = 100;
  let reqNo = 200;
  let issueNo = 1;

  SPECS.forEach((sp, pIndex) => {
    const pid = `prj_${sp.key.toLowerCase()}`;
    const start = addDays(today, -Math.round(sp.t * sp.duration) - (sp.t === 0 ? -20 : 0));
    const end = addDays(start, sp.duration);
    const tauAt = (d: string) => daysBetween(start, d) / sp.duration;

    // ---- BOQ (scaled so total ≈ contract value) ----
    const rawTotal = sp.tpl.reduce((a, x) => a + x.qty * x.rate, 0);
    const scale = sp.contract / rawTotal;
    const items: (BOQItem & { tpl: Tpl })[] = sp.tpl.map((t) => ({
      id: `${pid}_boq_${t.no.replace(".", "")}`,
      projectId: pid,
      itemNo: t.no,
      category: t.cat,
      description: t.desc,
      unit: t.unit,
      qty: t.unit === "nos" ? Math.max(1, Math.round(t.qty * scale)) : Math.round(t.qty * scale),
      rate: t.rate,
      tpl: t,
    }));
    const boqValue = items.reduce((a, i) => a + i.qty * i.rate, 0);
    s.boqItems.push(...items.map(({ tpl: _t, ...i }) => i));

    // ---- Estimate ----
    const est: EstimateItem[] = [];
    for (const it of items) {
      for (const [mk, coef] of it.tpl.mat ?? []) {
        const mat = MAT[mk];
        const qty = round(coef * it.qty, 2);
        est.push({ id: id("est"), projectId: pid, head: "Material", name: mat.name, boqItemId: it.id, materialId: mat.id, qty, unit: mat.unit, rate: mat.rate, amount: round(qty * mat.rate, 0) });
      }
      if (it.tpl.labour) est.push({ id: id("est"), projectId: pid, head: "Labour", name: `Labour – ${it.category}`, boqItemId: it.id, qty: it.qty, unit: it.unit, rate: it.tpl.labour, amount: it.qty * it.tpl.labour });
      if (it.tpl.equip) est.push({ id: id("est"), projectId: pid, head: "Equipment", name: `Equipment – ${it.category}`, boqItemId: it.id, qty: it.qty, unit: it.unit, rate: it.tpl.equip, amount: it.qty * it.tpl.equip });
      if (it.tpl.sub) est.push({ id: id("est"), projectId: pid, head: "Subcontract", name: `${it.category} subcontract`, boqItemId: it.id, qty: it.qty, unit: it.unit, rate: it.tpl.sub, amount: it.qty * it.tpl.sub });
    }
    const oh = [
      ["Site office & supervision staff", 0.022],
      ["Security & temporary utilities", 0.006],
      ["Transportation", 0.005],
      ["Administration", 0.004],
    ] as const;
    for (const [name, f] of oh) est.push({ id: id("est"), projectId: pid, head: "Overhead", name, amount: Math.round(boqValue * f) });
    est.push({ id: id("est"), projectId: pid, head: "Contingency", name: "Contingency (1.5%)", amount: Math.round(boqValue * 0.015) });
    s.estimateItems.push(...est);
    const estCost = est.reduce((a, e) => a + e.amount, 0);

    const project: Project = {
      id: pid,
      code: `PRJ-${String(2601 + pIndex)}`,
      name: sp.name,
      clientName: sp.client,
      clientPhone: `044 4${pIndex}12 3456`,
      clientEmail: undefined,
      type: sp.type,
      address: sp.address,
      startDate: start,
      endDate: end,
      contractValue: boqValue,
      contractType: "Item rate",
      pmId: sp.pm,
      engineerIds: sp.engineers,
      status: sp.status,
      boqVersion: 1,
      boqLocked: sp.baselineApproved,
      baseline: sp.baselineApproved
        ? { cost: estCost, profit: boqValue - estCost, margin: (boqValue - estCost) / boqValue, date: addDays(start, -10) }
        : undefined,
      createdAt: addDays(start, -25),
    };
    s.projects.push(project);
    s.audit.push({ id: id("aud"), at: project.createdAt + "T10:00:00", userId: "u_owner", entity: "Project", entityId: pid, projectId: pid, action: "created", summary: `Created project ${sp.name}` });
    if (sp.baselineApproved)
      s.audit.push({ id: id("aud"), at: project.baseline!.date + "T16:30:00", userId: "u_owner", entity: "Estimate", entityId: pid, projectId: pid, action: "updated", summary: `Approved estimate baseline at ${Math.round(estCost).toLocaleString("en-IN")}` });

    if (sp.t === 0) {
      s.requests.push({ id: id("req"), no: `MR-${reqNo++}`, projectId: pid, materialId: "mat_cement", qty: 200, requiredDate: addDays(today, 25), boqItemId: items.find((i) => i.category === "Drainage")?.id, purpose: "Box drain – first stretch", priority: "Normal", status: "Draft", createdBy: sp.engineers[0], createdAt: today });
      return;
    }

    // Tick schedule: monthly until 14 days ago, then daily (these drive every time-series)
    const detailFrom = addDays(today, -14);
    const ticks: string[] = [];
    for (let d = addDays(start, 30); d < detailFrom; d = addDays(d, 30)) ticks.push(d);
    ticks.push(detailFrom);
    for (let d = addDays(detailFrom, 1); d <= today; d = addDays(d, 1)) ticks.push(d);
    const tau = (d: string) => Math.min(tauAt(d), sp.t);
    const reportDays = new Set(ticks.filter((d) => d > detailFrom && d <= addDays(today, -sp.missingDays) && d < today));
    // today's report only for some sites (site engineer still to submit on others)
    if (sp.key === "B" || sp.key === "C") reportDays.add(today);

    // ---- Measurements ----
    let prevDate = start;
    const approvedCutoff = addDays(today, -2);
    for (const d of ticks) {
      if (d > today) break;
      const daily = d > detailFrom;
      if (daily && !reportDays.has(d)) continue;
      for (const it of items) {
        const q = (prog(it.tpl.seq, tau(d)) - prog(it.tpl.seq, tau(prevDate))) * it.qty;
        if (q <= 0.001) continue;
        const qty = it.unit === "nos" ? Math.round(q * 10) / 10 : round(q, 2);
        if (qty <= 0) continue;
        s.measurements.push({
          id: id("ms"),
          projectId: pid,
          boqItemId: it.id,
          date: d,
          qty,
          location: daily ? `Block ${["A", "B", "C"][(qty * 10) % 3 | 0]}` : "As per RA measurement sheet",
          description: daily ? "Daily measurement" : "Monthly joint measurement",
          status: d <= approvedCutoff ? "Approved" : "Submitted",
          createdBy: sp.engineers[0],
          approvedBy: d <= approvedCutoff ? sp.pm : undefined,
        });
      }
      prevDate = d;
    }

    // ---- Bills (monthly RA bills on approved measurements) ----
    const billDates: string[] = [];
    for (let d = addDays(today, -sp.billLag); d > addDays(start, 20); d = addDays(d, -30)) billDates.unshift(d);
    let lastBillDate = start;
    const projectMeas = s.measurements.filter((m) => m.projectId === pid);
    billDates.forEach((bd, i) => {
      const inBill = projectMeas.filter((m) => m.status === "Approved" && m.date > lastBillDate && m.date <= bd);
      const byItem = new Map<string, number>();
      for (const m of inBill) byItem.set(m.boqItemId, (byItem.get(m.boqItemId) ?? 0) + m.qty);
      const bItems = [...byItem.entries()].map(([bid, qty]) => {
        const rate = items.find((x) => x.id === bid)!.rate;
        return { boqItemId: bid, qty: round(qty, 2), rate, amount: Math.round(qty * rate) };
      });
      if (!bItems.length) return;
      const gross = bItems.reduce((a, b) => a + b.amount, 0);
      const deductions = Math.round(gross * 0.07);
      const unpaidIdx = billDates.length - sp.unpaidBills;
      const paid = i < unpaidIdx;
      const bill: Bill = {
        id: id("bill"),
        no: `RA-${sp.key}-${String(i + 1).padStart(2, "0")}`,
        projectId: pid,
        periodFrom: addDays(lastBillDate, 1),
        periodTo: bd,
        date: addDays(bd, 2),
        dueDate: addDays(bd, 32),
        items: bItems,
        gross,
        deductions,
        net: gross - deductions,
        status: paid ? "Paid" : i === billDates.length - 1 ? "Sent" : "Partially paid",
        createdBy: "u_fin",
      };
      s.bills.push(bill);
      if (paid) s.payments.push({ id: id("pay"), projectId: pid, billId: bill.id, date: addDays(bd, 28), amount: bill.net, mode: "NEFT", ref: `UTR${(Math.random() * 1e9) | 0}` });
      else if (bill.status === "Partially paid") s.payments.push({ id: id("pay"), projectId: pid, billId: bill.id, date: addDays(bd, 35), amount: Math.round(bill.net * 0.4), mode: "NEFT", ref: `UTR${(Math.random() * 1e9) | 0}` });
      lastBillDate = bd;
    });

    // ---- Materials: consumption, POs and receipts ----
    const matKeys = new Set<string>();
    items.forEach((it) => it.tpl.mat?.forEach(([mk]) => matKeys.add(mk)));
    for (const mk of matKeys) {
      const mat = MAT[mk];
      const cf = sp.consumption[mk] ?? 1;
      const pf = sp.price[mk] ?? 1;
      // consumption per tick per BOQ item
      let prev = start;
      let totalConsumed = 0;
      const consumedAt: { d: string; q: number }[] = [];
      for (const d of ticks) {
        const daily = d > detailFrom;
        if (daily && !reportDays.has(d)) continue;
        let qd = 0;
        for (const it of items) {
          const coef = it.tpl.mat?.find(([k]) => k === mk)?.[1];
          if (!coef) continue;
          const q = (prog(it.tpl.seq, tau(d)) - prog(it.tpl.seq, tau(prev))) * it.qty * coef * cf;
          if (q <= 0.001) continue;
          const qty = mat.unit === "nos" || mat.unit === "bags" ? Math.round(q) : round(q, 2);
          if (qty <= 0) continue;
          s.consumption.push({ id: id("con"), projectId: pid, date: d, materialId: mat.id, qty, boqItemId: it.id, notes: daily ? undefined : "Monthly stock reconciliation" });
          qd += qty;
        }
        totalConsumed += qd;
        if (qd > 0) consumedAt.push({ d, q: qd });
        prev = d;
      }
      if (totalConsumed <= 0) continue;
      // purchase ahead of consumption in ~monthly POs with a buffer
      const buffer = 1.06;
      const chunks = Math.min(6, Math.max(1, Math.round(consumedAt.length / 3)));
      const target = totalConsumed * buffer;
      const isDelayed = sp.delayedPO?.mat === mk;
      for (let c = 0; c < chunks; c++) {
        const q = target / chunks;
        const qty = mat.unit === "nos" || mat.unit === "bags" ? Math.round(q) : round(q, 2);
        const orderDate = addDays(start, Math.round(((c + 0.2) / chunks) * Math.max(daysBetween(start, today) - 10, 10)));
        const rate = Math.round(mat.rate * pf * (1 + (c - chunks / 2) * 0.004));
        const charges = Math.round(qty * rate * 0.02);
        const po: PurchaseOrder = {
          id: id("po"),
          no: `PO-${poNo++}`,
          projectId: pid,
          vendorId: VENDOR_FOR[mk],
          materialId: mat.id,
          qty,
          rate,
          charges,
          total: qty * rate + charges,
          expectedDate: addDays(orderDate, 4),
          status: "Fully received",
          createdBy: "u_proc",
          createdAt: orderDate,
        };
        s.pos.push(po);
        s.receipts.push({ id: id("rcv"), projectId: pid, poId: po.id, materialId: mat.id, date: addDays(orderDate, 3), qty, vehicle: `TN ${10 + (c % 80)} AB ${1000 + c * 37}`, createdBy: sp.engineers[0] });
      }
      // one open PO for upcoming work (committed cost)
      const remainingNeed = items.reduce((a, it) => {
        const coef = it.tpl.mat?.find(([k]) => k === mk)?.[1];
        return a + (coef ? (1 - prog(it.tpl.seq, sp.t)) * it.qty * coef : 0);
      }, 0);
      if (remainingNeed > 0) {
        const q = Math.min(remainingNeed * 0.25, target / chunks);
        const qty = mat.unit === "nos" || mat.unit === "bags" ? Math.round(q) : round(q, 2);
        const rate = Math.round(mat.rate * pf * 1.01);
        const charges = Math.round(qty * rate * 0.02);
        const expected = isDelayed ? addDays(today, -sp.delayedPO!.daysLate) : addDays(today, 3 + (qty % 5));
        const partial = isDelayed ? sp.delayedPO!.partial : false;
        const po: PurchaseOrder = {
          id: id("po"),
          no: `PO-${poNo++}`,
          projectId: pid,
          vendorId: mk === "cement" && sp.key === "A" ? "ven_8" : VENDOR_FOR[mk],
          materialId: mat.id,
          qty,
          rate,
          charges,
          total: qty * rate + charges,
          expectedDate: expected,
          status: partial ? "Partially received" : "Ordered",
          createdBy: "u_proc",
          createdAt: addDays(today, -6),
        };
        s.pos.push(po);
        if (partial) {
          const rq = mat.unit === "bags" ? Math.round(qty * 0.6) : round(qty * 0.6, 2);
          s.receipts.push({ id: id("rcv"), projectId: pid, poId: po.id, materialId: mat.id, date: addDays(today, -2), qty: rq, vehicle: "TN 09 CK 4471", createdBy: sp.engineers[0], notes: "Balance to follow" });
        }
      }
    }

    // ---- Labour, equipment, subcontract, overhead actuals ----
    const headEst = (head: string, d: string) =>
      est.filter((e) => e.head === head).reduce((a, e) => {
        const it = items.find((x) => x.id === e.boqItemId);
        return a + e.amount * (it ? prog(it.tpl.seq, tau(d)) : tau(d) / sp.t * sp.t);
      }, 0);
    const valueProg = (d: string) => items.reduce((a, it) => a + prog(it.tpl.seq, tau(d)) * it.qty * it.rate, 0) / boqValue;
    let prevT = start;
    const reportsById = new Map<string, DailyReport>();
    for (const d of ticks) {
      const daily = d > detailFrom;
      if (daily && !reportDays.has(d)) continue;
      const lab = (headEst("Labour", d) - headEst("Labour", prevT)) * sp.labourFactor;
      const eq = (headEst("Equipment", d) - headEst("Equipment", prevT)) * sp.equipFactor;
      const sub = (headEst("Subcontract", d) - headEst("Subcontract", prevT)) * sp.subFactor;
      const ovh = est.filter((e) => e.head === "Overhead").reduce((a, e) => a + e.amount, 0) * (valueProg(d) - valueProg(prevT)) * sp.overheadFactor;
      if (!daily) {
        if (lab > 0) s.expenses.push({ id: id("exp"), projectId: pid, head: "Labour", date: d, amount: Math.round(lab), description: "Labour wages – monthly muster (imported)", imported: true });
        if (eq > 0) s.expenses.push({ id: id("exp"), projectId: pid, head: "Equipment", date: d, amount: Math.round(eq), description: "Equipment hire – JCB / mixer / vibrators", vendor: "Sri Murugan Earthmovers" });
        if (sub > 0) s.expenses.push({ id: id("exp"), projectId: pid, head: "Subcontract", date: d, amount: Math.round(sub), description: "Subcontractor RA payment", vendor: sp.type === "Civil" ? "Highway Asphalt Works" : "Volt & Flow MEP Services" });
        if (ovh > 0) s.expenses.push({ id: id("exp"), projectId: pid, head: "Overhead", date: d, amount: Math.round(ovh), description: "Site overheads – staff, security, utilities" });
      } else {
        const report: DailyReport = {
          id: id("dr"),
          projectId: pid,
          date: d,
          weather: WEATHER[(daysBetween(start, d) + pIndex) % WEATHER.length],
          work: s.measurements
            .filter((m) => m.projectId === pid && m.date === d)
            .map((m) => ({ boqItemId: m.boqItemId, qty: m.qty })),
          equipment: eq > 0 ? [{ name: sp.type === "Civil" ? "Motor grader + roller" : "Concrete mixer + vibrator", hours: 8, cost: Math.round(eq) }] : [],
          issues: undefined,
          delays: undefined,
          createdBy: sp.engineers[0],
          createdAt: d + "T18:30:00",
        };
        s.reports.push(report);
        reportsById.set(d, report);
        for (const tr of TRADES) {
          const count = Math.round((lab * tr.share) / tr.wage);
          if (count > 0) s.labour.push({ id: id("lab"), projectId: pid, reportId: report.id, date: d, trade: tr.trade, count, wage: tr.wage, contractor: tr.trade === "Electrician" || tr.trade === "Plumber" ? "Volt & Flow MEP" : "Own labour" });
        }
        if (sub > 0) s.expenses.push({ id: id("exp"), projectId: pid, head: "Subcontract", date: d, amount: Math.round(sub), description: "Subcontract work – daily accrual", vendor: sp.type === "Civil" ? "Highway Asphalt Works" : "Volt & Flow MEP Services" });
        if (ovh > 0) s.expenses.push({ id: id("exp"), projectId: pid, head: "Overhead", date: d, amount: Math.round(ovh), description: "Site overheads – staff, security, utilities" });
      }
      prevT = d;
    }
    // attach report ids to consumption on report days
    for (const c of s.consumption) if (c.projectId === pid && reportsById.has(c.date)) c.reportId = reportsById.get(c.date)!.id;

    // ---- Material requests & quotations ----
    const recentReq: MaterialRequest[] = [
      { id: id("req"), no: `MR-${reqNo++}`, projectId: pid, materialId: sp.type === "Civil" ? "mat_wmm" : "mat_cement", qty: sp.type === "Civil" ? 400 : 300, requiredDate: addDays(today, 5), boqItemId: items[2]?.id, purpose: sp.type === "Civil" ? "WMM – Ch. 2+400 to 3+100" : "Slab casting – 5th floor", priority: "Urgent", status: "Submitted", createdBy: sp.engineers[0], createdAt: addDays(today, -1) },
      { id: id("req"), no: `MR-${reqNo++}`, projectId: pid, materialId: sp.type === "Civil" ? "mat_humepipe" : "mat_bricks", qty: sp.type === "Civil" ? 40 : 20000, requiredDate: addDays(today, 10), boqItemId: items.find((i) => i.category === (sp.type === "Civil" ? "Drainage" : "Masonry"))?.id, purpose: sp.type === "Civil" ? "Culvert at Ch. 3+250" : "Masonry – 4th floor", priority: "Normal", status: "Approved", createdBy: sp.engineers[0], createdAt: addDays(today, -4) },
      { id: id("req"), no: `MR-${reqNo++}`, projectId: pid, materialId: "mat_sand", qty: 60, requiredDate: addDays(today, -8), purpose: "Plastering", priority: "Normal", status: "Purchased", createdBy: sp.engineers[0], createdAt: addDays(today, -15) },
    ];
    s.requests.push(...recentReq);
    const approvedReq = recentReq[1];
    const mat = MATERIALS.find((m) => m.id === approvedReq.materialId)!;
    const qVendors = mat.id === "mat_bricks" ? ["ven_4", "ven_3"] : ["ven_9", "ven_3"];
    qVendors.forEach((v, i) => {
      const rate = Math.round(mat.rate * (1 + i * 0.05 - 0.02) * 100) / 100;
      const tax = Math.round(approvedReq.qty * rate * 0.18);
      const delivery = i === 0 ? 4500 : 2500;
      s.quotations.push({ id: id("quo"), projectId: pid, requestId: approvedReq.id, vendorId: v, materialId: mat.id, qty: approvedReq.qty, rate, tax, delivery, total: Math.round(approvedReq.qty * rate + tax + delivery), expectedDate: addDays(today, 6 + i), notes: i === 0 ? "Includes unloading" : undefined, createdAt: addDays(today, -2) });
    });

    // ---- Site issues ----
    const issues: Omit<SiteIssue, "id" | "no" | "projectId" | "createdBy" | "createdAt">[] =
      sp.key === "A"
        ? [
            { title: "Cement delivery short by 40%", severity: "High", description: "Balance bags needed for column casting on Friday.", responsible: "Procurement", dueDate: addDays(today, 1), status: "Open" },
            { title: "Honeycombing at column C-14", severity: "Medium", description: "Minor honeycombing after de-shuttering. Repair with polymer mortar.", responsible: "Site engineer", dueDate: addDays(today, 3), status: "In progress" },
          ]
        : sp.key === "D"
          ? [{ title: "Steel delivery delayed", severity: "High", description: "Required for roof slab of villas 7–9 this week.", responsible: "Procurement", dueDate: addDays(today, -1), status: "Open" }]
          : [{ title: "Water tanker irregular", severity: "Low", description: "Curing affected on 2 days last week.", responsible: "Project manager", dueDate: addDays(today, 2), status: "Open" }];
    for (const is of issues) s.issues.push({ ...is, id: id("iss"), no: issueNo++, projectId: pid, createdBy: sp.engineers[0], createdAt: addDays(today, -2) });

    // ---- Photos (placeholders) ----
    const photoCats = ["Progress", "Material", "Quality", "Progress"];
    photoCats.forEach((c, i) =>
      s.photos.push({ id: id("pho"), projectId: pid, date: addDays(today, -i - 1), category: c, description: c === "Material" ? "Material unloading" : c === "Quality" ? "Cube samples taken" : "Work progress", createdBy: sp.engineers[0] }),
    );

    // ---- Audit samples ----
    if (sp.key === "A") {
      const rcc = items.find((i) => i.category === "RCC")!;
      s.audit.push({ id: id("aud"), at: addDays(today, -40) + "T11:12:00", userId: "u_owner", entity: "BOQ item", entityId: rcc.id, projectId: pid, action: "updated", summary: `Updated BOQ item ${rcc.itemNo}`, changes: [{ field: "qty", from: String(rcc.qty - 15), to: String(rcc.qty) }] });
    }
  });

  return s;
}

export type { Consumption, Expense, LabourEntry, Measurement, Payment, Photo, Quotation, Receipt, AuditEntry };
