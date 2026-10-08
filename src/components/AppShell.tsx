"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";
import { Bell, FolderKanban, Home, LayoutGrid, Plus, ShoppingBag, LogOut, Search } from "lucide-react";
import { useStore, useVisibleProjects } from "@/lib/store";
import { getAlerts } from "@/lib/alerts";
import { ROLE_LABEL } from "@/lib/types";
import { Avatar, cx } from "./ui";
import { AddSheet, type QuickAction } from "./forms/AddSheet";
import { Login } from "./Login";

interface ShellCtx {
  openAdd: (action?: QuickAction, projectId?: string) => void;
}
const Ctx = createContext<ShellCtx>({ openAdd: () => {} });
export const useShell = () => useContext(Ctx);

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/procurement", label: "Procurement", icon: ShoppingBag, desktopOnly: true },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/more", label: "More", icon: LayoutGrid },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, user, logout } = useStore();
  const pathname = usePathname();
  const projects = useVisibleProjects();
  const [add, setAdd] = useState<{ open: boolean; action?: QuickAction; projectId?: string }>({ open: false });
  const alertCount = useMemo(() => {
    const ids = new Set(projects.map((p) => p.id));
    return getAlerts(state).filter((a) => ids.has(a.projectId) && (a.severity === "critical" || a.severity === "warning")).length;
  }, [state, projects]);

  const routeProject = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const ctx = useMemo<ShellCtx>(
    () => ({ openAdd: (action, projectId) => setAdd({ open: true, action, projectId }) }),
    [],
  );

  if (!user) return <Login />;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const canAdd = user.role !== "finance";

  return (
    <Ctx.Provider value={ctx}>
      <div className="min-h-dvh md:flex">
        {/* Desktop sidebar */}
        <aside className="no-scrollbar sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col overflow-y-auto px-4 py-6 md:flex">
          <Link href="/" className="mb-8 flex shrink-0 items-center gap-2.5 px-3">
            <Logo />
            <span className="text-[19px] font-semibold tracking-[-0.02em]">Sitebook</span>
          </Link>
          {canAdd && (
            <button
              onClick={() => ctx.openAdd(undefined, routeProject)}
              className="mb-6 flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-medium text-white hover:bg-black/85"
            >
              <Plus size={19} /> New entry
            </button>
          )}
          <nav className="space-y-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  "flex h-11 items-center gap-3 rounded-full px-4 text-[15px] transition",
                  isActive(n.href) ? "bg-white font-semibold text-ink" : "text-[#5a5a66] hover:bg-white/60",
                )}
              >
                <n.icon size={19} strokeWidth={isActive(n.href) ? 2.3 : 1.8} />
                <span className="flex-1">{n.label}</span>
                {n.href === "/alerts" && alertCount > 0 && (
                  <span className="rounded-full bg-red px-2 py-0.5 text-[11px] font-semibold text-white">{alertCount}</span>
                )}
              </Link>
            ))}
            <Link
              href="/search"
              className={cx("flex h-11 items-center gap-3 rounded-full px-4 text-[15px] transition", isActive("/search") ? "bg-white font-semibold" : "text-[#5a5a66] hover:bg-white/60")}
            >
              <Search size={19} strokeWidth={1.8} /> Search
            </Link>
          </nav>
          <div className="mt-auto">
            <div className="mb-2 px-3 text-[12px] font-medium uppercase tracking-wide text-muted">Projects</div>
            <div className="no-scrollbar max-h-[22vh] space-y-0.5 overflow-y-auto">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className={cx("block truncate rounded-full px-4 py-2 text-[14px]", routeProject === p.id ? "bg-white font-medium" : "text-[#5a5a66] hover:bg-white/60")}
                >
                  {p.name}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-[22px] bg-white p-3">
              <Avatar name={user.name} className="h-10 w-10 text-[13px]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{user.name}</div>
                <div className="truncate text-[12px] text-muted">{ROLE_LABEL[user.role]}</div>
              </div>
              <button onClick={logout} aria-label="Switch user" title="Switch user" className="rounded-full p-2 text-muted hover:bg-bg hover:text-ink">
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-32 pt-5 md:px-8 md:pb-12 md:pt-8">
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>

        {/* Mobile bottom navigation: Home | Projects | Add | Alerts | More */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="mx-auto grid h-[72px] max-w-md grid-cols-5 items-center">
            {[NAV[0], NAV[1]].map((n) => (
              <BottomItem key={n.href} href={n.href} label={n.label} icon={n.icon} active={isActive(n.href)} />
            ))}
            <div className="flex justify-center">
              {canAdd ? (
                <button
                  onClick={() => ctx.openAdd(undefined, routeProject)}
                  aria-label="Add"
                  className="-mt-7 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-ink text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] active:scale-95"
                >
                  <Plus size={28} />
                </button>
              ) : (
                <BottomItem href="/procurement" label="Purchases" icon={ShoppingBag} active={isActive("/procurement")} />
              )}
            </div>
            <BottomItem href="/alerts" label="Alerts" icon={Bell} active={isActive("/alerts")} badge={alertCount} />
            <BottomItem href="/more" label="More" icon={LayoutGrid} active={isActive("/more") || isActive("/search") || isActive("/procurement")} />
          </div>
        </nav>

        <AddSheet
          open={add.open}
          initialAction={add.action}
          projectId={add.projectId ?? routeProject}
          onClose={() => setAdd({ open: false })}
        />
      </div>
    </Ctx.Provider>
  );
}

function BottomItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link href={href} className={cx("relative flex flex-col items-center gap-1 text-[12px]", active ? "font-semibold text-ink" : "text-muted")}>
      <Icon size={23} strokeWidth={active ? 2.3 : 1.6} />
      {label}
      {!!badge && <span className="absolute -top-1 left-1/2 ml-2 rounded-full bg-red px-1.5 text-[10px] font-semibold text-white">{badge}</span>}
    </Link>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-blue text-white" style={{ width: size, height: size }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20h18" />
        <path d="M5 20V10l7-5 7 5v10" />
        <path d="M10 20v-5h4v5" />
      </svg>
    </span>
  );
}
