"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, CreateReportInput } from "@/lib/api";
import { toast } from "sonner";
import { CreateReportDialog } from "./create-report-dialog";

interface ReportControlsProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onCreateReport: () => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

const statusLabels: Record<string, string> = {
  all: "Все статусы",
  draft: "Черновик",
  in_progress: "В работе",
  review: "На проверке",
  completed: "Готов",
  archived: "Архив",
};

const statuses = Object.keys(statusLabels);

export function ReportControls({
  searchValue,
  onSearchChange,
  onCreateReport,
  statusFilter,
  onStatusFilterChange,
}: ReportControlsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between z-10">
        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative w-full md:w-75">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или адресу..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-slate-50 border-blue-700"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="z-10">
              <div className=" inline-flex h-9 w-45 items-center justify-between rounded-md border border-blue-700 bg-slate-50 px-3 py-2 text-sm font-normal shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer">
                {statusLabels[statusFilter] || "Все статусы"}
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-45 bg-white">
              {statuses.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => onStatusFilterChange(status)}
                  className={cn(
                    "cursor-pointer justify-between text-black focus:bg-blue-700/30 focus:text-black",
                    status === statusFilter &&
                      "bg-blue-700  font-medium text-amber-50",
                  )}
                >
                  {statusLabels[status]}
                  {status === statusFilter && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-blue-700 hover:bg-blue-800 z-10"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Создать новый отчёт
        </Button>
      </div>
      <CreateReportDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
