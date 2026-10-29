"use client";

import { TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AppraisingReportIndexData, ReportStatus } from "@appraisal/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useState } from "react";

interface ReportRowProps {
  report: AppraisingReportIndexData;
}

const getStatusLabel = (status: ReportStatus) => {
  const labels: Record<ReportStatus, string> = {
    draft: "Черновик",
    in_progress: "В работе",
    review: "На проверке",
    completed: "Готов",
    archived: "Архив",
  };
  return labels[status] || status;
};

const objectTypeLabels: Record<string, string> = {
  immovable_property: "Недвижимость",
  movable_property: "Движимое имущество",
  business: "Бизнес",
};

const getObjectTypesDisplay = (types: string[]) => {
  if (!types || types.length === 0) return "—";

  const uniqueLabels = [...new Set(types.map((t) => objectTypeLabels[t] || t))];

  return uniqueLabels.join(", ");
};

export function ReportRow({ report }: ReportRowProps) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  return (
    <ContextMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
      <tr
        className="border-b transition-colors hover:bg-accent/20 data-[state=selected]:bg-muted cursor-default"
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenuPos({ x: e.clientX, y: e.clientY });
          setContextMenuOpen(true);
        }}
      >
        <TableCell className="font-medium w-25">
          {report.reportSequenceNumber}
        </TableCell>

        <TableCell className="w-30">
          {new Date(report.createdAt).toLocaleDateString()}
        </TableCell>

        <TableCell
          className="max-w-50 truncate hidden md:table-cell"
          title={report.title}
        >
          {report.title}
        </TableCell>

        <TableCell className="w-30 hidden md:table-cell">
          {getObjectTypesDisplay(report.objectTypes)}
        </TableCell>

        <TableCell className="w-30">
          <Badge
            variant={report.status === "completed" ? "default" : "secondary"}
          >
            {getStatusLabel(report.status)}
          </Badge>
        </TableCell>
      </tr>

      <ContextMenuContent
        className="bg-white text-slate-900"
        style={{
          position: "fixed",
          left: contextMenuPos.x,
          top: contextMenuPos.y,
        }}
      >
        <ContextMenuItem onClick={() => console.log("Открыть", report.id)}>
          Открыть отчёт
        </ContextMenuItem>
        <ContextMenuItem onClick={() => console.log("Дублировать", report.id)}>
          Дублировать
        </ContextMenuItem>
        <ContextMenuItem onClick={() => console.log("Статус", report.id)}>
          Изменить статус
        </ContextMenuItem>
        <ContextMenuItem onClick={() => console.log("Папка", report.id)}>
          Открыть папку
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => console.log("Удалить", report.id)}
        >
          Удалить
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
