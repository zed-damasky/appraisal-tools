import path from "path";
import {
  getReport,
  getReportsIndex,
  saveReport,
} from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { AppraisingReport, Document } from "@appraisal/types";
import {
  saveDocument,
  DocumentStorageError,
} from "../../../services/documentStorage";
import { AllowedMimeType } from "@appraisal/types";

const REPORT_DOCUMENT_MIME_TYPES = [
  AllowedMimeType.PDF,
  AllowedMimeType.DOC,
  AllowedMimeType.DOCX,
  AllowedMimeType.JPEG,
  AllowedMimeType.PNG,
  AllowedMimeType.WEBP,
  AllowedMimeType.HEIC,
];

function validateFolderName(folder: string): void {
  if (!folder || folder.trim() === "") {
    return;
  }

  if (folder.includes("..") || folder.includes("/") || folder.includes("\\")) {
    throw new DocumentStorageError(
      "Недопустимое имя папки. Запрещены символы '/', '\\' и последовательность '..'",
    );
  }

  const reserved = ["CON", "PRN", "AUX", "NUL", "COM1", "LPT1"];
  const baseName = folder.split(/[\\/]/)[0].toUpperCase();
  if (reserved.includes(baseName)) {
    throw new DocumentStorageError(`Недопустимое имя папки: ${folder}`);
  }
}

export async function getReportDocuments(
  reportId: string,
): Promise<Document[] | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) return null;
  return report.files.docs || [];
}

/**
 * @param folder - Опциональное имя подпапки внутри documents/
 */
export async function addReportDocument(
  reportId: string,
  file: File,
  folder?: string,
): Promise<AppraisingReport | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  if (folder) {
    validateFolderName(folder);
  }

  let targetDir = path.join(report.files.reportDir, "документы");
  if (folder) {
    targetDir = path.join(targetDir, folder);
  }

  const newDoc = await saveDocument(targetDir, file, {
    allowedMimeTypes: REPORT_DOCUMENT_MIME_TYPES,
    relativeTo: report.files.reportDir,
  });

  const docs = report.files.docs || [];
  docs.push(newDoc);
  report.files.docs = docs;
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return report;
}

export async function removeReportDocument(
  reportId: string,
  documentId: string,
): Promise<AppraisingReport | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) return null;

  const docs = report.files.docs || [];
  const initialLength = docs.length;
  const updatedDocs = docs.filter((d) => d.id !== documentId);

  if (updatedDocs.length === initialLength) {
    return null;
  }

  report.files.docs = updatedDocs;
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return report;
}
