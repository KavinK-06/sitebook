"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, ChevronRight, History, LogOut, Package, RotateCcw, Search, ShoppingBag, Truck, Users } from "lucide-react";
import { can, useStore } from "@/lib/store";
import { num, uid } from "@/lib/format";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { Avatar, Button, Card, Field, IconBubble, Input, NumInput, PageHeader, Pill, Select, Segmented, Sheet } from "@/components/ui";
import { HistoryTab } from "@/components/project/Misc";

type View = "menu" | "company" | "users" | "vendors" | "materials" | "audit";

const ROLE_PERMS: Record<Role, string> = {
  owner: "Everything: projects, BOQ, estimate, approvals, cost, forecast, users",
  pm: "Assigned projects, site entries, approve measurements & requests; no commercial edits",
  engineer: "Daily reports, labour, consumption, measurements, photos, issues, requests",
  procurement: "Requests, quotations, purchase orders, receipts, vendors",
  finance: "Billing, payments, project expenses, collections",
};

export default function MorePage() {
  const { state, user, role, logout, reset } = useStore();
  const [view, setView] = useState<View>("menu");
  const [confirmReset, setConfirmReset] = useState(false);

  if (view !== "menu")
    return (
      <div>
        <button onClick={() => setView("menu")} className="mb-3 text-[14px] text-muted hover:text-ink">
          ← More
        </button>
        {view === "company" && <CompanyView />}
        {view === "users" && <UsersView />}
        {view === "vendors" && <VendorsView />}
        {view === "materials" && <MaterialsView />}
        {view === "audit" && (
          <>
            <PageHeader title="Audit trail" subtitle="Every commercially important change" />
            <HistoryTab />
          </>
        )}
      </div>
    );

  const items: { key: View | "procurement" | "search"; label: string; hint: string; icon: React.ReactNode; show: boolean }[] = [
    { key: "company", label: "Company", hint: state.company.name, icon: <Building2 size={20} />, show: true },
    { key: "users", label: "Users & roles", hint: `${state.users.length} people`, icon: <Users size={20} />, show: true },
    { key: "procurement", label: "Procurement", hint: "Requests, quotes, POs, receipts", icon: <ShoppingBag size={20} />, show: true },
    { key: "vendors", label: "Vendors", hint: `${state.vendors.length} vendors`, icon: <Truck size={20} />, show: true },
    { key: "materials", label: "Materials", hint: `${state.materials.length} materials & rates`, icon: <Package size={20} />, show: true },
    { key: "audit", label: "Audit trail", hint: "Who changed what", icon: <History size={20} />, show: can(role, "approve") || can(role, "finance") },
    { key: "search", label: "Search", hint: "Find anything", icon: <Search size={20} />, show: true },
  ];

  return (
    <div>
      <PageHeader title="More" />
      <Card className="mb-4 flex items-center gap-4">
        <Avatar name={user!.name} className="h-14 w-14 text-[17px]" />
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-semibold">{user!.name}</div>
          <div className="text-[14px] text-blue">{ROLE_LABEL[user!.role]}</div>
          <div className="text-[13px] text-muted">{user!.email}</div>
        </div>
        <Button variant="white" size="sm" icon={<LogOut size={15} />} onClick={logout}>
          Switch user
        </Button>
      </Card>
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-card">
        {items
          .filter((i) => i.show)
          .map((i, idx) => {
            const inner = (
              <>
                <IconBubble tone="gray">{i.icon}</IconBubble>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-semibold">{i.label}</div>
                  <div className="text-[13px] text-muted">{i.hint}</div>
                </div>
                <ChevronRight size={18} className="text-muted" />
              </>
            );
            const cls = `flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-bg/60 ${idx > 0 ? "border-t border-line" : ""}`;
            return i.key === "procurement" || i.key === "search" ? (
              <Link key={i.key} href={`/${i.key}`} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={i.key} onClick={() => setView(i.key as View)} className={cls}>
                {inner}
              </button>
            );
          })}
      </div>
      <Card className="mt-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Demo data</div>
          <div className="text-[13px] text-muted">Data is stored in this browser. Reset to regenerate the sample projects.</div>
        </div>
        <Button variant="danger" size="sm" icon={<RotateCcw size={15} />} onClick={() => setConfirmReset(true)}>
          Reset
        </Button>
      </Card>
      <Sheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="white" className="flex-1" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                reset();
                setConfirmReset(false);
              }}
            >
              Reset everything
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#4a4a55]">All entries you made in this browser will be replaced with fresh sample data.</p>
      </Sheet>
    </div>
  );
}

function CompanyView() {
  const { state, role, update } = useStore();
  const [f, setF] = useState(state.company);
  const editable = can(role, "manageUsers");
  return (
    <div>
      <PageHeader title="Company" />
      <Card className="space-y-4">
        <Field label="Company name">
          <Input value={f.name} disabled={!editable} onChange={(e) => setF({ ...f, name: e.target.value })} className="!bg-bg" />
        </Field>
        <Field label="City">
          <Input value={f.city} disabled={!editable} onChange={(e) => setF({ ...f, city: e.target.value })} className="!bg-bg" />
        </Field>
        <Field label="GSTIN">
          <Input value={f.gstin ?? ""} disabled={!editable} onChange={(e) => setF({ ...f, gstin: e.target.value })} className="!bg-bg" />
        </Field>
        {editable && <Button onClick={() => update((d) => void (d.company = f))}>Save</Button>}
      </Card>
    </div>
  );
}

