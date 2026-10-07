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

const PHOTO_MIME_TYPES = [
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

export async function getReportPhotos(
  reportId: string,
): Promise<Document[] | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) return null;
  return report.files.photos || [];
}

/**
 * @param folder - Опциональное имя подпапки внутри фото/
 */
export async function addReportPhoto(
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

  let targetDir = path.join(report.files.reportDir, "фото");
  if (folder) {
    targetDir = path.join(targetDir, folder);
  }

  const newDoc = await saveDocument(targetDir, file, {
    allowedMimeTypes: PHOTO_MIME_TYPES,
    relativeTo: report.files.reportDir,
  });

  const photos = report.files.photos || [];
  photos.push(newDoc);
  report.files.photos = photos;
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return report;
}

export async function removeReportPhoto(
  reportId: string,
  photoId: string,
): Promise<AppraisingReport | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) return null;

  const photos = report.files.photos || [];
  const initialLength = photos.length;
  const updatedPhotos = photos.filter((p) => p.id !== photoId);

  if (updatedPhotos.length === initialLength) {
    return null;
  }

  report.files.photos = updatedPhotos;
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return report;
}
