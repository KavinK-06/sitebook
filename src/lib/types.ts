export type Role = "owner" | "pm" | "engineer" | "procurement" | "finance";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner / Admin",
  pm: "Project Manager",
  engineer: "Site Engineer",
  procurement: "Procurement",
  finance: "Finance",
};

export interface User {
  id: string;
  name: string;
  role: Role;
  phone: string;
  email: string;
}

export interface Company {
  name: string;
  city: string;
  gstin?: string;
}

export type ProjectType = "Building" | "Civil" | "Other";
export type ProjectStatus = "Planning" | "Active" | "On hold" | "Completed" | "Cancelled";
export type ContractType = "Item rate" | "Lump sum" | "Cost plus" | "Labour only";

export interface Project {
  id: string;
  code: string;
  name: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  type: ProjectType;
  address: string;
  startDate: string;
  endDate: string;
  contractValue: number;
  contractType: ContractType;
  pmId: string;
  engineerIds: string[];
  status: ProjectStatus;
  boqVersion: number;
  boqLocked: boolean;
  /** Snapshot taken when the estimate baseline is approved */
  baseline?: { cost: number; margin: number; profit: number; date: string };
  createdAt: string;
}

export const COST_HEADS = ["Material", "Labour", "Subcontract", "Equipment", "Overhead", "Other"] as const;
export type CostHead = (typeof COST_HEADS)[number];
export type EstimateHead = CostHead | "Contingency";
export const ESTIMATE_HEADS: EstimateHead[] = [...COST_HEADS, "Contingency"];

export const UNITS = ["m³", "m²", "m", "kg", "tonne", "nos", "litre", "bags", "hour", "day"];

export interface Attachment {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
}

export interface BOQItem {
  id: string;
  projectId: string;
  itemNo: string;
  category: string;
  description: string;
  unit: string;
  qty: number;
  rate: number;
  notes?: string;
}

export interface BOQRevision {
  id: string;
  projectId: string;
  version: number;
  date: string;
  userId: string;
  note: string;
  value: number;
  items: BOQItem[];
}

export interface EstimateItem {
  id: string;
  projectId: string;
  head: EstimateHead;
  name: string;
  boqItemId?: string;
  materialId?: string;
  qty?: number;
  unit?: string;
  rate?: number;
  amount: number;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  rate: number;
}

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  city: string;
  supplies: string;
}

export type RequestStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "Purchased" | "Closed";
export interface MaterialRequest {
  id: string;
  no: string;
  projectId: string;
  materialId: string;
  qty: number;
  requiredDate: string;
  boqItemId?: string;
  purpose: string;
  priority: "Normal" | "Urgent";
  notes?: string;
  status: RequestStatus;
  createdBy: string;
  createdAt: string;
}

export interface Quotation {
  id: string;
  projectId: string;
  requestId?: string;
  vendorId: string;
  materialId: string;
  qty: number;
  rate: number;
  tax: number;
  delivery: number;
  total: number;
  expectedDate: string;
  notes?: string;
  attachment?: Attachment;
  createdAt: string;
}

export type POStatus =
  | "Draft"
  | "Pending approval"
  | "Approved"
  | "Ordered"
  | "Partially received"
  | "Fully received"
  | "Cancelled";
export interface PurchaseOrder {
  id: string;
  no: string;
  projectId: string;
  vendorId: string;
  materialId: string;
  requestId?: string;
  quotationId?: string;
  boqItemId?: string;
  qty: number;
  rate: number;
  charges: number;
  total: number;
  expectedDate: string;
  notes?: string;
  attachment?: Attachment;
  status: POStatus;
  createdBy: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  projectId: string;
  poId: string;
  materialId: string;
  date: string;
  qty: number;
  vehicle?: string;
  notes?: string;
  attachment?: Attachment;
  createdBy: string;
}

export interface DailyReport {
  id: string;
  projectId: string;
  date: string;
  weather?: string;
  work: { boqItemId: string; qty: number }[];
  equipment: { name: string; hours: number; cost: number }[];
  issues?: string;
  delays?: string;
  createdBy: string;
  createdAt: string;
}

export interface LabourEntry {
  id: string;
  projectId: string;
  reportId?: string;
  date: string;
  trade: string;
  count: number;
  wage: number;
  contractor?: string;
  hours?: number;
}

export interface Consumption {
  id: string;
  projectId: string;
  reportId?: string;
  date: string;
  materialId: string;
  qty: number;
  boqItemId?: string;
  notes?: string;
}

export const PHOTO_CATEGORIES = ["Progress", "Material", "Quality", "Issue", "Before/after", "General"];
export interface Photo {
  id: string;
  projectId: string;
  date: string;
  category: string;
  description?: string;
  src?: string;
  createdBy: string;
}

export type IssueStatus = "Open" | "In progress" | "Resolved";
export interface SiteIssue {
  id: string;
  no: number;
  projectId: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  description: string;
  responsible: string;
  dueDate: string;
  status: IssueStatus;
  createdBy: string;
  createdAt: string;
}

export type MeasurementStatus = "Draft" | "Submitted" | "Approved" | "Rejected";
export interface Measurement {
  id: string;
  projectId: string;
  boqItemId: string;
  date: string;
  description?: string;
  qty: number;
  location?: string;
  status: MeasurementStatus;
  createdBy: string;
  approvedBy?: string;
  notes?: string;
  attachment?: Attachment;
}

export type BillStatus = "Draft" | "Submitted" | "Approved" | "Sent" | "Partially paid" | "Paid";
export interface Bill {
  id: string;
  no: string;
  projectId: string;
  periodFrom: string;
  periodTo: string;
  date: string;
  dueDate: string;
  items: { boqItemId: string; qty: number; rate: number; amount: number }[];
  gross: number;
  deductions: number;
  net: number;
  status: BillStatus;
  attachment?: Attachment;
  createdBy: string;
}

export interface Payment {
  id: string;
  projectId: string;
  billId: string;
  date: string;
  amount: number;
  mode: string;
  ref?: string;
}

export interface Expense {
  id: string;
  projectId: string;
  head: CostHead;
  date: string;
  amount: number;
  description: string;
  vendor?: string;
  boqItemId?: string;
  imported?: boolean;
  attachment?: Attachment;
}

export interface AuditEntry {
  id: string;
  at: string;
  userId: string;
  entity: string;
  entityId: string;
  projectId?: string;
  action: "created" | "updated" | "deleted";
  summary: string;
  changes?: { field: string; from: string; to: string }[];
}

export interface State {
  version: number;
  company: Company;
  users: User[];
  currentUserId: string | null;
  projects: Project[];
  boqItems: BOQItem[];
  boqRevisions: BOQRevision[];
  estimateItems: EstimateItem[];
  materials: Material[];
  vendors: Vendor[];
  requests: MaterialRequest[];
  quotations: Quotation[];
  pos: PurchaseOrder[];
  receipts: Receipt[];
  reports: DailyReport[];
  labour: LabourEntry[];
  consumption: Consumption[];
  photos: Photo[];
  issues: SiteIssue[];
  measurements: Measurement[];
  bills: Bill[];
  payments: Payment[];
  expenses: Expense[];
  audit: AuditEntry[];
  dismissedAlerts: string[];
}

export type Collection = {
  [K in keyof State]: State[K] extends Array<{ id: string }> ? K : never;
}[keyof State];
