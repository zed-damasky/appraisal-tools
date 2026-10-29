"use client";

import { useState } from "react";
import { Table, TableBody } from "@/components/ui/table";
import { ReportRow } from "./report-row";
import { ReportTableHeader } from "./report-table-header";
import { ReportControls } from "./report-controls";
import { AppraisingReportIndexData } from "@appraisal/types";
import { SeamlessPatternBackground } from "../background/seamless-pattern-background";

const mockReports: AppraisingReportIndexData[] = [
  {
    id: "1",
    reportSequenceNumber: "001-2026",
    reportDatePreperation: "2026-10-25",
    appraisingContractId: "c1",
    appraisingReportId: "r1",
    title: "Квартира на ул. Ленина, 15",
    status: "completed",
    objectTypes: ["immovable_property"],
    clientName: "Иванов И.И.",
    reportDir: "/reports/001",
    createdAt: "2026-10-25T10:00:00Z",
    updatedAt: "2026-10-26T12:00:00Z",
  },
  {
    id: "2",
    reportSequenceNumber: "002-2026",
    reportDatePreperation: "2026-10-26",
    appraisingContractId: "c2",
    appraisingReportId: "r2",
    title: "Toyota Camry 2020",
    status: "in_progress",
    objectTypes: ["movable_property"],
    clientName: "Петров П.П.",
    reportDir: "/reports/002",
    createdAt: "2026-10-26T09:00:00Z",
    updatedAt: "2026-10-26T09:00:00Z",
  },
];

export function ReportsTable() {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredReports = mockReports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      report.reportSequenceNumber.includes(searchValue);
    const matchesStatus =
      statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateReport = () => {
    console.log("Создание нового отчёта...");
  };

  return (
    <div className="space-y-4">
      <SeamlessPatternBackground
        gradient={{ from: "#e0f2fe", to: "#bae6fd", angle: 13 }}
        iconColor="#000fff"
        tileSize={250}
        iconsPerTile={9}
        iconSize={28}
        className="opacity-50"
      />
      <div className=" ">
        <ReportControls
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onCreateReport={handleCreateReport}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <div className="rounded-md border">
          <Table>
            <ReportTableHeader />
            <TableBody className="bg-slate-50">
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <ReportRow key={report.id} report={report} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Отчёты не найдены.
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
