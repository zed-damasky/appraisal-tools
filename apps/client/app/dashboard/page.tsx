"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { SeamlessPatternBackground } from "@/components/background/seamless-pattern-background";

export default function DashboardPage() {
  const router = useRouter();

  const { token, isAuthenticated, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!isAuthenticated && !token) {
      const timer = setTimeout(() => {
        if (!useAuthStore.getState().token) {
          router.push("/login");
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [token, isAuthenticated, router]);

  if (!token)
    return (
      <div className="flex h-screen items-center justify-center">
        Загрузка...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />
      <main className="container mx-auto px-6 space-y-8">
        <ReportsTable />
      </main>
    </div>
  );
}
