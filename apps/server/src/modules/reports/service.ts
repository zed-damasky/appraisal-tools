import path from "path";
import {
  getReportsIndex,
  getReport,
  saveReport,
  ensureReportStructure,
  deleteReport,
} from "../../services/storage";
import { getBaseDir } from "../../config";
import type {
  AppraisingReport,
  AppraisingReportIndexData,
  ReportStatus,
} from "@appraisal/types";

export async function getReportsList(filters?: {
  status?: ReportStatus;
  objectType?: string;
  search?: string;
}): Promise<AppraisingReportIndexData[]> {
  const baseDir = getBaseDir();
  const index = await getReportsIndex(baseDir);

  if (!filters) return index;

  return index.filter((report) => {
    if (filters.status && report.status !== filters.status) return false;

    if (
      filters.objectType &&
      !report.objectTypes.includes(filters.objectType as any)
    ) {
      return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = report.title.toLowerCase().includes(searchLower);
      const matchesClient = report.clientName
        .toLowerCase()
        .includes(searchLower);
      if (!matchesTitle && !matchesClient) return false;
    }

    return true;
  });
}

export async function getReportById(
  reportId: string,
): Promise<AppraisingReport | null> {
  const baseDir = getBaseDir();
  return await getReport(baseDir, reportId);
}

export async function createReport(data: {
  reportSequenceNumber: string;
  clientName: string;
  reportDir: string;
  appraisingContractId: string;
}): Promise<AppraisingReportIndexData> {
  const baseDir = getBaseDir();
  //const index = await getReportsIndex(baseDir);
  const now = new Date().toISOString();
  const reportId = crypto.randomUUID();

  const dateStr = now.split("T")[0].replace(/-/g, "");
  const folderName = `Отчёт_${data.reportSequenceNumber}_${dateStr}`;
  const fullReportDir = path.join(data.reportDir, folderName);

  await ensureReportStructure(fullReportDir);

  const initialReport: AppraisingReport = {
    id: reportId,
    status: "draft",
    metadata: {
      id: reportId,
      reportSequenceNumber: data.reportSequenceNumber,
      reportDatePreperation: now.split("T")[0],
      appraisingContractId: data.appraisingContractId,
      appraisingReportId: reportId,
    },
    reportTask: {
      id: crypto.randomUUID(),
      appraisingContractId: data.appraisingContractId,
      appraisingReportId: reportId,
      appraisingDate: now.split("T")[0],
      valueVariants: [],
      appraisingPurpose: "",
      commongAssumptions: [],
      specialAssumptions: [],
      otherAssumptions: [],
      appraisingRestrictions: [],
      usingRestrictions: [],
      formOfAppraisingReport: "electronic",
      usersOfReport: "",
      externalSpecialist: "",
      specificRequirements: [],
    },
    marketAnalysis: [],
    appraisers: [],
    files: {
      reportDir: fullReportDir,
      folderName,
      photos: [],
      docs: [],
    },
    valuationResults: {
      approachesUsed: [],
      approachesRejected: [],
      reconciliationDescription: "",
      finalValue: 0,
      currency: "RUB",
    },
    objects: [],
    createdAt: now,
    updatedAt: now,
  };

  await saveReport(baseDir, initialReport, data.clientName);

  const updatedIndex = await getReportsIndex(baseDir);
  const newIndexEntry = updatedIndex.find((r) => r.id === reportId);

  if (!newIndexEntry) {
    throw new Error("Не удалось создать запись в индексе отчётов");
  }

  return newIndexEntry;
}

export async function updateReport(
  reportId: string,
  updates: Partial<AppraisingReport>,
  clientName?: string,
): Promise<AppraisingReport | null> {
  const baseDir = getBaseDir();
  const existingReport = await getReport(baseDir, reportId);

  if (!existingReport) {
    return null;
  }

  const updatedReport: AppraisingReport = {
    ...existingReport,
    ...updates,
    id: existingReport.id,
    updatedAt: new Date().toISOString(),
  };

  let finalClientName = clientName;
  if (!finalClientName) {
    const index = await getReportsIndex(baseDir);
    finalClientName =
      index.find((r) => r.id === reportId)?.clientName ||
      "Неизвестный заказчик";
  }

  await saveReport(baseDir, updatedReport, finalClientName);

  return updatedReport;
}

export async function deleteReportById(reportId: string): Promise<boolean> {
  const baseDir = getBaseDir();

  return await deleteReport(baseDir, reportId);
}

export async function duplicateReport(
  reportId: string,
): Promise<AppraisingReportIndexData | null> {
  const baseDir = getBaseDir();
  const originalReport = await getReport(baseDir, reportId);
  if (!originalReport) return null;

  const index = await getReportsIndex(baseDir);
  const originalIndexEntry = index.find((r) => r.id === reportId);
  if (!originalIndexEntry) return null;

  const now = new Date().toISOString();
  const newReportId = crypto.randomUUID();

  const newSequenceNumber = `${originalReport.metadata.reportSequenceNumber} (копия)`;

  const dateStr = now.split("T")[0].replace(/-/g, "");
  const newFolderName = `Отчёт_${newSequenceNumber}_${dateStr}`;

  const newReportDir = path.join(
    path.dirname(originalReport.files.reportDir),
    newFolderName,
  );

  await ensureReportStructure(newReportDir);

  const clonedReport: AppraisingReport = {
    ...originalReport,
    id: newReportId,
    status: "draft",
    metadata: {
      ...originalReport.metadata,
      id: newReportId,
      reportSequenceNumber: newSequenceNumber,
      reportDatePreperation: now.split("T")[0],
      appraisingReportId: newReportId,
    },
    files: {
      ...originalReport.files,
      reportDir: newReportDir,
      folderName: newFolderName,
      pdf: undefined,
      doc: undefined,
      xls: undefined,
      photos: [],
      docs: [],
    },
    createdAt: now,
    updatedAt: now,
  };

  await saveReport(baseDir, clonedReport, originalIndexEntry.clientName);

  const updatedIndex = await getReportsIndex(baseDir);
  return updatedIndex.find((r) => r.id === newReportId) ?? null;
}

export async function changeReportStatus(
  reportId: string,
  newStatus: ReportStatus,
): Promise<AppraisingReport | null> {
  return await updateReport(reportId, { status: newStatus });
}
