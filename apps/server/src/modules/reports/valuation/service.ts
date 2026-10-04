import {
  getReport,
  getReportsIndex,
  saveReport,
} from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { AppraisingReport } from "@appraisal/types";
import { valuationResultsSchema } from "@appraisal/shared/src/schemas";

export async function updateValuationResults(
  reportId: string,
  updates: any,
): Promise<AppraisingReport["valuationResults"] | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const parsed = valuationResultsSchema.partial().safeParse(updates);
  if (!parsed.success) {
    throw new Error(
      `Невалидные данные результатов оценки: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  const updatedResults = {
    ...report.valuationResults,
    ...parsed.data,
  };

  if (parsed.data?.approaches) {
  }

  report.valuationResults = updatedResults;
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return report.valuationResults;
}
