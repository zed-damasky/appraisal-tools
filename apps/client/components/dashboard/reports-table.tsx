"use client";

import { useEffect, useState } from "react";
import { Table, TableBody } from "@/components/ui/table";
import { ReportRow } from "./report-row";
import { ReportTableHeader } from "./report-table-header";
import { ReportControls } from "./report-controls";
import { AppraisingReportIndexData } from "@appraisal/types";
import { SeamlessPatternBackground } from "../background/seamless-pattern-background";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { api } from "@/lib/api";

export function ReportsTable() {
  const [reports, setReports] = useState<AppraisingReportIndexData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { token } = useAuthStore();

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const loadReports = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        const data = await api.reports.list();
        setReports(data);
      } catch (error) {
        console.error("Ошибка загрузки отчётов:", error);
        setReports([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReports();
  }, [token]);

  const filteredReports = reports.filter((report) => {
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

  const handleReportDeleted = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    console.log(`Удаление ${reportId}`);
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
                  <ReportRow
                    key={report.id}
                    report={report}
                    onDeleted={handleReportDeleted}
                  />
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
