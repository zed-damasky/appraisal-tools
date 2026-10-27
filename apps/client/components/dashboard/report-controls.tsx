"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportControlsProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onCreateReport: () => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export function ReportControls({
  searchValue,
  onSearchChange,
  onCreateReport,
  statusFilter,
  onStatusFilterChange,
}: ReportControlsProps) {
  return (
    <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between z-10">
      <div className="flex w-full items-center gap-2 md:w-auto">
        <div className="relative w-full md:w-75">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder="Поиск по названию или адресу..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 z-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => value && onStatusFilterChange(value)}
          
        >
          <SelectTrigger className="w-45 z-10">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="draft">Черновик</SelectItem>
            <SelectItem value="in_progress">В работе</SelectItem>
            <SelectItem value="review">На проверке</SelectItem>
            <SelectItem value="completed">Готов</SelectItem>
            <SelectItem value="archived">Архив</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onCreateReport} className="z-10 bg-blue-700">
        <PlusCircle className="mr-2 h-4 w-4" />
        Создать новый отчёт
      </Button>
    </div>
  );
}
