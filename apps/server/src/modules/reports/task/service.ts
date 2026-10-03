import {
  getReport,
  getReportsIndex,
  saveReport,
} from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { AppraisingReport } from "@appraisal/types";
import { appraisingReportTaskSchema } from "@appraisal/shared/src/schemas";

export async function updateReportTask(
  reportId: string,
  taskUpdates: any,
): Promise<AppraisingReport["reportTask"] | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const parsed = appraisingReportTaskSchema.partial().safeParse(taskUpdates);
  if (!parsed.success) {
    throw new Error(
      `Невалидные данные задания: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  const updatedTask = {
    ...report.reportTask,
    ...parsed.data,
    id: report.reportTask.id,
  };

  report.reportTask = updatedTask;
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return updatedTask;
}
