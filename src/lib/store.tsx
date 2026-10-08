"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { produce, type Draft } from "immer";
import { buildSeed, STATE_VERSION } from "./seed";
import { uid } from "./format";
import type { AuditEntry, Collection, Role, State, User } from "./types";

const KEY = "sitebook-state";

/** Entities whose changes are commercially important and recorded in the audit trail. */
const AUDITED: Partial<Record<Collection, string>> = {
  projects: "Project",
  boqItems: "BOQ item",
  estimateItems: "Estimate item",
  pos: "Purchase order",
  measurements: "Measurement",
  bills: "Bill",
  payments: "Payment",
  expenses: "Expense",
  requests: "Material request",
  quotations: "Quotation",
  receipts: "Material receipt",
  users: "User",
};

type Item<C extends Collection> = State[C] extends Array<infer T> ? T : never;

interface Store {
  state: State;
  user: User | null;
  role: Role;
  update: (fn: (d: Draft<State>) => void) => void;
  add: <C extends Collection>(c: C, item: Item<C>, summary?: string) => void;
  patch: <C extends Collection>(c: C, id: string, changes: Partial<Item<C>>, summary?: string) => void;
  remove: <C extends Collection>(c: C, id: string, summary?: string) => void;
  login: (userId: string) => void;
  logout: () => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

function fmtVal(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  return String(v);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    let s: State | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (parsed.version === STATE_VERSION) s = parsed;
      }
    } catch {
      s = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from browser storage once
    setState(s ?? buildSeed());
  }, []);

  // Persist every change immediately so a reload or closed tab never loses an entry.
  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not persist state", e);
    }
  }, [state]);

  const update = useCallback((fn: (d: Draft<State>) => void) => {
    setState((s) => (s ? produce(s, fn) : s));
  }, []);

  const audit = (d: Draft<State>, e: Omit<AuditEntry, "id" | "at" | "userId">) => {
    d.audit.unshift({ ...e, id: uid("aud"), at: new Date().toISOString(), userId: d.currentUserId ?? "system" });
  };

  const add = useCallback<Store["add"]>((c, item, summary) => {
    update((d) => {
      (d[c] as unknown as object[]).unshift(item as object);
      const label = AUDITED[c];
      if (label) {
        const it = item as unknown as { id: string; projectId?: string };
        audit(d, { entity: label, entityId: it.id, projectId: it.projectId ?? (c === "projects" ? it.id : undefined), action: "created", summary: summary ?? `Created ${label.toLowerCase()}` });
      }
    });
  }, [update]);

  const patch = useCallback<Store["patch"]>((c, id, changes, summary) => {
    update((d) => {
      const arr = d[c] as unknown as Record<string, unknown>[];
      const it = arr.find((x) => x.id === id);
      if (!it) return;
      const diffs: { field: string; from: string; to: string }[] = [];
      for (const [k, v] of Object.entries(changes)) {
        if (JSON.stringify(it[k]) !== JSON.stringify(v)) diffs.push({ field: k, from: fmtVal(it[k]), to: fmtVal(v) });
        it[k] = v as unknown;
      }
      const label = AUDITED[c];
      if (label && diffs.length) {
        audit(d, {
          entity: label,
          entityId: id,
          projectId: (it.projectId as string | undefined) ?? (c === "projects" ? id : undefined),
          action: "updated",
          summary: summary ?? `Updated ${label.toLowerCase()}`,
          changes: diffs.filter((x) => x.field !== "items"),
        });
      }
    });
  }, [update]);

  const remove = useCallback<Store["remove"]>((c, id, summary) => {
    update((d) => {
      const arr = d[c] as unknown as Record<string, unknown>[];
      const idx = arr.findIndex((x) => x.id === id);
      if (idx < 0) return;
      const it = arr[idx];
      arr.splice(idx, 1);
      const label = AUDITED[c];
      if (label) audit(d, { entity: label, entityId: id, projectId: it.projectId as string | undefined, action: "deleted", summary: summary ?? `Deleted ${label.toLowerCase()}` });
    });
  }, [update]);

  const login = useCallback((userId: string) => update((d) => void (d.currentUserId = userId)), [update]);
  const logout = useCallback(() => update((d) => void (d.currentUserId = null)), [update]);
  const reset = useCallback(() => {
    const fresh = buildSeed();
    setState((s) => ({ ...fresh, currentUserId: s?.currentUserId ?? null }));
  }, []);

  const value = useMemo<Store | null>(() => {
    if (!state) return null;
    const user = state.users.find((u) => u.id === state.currentUserId) ?? null;
    return { state, user, role: user?.role ?? "owner", update, add, patch, remove, login, logout, reset };
  }, [state, update, add, patch, remove, login, logout, reset]);

  if (!value) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--blue-soft)] border-t-[var(--blue)]" />
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

/** Projects visible to the current user (owner/finance/procurement see all; PM & engineers see assigned). */
export function useVisibleProjects() {
  const { state, user } = useStore();
  return useMemo(() => {
    if (!user || ["owner", "finance", "procurement"].includes(user.role)) return state.projects;
    return state.projects.filter((p) => p.pmId === user.id || p.engineerIds.includes(user.id));
  }, [state.projects, user]);
}

export type Permission =
  | "editCommercial"
  | "approve"
  | "purchase"
  | "site"
  | "finance"
  | "manageUsers";

const PERMS: Record<Role, Permission[]> = {
  owner: ["editCommercial", "approve", "purchase", "site", "finance", "manageUsers"],
  pm: ["approve", "site"],
  engineer: ["site"],
  procurement: ["purchase"],
  finance: ["finance"],
};

export function can(role: Role, p: Permission) {
  return PERMS[role].includes(p);
}
