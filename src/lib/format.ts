export function inr(n: number, digits = 0): string {
  const sign = n < 0 ? "-" : "";
  return (
    sign +
    "₹" +
    Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits })
  );
}

/** Compact Indian notation: ₹5.00 Cr, ₹65.2 L, ₹42,300 */
export function inrShort(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(a >= 1e6 ? 1 : 2)} L`;
  return sign + "₹" + Math.round(a).toLocaleString("en-IN");
}

export function signedShort(n: number): string {
  return (n > 0 ? "+" : "") + inrShort(n);
}

export function num(n: number, digits = 2): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = todayISO();
  if (iso === today) return `Today, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (iso === addDays(today, -1)) return `Yesterday, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function monthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return MONTHS[d.getMonth()];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

let counter = 0;
export function uid(prefix = "id"): string {
  counter++;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function sum<T>(arr: T[], f: (x: T) => number): number {
  let s = 0;
  for (const x of arr) s += f(x);
  return s;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
