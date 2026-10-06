import {
  getReport,
  getReportsIndex,
  saveReport,
} from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { AppraiserSnapshot, AppraisingReport } from "@appraisal/types";
import { appraiserSnapshotSchema } from "@appraisal/shared/src/schemas";
import {
  findActiveInsurance,
  findActiveCertificate,
} from "@appraisal/shared/src/utils";

function ensureAppraisers(report: AppraisingReport): AppraiserSnapshot[] {
  if (!Array.isArray(report.appraisers)) {
    report.appraisers = [];
  }
  return report.appraisers;
}

export async function getAppraisers(
  reportId: string,
): Promise<AppraiserSnapshot[]> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");
  return ensureAppraisers(report);
}

export async function addAppraiser(
  reportId: string,
  snapshotData: any,
): Promise<AppraiserSnapshot> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const parsed = appraiserSnapshotSchema.safeParse(snapshotData);
  if (!parsed.success) {
    throw new Error(
      `Невалидные данные снапшота оценщика: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  const newSnapshot = parsed.data as AppraiserSnapshot;
  const appraisers = ensureAppraisers(report);

  if (appraisers.some((a) => a.appraiserId === newSnapshot.appraiserId)) {
    throw new Error("Оценщик с таким ID уже привязан к отчёту");
  }

  const reportDate = report.metadata.reportDatePreperation;

  const activeInsurance = findActiveInsurance(
    newSnapshot.data.insurance || [],
    reportDate,
  );

  if (!activeInsurance) {
    throw new Error(
      `Нет действующего полиса страхования на дату ${reportDate}`,
    );
  }

  const activeCertificate = findActiveCertificate(
    newSnapshot.data.qualificationCertificate || [],
    reportDate,
  );

  if (!activeCertificate) {
    throw new Error(
      `Нет действующего квалификационного аттестата на дату ${reportDate}`,
    );
  }

  appraisers.push(newSnapshot);
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return newSnapshot;
}

export async function removeAppraiser(
  reportId: string,
  appraiserId: string,
): Promise<boolean> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const appraisers = ensureAppraisers(report);
  const initialLength = appraisers.length;

  report.appraisers = appraisers.filter((a) => a.appraiserId !== appraiserId);

  if (report.appraisers.length === initialLength) {
    return false;
  }

  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return true;
}
