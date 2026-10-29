"use client";

import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ReportTableHeader() {
  return (
    <TableHeader className="bg-slate-50">
      <TableRow>
        <TableHead className="">Номер</TableHead>
        <TableHead className="w-30">Дата создания</TableHead>
        <TableHead className="hidden md:table-cell">Название объекта</TableHead>
        <TableHead className="w-30 hidden md:table-cell">Тип объекта</TableHead>
        <TableHead className="w-30">Статус</TableHead>
      </TableRow>
    </TableHeader>
  );
}
