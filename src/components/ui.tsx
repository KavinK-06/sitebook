"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { X, Plus, ArrowDownRight, ArrowUpRight, Search, Paperclip } from "lucide-react";
import { initials } from "@/lib/format";
import type { Attachment } from "@/lib/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------------- Layout ---------------- */

export function Card({
  children,
  className,
  onClick,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "div" | "button";
}) {
  const C = as;
  return (
    <C
      onClick={onClick}
      className={cx(
        "rounded-[var(--radius-card)] bg-card p-5 text-left",
        onClick && "transition hover:shadow-[0_6px_24px_rgba(10,10,40,0.06)] active:scale-[0.995]",
        className,
      )}
    >
      {children}
    </C>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-[30px] font-semibold leading-tight tracking-[-0.02em] md:text-[34px]">{title}</h1>
        {subtitle && <div className="mt-1 text-[15px] text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** "You are on Top / of your Finances" two-tone hero headline */
export function Headline({ top, bottom }: { top: React.ReactNode; bottom: React.ReactNode }) {
  return (
    <h2 className="text-[30px] font-semibold leading-[1.12] tracking-[-0.025em] md:text-[38px]">
      <span className="block">{top}</span>
      <span className="block text-muted/80">{bottom}</span>
    </h2>
  );
}

export function SectionHeader({
  title,
  href,
  action,
  linkLabel = "See all",
}: {
  title: React.ReactNode;
  href?: string;
  action?: React.ReactNode;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between px-1">
      <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h3>
      {href ? (
        <Link href={href} className="text-[15px] text-muted hover:text-ink">
          {linkLabel}
        </Link>
      ) : (
        action
      )}
    </div>
  );
}

/* ---------------- Buttons ---------------- */

type BtnVariant = "black" | "white" | "blue" | "soft" | "ghost" | "danger";
const BTN: Record<BtnVariant, string> = {
  black: "bg-ink text-white hover:bg-black/85",
  white: "bg-white text-ink hover:bg-white/80 border border-line",
  blue: "bg-blue text-white hover:bg-blue-2",
  soft: "bg-blue-softer text-blue hover:bg-blue-soft",
  ghost: "text-ink hover:bg-black/5",
  danger: "bg-red-soft text-red hover:bg-red/15",
};

export function Button({
  children,
  variant = "black",
  size = "md",
  className,
  icon,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" && "h-9 px-4 text-[13px]",
        size === "md" && "h-11 px-5 text-[14px]",
        size === "lg" && "h-14 px-6 text-[16px]",
        BTN[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function RoundButton({
  kind = "plus",
  onClick,
  href,
  label,
  className,
}: {
  kind?: "plus" | "down" | "up";
  onClick?: () => void;
  href?: string;
  label: string;
  className?: string;
}) {
  const cls = cx(
    "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition",
    kind === "plus" ? "bg-ink text-white hover:bg-black/80" : "bg-white text-ink hover:bg-white/70",
    className,
  );
  const icon =
    kind === "plus" ? <Plus size={22} strokeWidth={2.2} /> : kind === "down" ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />;
  if (href)
    return (
      <Link href={href} aria-label={label} title={label} className={cls}>
        {icon}
      </Link>
    );
  return (
    <button onClick={onClick} aria-label={label} title={label} className={cls}>
      {icon}
    </button>
  );
}

/* ---------------- Data display ---------------- */

export function Stat({
  label,
  value,
  sub,
  trend,
  className,
  big,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: "up" | "down";
  className?: string;
  big?: boolean;
}) {
  return (
    <Card className={cx("flex flex-col", className)}>
      <div className="flex items-start justify-between gap-2 text-[14px] text-[#4a4a55]">
        <span>{label}</span>
        {trend === "up" && <ArrowUpRight size={18} className="shrink-0" />}
        {trend === "down" && <ArrowDownRight size={18} className="shrink-0" />}
      </div>
      <div className={cx("tnum mt-2 font-semibold tracking-[-0.02em]", big ? "text-[34px]" : "text-[24px]")}>{value}</div>
      {sub && <div className="mt-1 text-[13px] text-muted">{sub}</div>}
    </Card>
  );
}

export function ProgressBar({ value, tone = "blue", className, height = 8 }: { value: number; tone?: "blue" | "red" | "orange" | "green" | "ink"; className?: string; height?: number }) {
  const color = { blue: "bg-blue", red: "bg-red", orange: "bg-orange", green: "bg-green", ink: "bg-ink" }[tone];
  return (
    <div className={cx("w-full overflow-hidden rounded-full bg-blue-soft", className)} style={{ height }}>
      <div className={cx("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

/** Dotted milestone progress track from the "Target" reference card */
export function DotProgress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative h-4 w-full rounded-full bg-[#eef0f4]">
      <div className="absolute inset-y-0 left-0 rounded-full bg-blue-soft" style={{ width: `${Math.max(v * 100, 4)}%` }} />
      {[0.02, 0.27, 0.53, 0.98].map((p, i) => (
        <span
          key={i}
          className={cx("absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full", p <= v ? "bg-blue" : "bg-white")}
          style={{ left: `${p * 100}%` }}
        />
      ))}
      <span className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue ring-4 ring-blue/15" style={{ left: `${v * 100}%` }} />
    </div>
  );
}

export function Ring({ value, size = 40, stroke = 4, tone = "var(--blue)" }: { value: number; size?: number; stroke?: number; tone?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--blue-soft)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - v)} strokeLinecap="round" />
    </svg>
  );
}

export function IconBubble({ children, tone = "blue", className }: { children: React.ReactNode; tone?: "blue" | "soft" | "gray" | "red" | "orange" | "green"; className?: string }) {
  const t = {
    blue: "bg-blue text-white",
    soft: "bg-blue-soft text-blue",
    gray: "bg-[#efeff3] text-ink",
    red: "bg-red-soft text-red",
    orange: "bg-orange-soft text-orange",
    green: "bg-green-soft text-green",
  }[tone];
  return <div className={cx("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full", t, className)}>{children}</div>;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cx("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#efeff3] text-[14px] font-semibold", className)}>
      {initials(name)}
    </div>
  );
}

const PILL_TONE: Record<string, string> = {
  gray: "bg-[#efeff3] text-[#4a4a55]",
  blue: "bg-blue-softer text-blue",
  green: "bg-green-soft text-green",
  orange: "bg-orange-soft text-[#b5600d]",
  red: "bg-red-soft text-red",
  yellow: "bg-yellow-soft text-[#8a6a00]",
  ink: "bg-ink text-white",
};

const STATUS_TONE: Record<string, keyof typeof PILL_TONE> = {
  Draft: "gray",
  Submitted: "blue",
  Approved: "green",
  Rejected: "red",
  Purchased: "green",
  Closed: "gray",
  "Pending approval": "orange",
  Ordered: "blue",
  "Partially received": "orange",
  "Fully received": "green",
  Cancelled: "gray",
  Sent: "blue",
  "Partially paid": "orange",
  Paid: "green",
  Open: "red",
  "In progress": "orange",
  Resolved: "green",
  Active: "green",
  Planning: "blue",
  "On hold": "orange",
  Completed: "gray",
  High: "red",
  Medium: "orange",
  Low: "gray",
  Urgent: "red",
  Normal: "gray",
};

export function Pill({ children, tone, className }: { children: React.ReactNode; tone?: keyof typeof PILL_TONE; className?: string }) {
  const t = tone ?? STATUS_TONE[String(children)] ?? "gray";
  return <span className={cx("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium", PILL_TONE[t], className)}>{children}</span>;
}

export function HealthDot({ health }: { health: "good" | "warn" | "bad" }) {
  const c = { good: "bg-green", warn: "bg-orange", bad: "bg-red" }[health];
  return <span className={cx("inline-block h-2.5 w-2.5 rounded-full ring-4", c, health === "good" ? "ring-green/15" : health === "warn" ? "ring-orange/15" : "ring-red/15")} />;
}

export function Empty({ icon, title, hint, action }: { icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] bg-card px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <div className="text-[16px] font-semibold">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-[14px] text-muted">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------------- Tabs ---------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cx("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition",
            value === o.value ? "bg-ink text-white" : "bg-white text-[#4a4a55] hover:text-ink",
          )}
        >
          {o.label}
          {o.count !== undefined && o.count > 0 && (
            <span className={cx("rounded-full px-1.5 text-[11px]", value === o.value ? "bg-white/20" : "bg-blue-softer text-blue")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Sheet / modal ---------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/35 md:items-center md:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cx(
          "animate-sheet flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-bg md:rounded-[28px]",
          wide ? "md:max-w-3xl" : "md:max-w-lg",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
          <h2 className="text-[21px] font-semibold tracking-[-0.01em]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white hover:bg-white/70">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="flex gap-2 border-t border-line bg-bg px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Form controls ---------------- */

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-[#4a4a55]">{label}</span>
      {children}
      {hint && <span className="mt-1 block px-1 text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

const INPUT = "h-12 w-full rounded-2xl border border-transparent bg-white px-4 text-[15px] outline-none transition placeholder:text-muted/70 focus:border-blue/40 focus:ring-4 focus:ring-blue/10";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(INPUT, props.className)} />;
}

export function NumInput({
  value,
  onChange,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { value: number | ""; onChange: (v: number | "") => void }) {
  return (
    <input
      {...rest}
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className={cx(INPUT, "tnum", className)}
    />
  );
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cx(
        INPUT,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238a8a94%22 stroke-width=%222.5%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_16px_center] bg-no-repeat pr-10",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(INPUT, "h-auto py-3", props.className)} />;
}

export function Chips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly T[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          onClick={() => onChange(o)}
          className={cx("h-10 rounded-full px-4 text-[14px] font-medium transition", value === o ? "bg-ink text-white" : "bg-white text-[#4a4a55]")}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="flex h-12 items-center rounded-2xl bg-white">
      <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(0, value - step))} className="h-12 w-12 text-[22px] text-muted hover:text-ink">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="tnum w-12 flex-1 bg-transparent text-center text-[16px] font-semibold outline-none"
      />
      <button type="button" aria-label="Increase" onClick={() => onChange(value + step)} className="h-12 w-12 text-[22px] text-muted hover:text-ink">
        +
      </button>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(INPUT, "h-11 pl-11")} />
    </div>
  );
}

/** File picker that stores small files as data URLs (images are downscaled). */
export function FilePick({
  value,
  onChange,
  accept = "image/*,application/pdf",
  label = "Attach file",
  capture,
}: {
  value?: Attachment;
  onChange: (a?: Attachment) => void;
  accept?: string;
  label?: string;
  capture?: boolean;
}) {
  const idv = useId();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={idv} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-[14px] font-medium hover:bg-white/70">
        <Paperclip size={16} />
        {busy ? "Reading…" : value ? "Replace" : label}
      </label>
      <input
        id={idv}
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          onChange(await readAttachment(f));
          setBusy(false);
        }}
      />
      {value && (
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
          <span className="truncate">{value.name}</span>
          <button type="button" onClick={() => onChange(undefined)} className="text-red">
            Remove
          </button>
        </span>
      )}
    </div>
  );
}

export async function readAttachment(f: File): Promise<Attachment> {
  if (f.type.startsWith("image/")) {
    const dataUrl = await downscale(f, 1100);
    return { name: f.name, type: "image/jpeg", size: f.size, dataUrl };
  }
  if (f.size < 600_000) {
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(f);
    });
    return { name: f.name, type: f.type, size: f.size, dataUrl };
  }
  // Large non-image files: keep metadata only in this local prototype
  return { name: f.name, type: f.type, size: f.size };
}

function downscale(f: File, max: number): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.72));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(f);
  });
}

/* ---------------- Table ---------------- */

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto rounded-[var(--radius-card)] bg-card", className)}>
      <table className="w-full min-w-[640px] border-collapse text-[14px]">{children}</table>
    </div>
  );
}
export function Th({ children, right, className }: { children?: React.ReactNode; right?: boolean; className?: string }) {
  return <th className={cx("border-b border-line px-4 py-3 text-[12px] font-medium uppercase tracking-wide text-muted", right ? "text-right" : "text-left", className)}>{children}</th>;
}
export function Td({ children, right, className, colSpan }: { children?: React.ReactNode; right?: boolean; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cx("border-b border-line/70 px-4 py-3 align-middle", right && "tnum text-right", className)}>
      {children}
    </td>
  );
}

export function KV({ k, v, strong }: { k: React.ReactNode; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4 py-1.5", strong && "font-semibold")}>
      <span className={strong ? "" : "text-[#4a4a55]"}>{k}</span>
      <span className="tnum whitespace-nowrap text-right">{v}</span>
    </div>
  );
}
