"use client";

import { useStore } from "@/lib/store";
import { OwnerDashboard } from "@/components/dashboards/OwnerDashboard";
import { SiteHome } from "@/components/dashboards/SiteHome";
import { FinanceHome } from "@/components/dashboards/FinanceHome";
import { ProcurementBoard } from "@/components/project/Procurement";

export default function Home() {
  const { role } = useStore();
  if (role === "engineer") return <SiteHome />;
  if (role === "finance") return <FinanceHome />;
  if (role === "procurement") return <ProcurementBoard title="Purchases" />;
  return <OwnerDashboard />;
}
