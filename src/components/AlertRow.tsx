"use client";

import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import type { Alert, Severity } from "@/lib/alerts";
import { cx } from "./ui";

export const SEV_STYLE: Record<Severity, { dot: string; bg: string; text: string; emoji: string }> = {
  critical: { dot: "bg-red", bg: "bg-red-soft", text: "text-red", emoji: "🔴" },
  warning: { dot: "bg-orange", bg: "bg-orange-soft", text: "text-[#b5600d]", emoji: "🟠" },
  attention: { dot: "bg-yellow", bg: "bg-yellow-soft", text: "text-[#8a6a00]", emoji: "🟡" },
  info: { dot: "bg-green", bg: "bg-green-soft", text: "text-green", emoji: "🟢" },
};

export function AlertRow({ alert: a, compact, onDismiss, showProject = true }: { alert: Alert; compact?: boolean; onDismiss?: () => void; showProject?: boolean }) {
  const s = SEV_STYLE[a.severity];
  return (
    <div className={cx("group flex items-start gap-3", compact ? "px-5 py-4" : "p-5")}>
      <span className={cx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", s.dot)} />
      <div className="min-w-0 flex-1">
        {showProject && <div className="truncate text-[12px] font-medium uppercase tracking-wide text-muted">{a.projectName}</div>}
        <div className="text-[15px] font-semibold leading-snug">{a.title}</div>
        {!compact && <div className="mt-0.5 text-[14px] text-[#5a5a66]">{a.detail}</div>}
        <Link href={a.href} className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-blue hover:underline">
          {a.linkLabel} <ArrowUpRight size={14} />
        </Link>
      </div>
      {a.value && <div className={cx("tnum shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold", s.bg, s.text)}>{a.value}</div>}
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss alert" title="Dismiss" className="shrink-0 rounded-full p-1.5 text-muted opacity-60 hover:bg-bg hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