function UsersView() {
  const { state, role, add, patch } = useStore();
  const [filter, setFilter] = useState<"all" | Role>("all");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", role: "engineer" as Role });
  const manage = can(role, "manageUsers");
  const users = state.users.filter((u) => filter === "all" || u.role === filter);
  return (
    <div>
      <PageHeader title="Users & roles" actions={manage && <Button onClick={() => setAdding(true)}>Invite user</Button>} />
      <Segmented className="mb-4" value={filter} onChange={setFilter} options={[{ value: "all" as const, label: "All" }, ...(Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))]} />
      <div className="space-y-2">
        {users.map((u) => {
          const assigned = state.projects.filter((p) => p.pmId === u.id || p.engineerIds.includes(u.id));
          return (
            <Card key={u.id} className="flex flex-wrap items-center gap-3 !p-4">
              <Avatar name={u.name} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{u.name}</div>
                <div className="text-[13px] text-muted">
                  {u.email} · {u.phone}
                </div>
                {assigned.length > 0 && <div className="text-[12px] text-muted">{assigned.map((p) => p.name.split("–")[0].trim()).join(", ")}</div>}
              </div>
              {manage ? (
                <Select value={u.role} onChange={(e) => patch("users", u.id, { role: e.target.value as Role }, `Changed ${u.name}'s role`)} className="!h-10 !w-48 !bg-bg">
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
              ) : (
                <Pill tone="blue">{ROLE_LABEL[u.role]}</Pill>
              )}
            </Card>
          );
        })}
      </div>
      <h3 className="mb-3 mt-8 px-1 text-[19px] font-semibold">What each role can do</h3>
      <Card className="divide-y divide-line !py-1">
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <div key={r} className="py-3">
            <div className="font-semibold">{ROLE_LABEL[r]}</div>
            <div className="text-[13px] text-muted">{ROLE_PERMS[r]}</div>
          </div>
        ))}
      </Card>
      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Invite user"
        footer={
          <Button
            className="flex-1"
            disabled={!f.name || !f.email}
            onClick={() => {
              add("users", { id: uid("u"), ...f }, `Invited ${f.name} as ${ROLE_LABEL[f.role]}`);
              setAdding(false);
              setF({ name: "", email: "", phone: "", role: "engineer" });
            }}
          >
            Add user
          </Button>
        }
      >
        <div className="space-y-3">
          <Field label="Name">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Sheet>
    </div>
  );
}

function VendorsView() {
  const { state, role, update } = useStore();
  const [f, setF] = useState({ name: "", phone: "", city: "", supplies: "" });
  const [adding, setAdding] = useState(false);
  const spend = (id: string) => state.pos.filter((p) => p.vendorId === id && p.status !== "Cancelled").reduce((a, p) => a + p.total, 0);
  return (
    <div>
      <PageHeader title="Vendors" actions={(can(role, "purchase") || can(role, "editCommercial")) && <Button onClick={() => setAdding(true)}>Add vendor</Button>} />
      <div className="grid gap-2 md:grid-cols-2">
        {state.vendors.map((v) => (
          <Card key={v.id} className="!p-4">
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-semibold">{v.name}</div>
                <div className="text-[13px] text-muted">
                  {v.supplies} · {v.city} · {v.phone}
                </div>
              </div>
              <div className="tnum text-right text-[13px] text-muted">
                ₹{num(spend(v.id) / 1e5, 1)} L<div>ordered</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Add vendor"
        footer={
          <Button
            className="flex-1"
            disabled={!f.name}
            onClick={() => {
              update((d) => void d.vendors.push({ id: uid("ven"), ...f }));
              setAdding(false);
              setF({ name: "", phone: "", city: "", supplies: "" });
            }}
          >
            Save vendor
          </Button>
        }
      >
        <div className="space-y-3">
          {(["name", "supplies", "phone", "city"] as const).map((k) => (
            <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
              <Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function MaterialsView() {
  const { state, role, update } = useStore();
  const [f, setF] = useState({ name: "", unit: "nos", rate: "" as number | "" });
  const editable = can(role, "purchase") || can(role, "editCommercial");
  return (
    <div>
      <PageHeader title="Materials" subtitle="Standard rates used to pre-fill estimates and POs" />
      <Card className="divide-y divide-line !py-1">
        {state.materials.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <div className="font-medium">{m.name}</div>
              <div className="text-[12px] text-muted">per {m.unit}</div>
            </div>
            {editable ? (
              <NumInput value={m.rate} onChange={(v) => update((d) => void (d.materials.find((x) => x.id === m.id)!.rate = Number(v) || 0))} className="!h-10 !w-32 !bg-bg text-right" />
            ) : (
              <span className="tnum font-semibold">₹{num(m.rate)}</span>
            )}
          </div>
        ))}
      </Card>
      {editable && (
        <Card className="mt-4 grid grid-cols-[1fr_100px_120px_auto] items-end gap-2">
          <Field label="New material">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="!bg-bg" />
          </Field>
          <Field label="Unit">
            <Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="!bg-bg" />
          </Field>
          <Field label="Rate ₹">
            <NumInput value={f.rate} onChange={(v) => setF({ ...f, rate: v })} className="!bg-bg" />
          </Field>
          <Button
            disabled={!f.name || !f.rate}
            onClick={() => {
              update((d) => void d.materials.push({ id: uid("mat"), name: f.name, unit: f.unit, rate: Number(f.rate) }));
              setF({ name: "", unit: "nos", rate: "" });
            }}
          >
            Add
          </Button>
        </Card>
      )}
    </div>
  );
}
