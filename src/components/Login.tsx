"use client";

import { ArrowUpRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/types";
import { Avatar, Card, Headline } from "./ui";
import { Logo } from "./AppShell";

const ROLE_HINT: Record<string, string> = {
  owner: "Company dashboard, profit forecast, alerts",
  pm: "Assigned projects, approvals, progress",
  engineer: "Daily reports, labour, measurements — phone first",
  procurement: "Requests, quotations, POs, receipts",
  finance: "Billing, collections, project expenses",
};

export function Login() {
  const { state, login } = useStore();
  return (
    <div className="min-h-dvh px-4 py-8 md:flex md:items-center md:justify-center">
      <div className="mx-auto w-full max-w-[980px] md:grid md:grid-cols-[1fr_1.1fr] md:gap-10">
        <div className="mb-8 md:mb-0 md:pt-6">
          <div className="mb-10 flex items-center gap-2.5">
            <Logo />
            <span className="text-[20px] font-semibold tracking-[-0.02em]">Sitebook</span>
          </div>
          <Headline top="Know if your project" bottom="is still profitable." />
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[#5a5a66]">
            What you estimated, bought, built, spent and billed — connected from site to owner, in one place.
          </p>
          <div className="mt-8 hidden rounded-[26px] bg-gradient-to-r from-blue to-blue-2 p-5 text-white md:block">
            <div className="text-[13px] opacity-80">{state.company.name}</div>
            <div className="mt-1 text-[22px] font-semibold">{state.projects.filter((p) => p.status === "Active").length} active sites</div>
          </div>
        </div>
        <div>
          <div className="mb-3 px-1 text-[15px] font-semibold">Sign in as</div>
          <p className="mb-4 px-1 text-[13px] text-muted">Demo workspace — pick a role to see its view. You can switch any time from the account menu.</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {state.users.map((u) => (
              <Card key={u.id} as="button" onClick={() => login(u.id)} className="flex items-center gap-3 !p-4">
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{u.name}</div>
                  <div className="text-[13px] text-blue">{ROLE_LABEL[u.role]}</div>
                  <div className="mt-0.5 line-clamp-1 text-[12px] text-muted">{ROLE_HINT[u.role]}</div>
                </div>
                <ArrowUpRight size={18} className="shrink-0 text-muted" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
