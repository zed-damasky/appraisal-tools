import { getReport, getReportsIndex, saveReport } from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { AppraisingReport } from "@appraisal/types";
import { marketAnalysisSchema } from "@appraisal/shared/src/schemas";

export async function updateMarketAnalysis(
  reportId: string,
  updates: any,
): Promise<AppraisingReport["marketAnalysis"] | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const parsed = marketAnalysisSchema.partial().safeParse(updates);
  if (!parsed.success) {
    throw new Error(
      `Невалидные данные анализа рынка: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  const updatedAnalysis = {
    ...report.marketAnalysis,
    ...parsed.data,
    id: report.marketAnalysis.id || crypto.randomUUID(),
  };

  report.marketAnalysis = updatedAnalysis as any;
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return report.marketAnalysis;
}