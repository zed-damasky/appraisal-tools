"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ReportsTable } from "@/components/dashboard/reports-table";

export default function DashboardPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  if (!token) return null; // Или лоадер

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />
      <main className="container mx-auto p-6 space-y-8 z-10">
        <ReportsTable />
      </main>
    </div>
  );
}
