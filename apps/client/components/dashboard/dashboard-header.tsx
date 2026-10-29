"use client";

import { Building2, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";
import { SettingsModal } from "./settings-modal";

export function DashboardHeader() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error("Ошибка при выходе:", error);
    } finally {
      logout();
      toast.success("Вы успешно вышли из системы");
      router.push("/login");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Левая часть: Логотип */}
          <div
            className="flex items-center gap-2 font-bold text-xl text-blue-700 cursor-pointer"
            onClick={() => router.push("/dashboard")}
          >
            <Building2 size={28} />
            <span>Отчёты об оценке</span>
          </div>

          {/* Правая часть: Профиль пользователя */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent/20  transition-colors cursor-pointer ">
                  <span className="text-sm font-medium text-black ">
                    {user?.fullName || "Пользователь"}
                  </span>
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56 bg-white" align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal pb-2 pt-1">
                    <p className="text-xs text-muted-foreground truncate max-w-50">
                      {user?.contacts.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => setIsSettingsOpen(true)}
                    className="cursor-pointer text-sm text-black"

                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Настройки</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600 cursor-pointer text-sm"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Модальное окно настроек  */}
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
