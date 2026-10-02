import path from "path";
import { getReport, saveReport, getReportsIndex } from "../../services/storage";
import { getBaseDir } from "../../config";
import { AllowedMimeType, Document } from "@appraisal/types";

const PHOTO_MIME_TYPES = [
  AllowedMimeType.JPEG,
  AllowedMimeType.PNG,
  AllowedMimeType.WEBP,
  AllowedMimeType.HEIC,
];

const DOC_MIME_TYPES = [...PHOTO_MIME_TYPES, AllowedMimeType.PDF];

function getExtensionFromMime(mime: AllowedMimeType): string {
  switch (mime) {
    case AllowedMimeType.JPEG:
      return ".jpg";
    case AllowedMimeType.PNG:
      return ".png";
    case AllowedMimeType.WEBP:
      return ".webp";
    case AllowedMimeType.HEIC:
      return ".heic";
    case AllowedMimeType.PDF:
      return ".pdf";
    default:
      return ".bin";
  }
}

export async function uploadFile(
  reportId: string,
  category: "photos" | "docs",
  file: File,
): Promise<Document> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const mimeType = file.type as AllowedMimeType;
  const allowedTypes =
    category === "photos" ? PHOTO_MIME_TYPES : DOC_MIME_TYPES;

  if (!allowedTypes.includes(mimeType)) {
    throw new Error(
      `Недопустимый тип файла. Разрешены: ${allowedTypes.join(", ")}`,
    );
  }

  const fileId = crypto.randomUUID();
  const ext = getExtensionFromMime(mimeType);
  const fileName = `${fileId}${ext}`;

  const targetDir = path.join(report.files.reportDir, category);
  const filePath = path.join(targetDir, fileName);

  await Bun.write(filePath, file);

  const newDoc: Document = {
    id: fileId,
    name: file.name,
    path: `${category}/${fileName}`,
    mimeType,
    size: file.size,
  };

  report.files[category].push(newDoc);
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";

  await saveReport(baseDir, report, clientName);

  return newDoc;
}

export async function deleteFile(
  reportId: string,
  category: "photos" | "docs",
  fileId: string,
): Promise<boolean> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const filesArray = report.files[category];
  if (!filesArray) return false;

  const initialLength = filesArray.length;
  report.files[category] = filesArray.filter((f) => f.id !== fileId);

  if (report.files[category].length === initialLength) {
    return false;
  }

  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";

  await saveReport(baseDir, report, clientName);

  return true;
}

export async function getFileInfo(
  reportId: string,
  category: "photos" | "docs",
  fileId: string,
): Promise<{ fullPath: string; meta: Document } | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) return null;

  const meta = report.files[category]?.find((f) => f.id === fileId);
  if (!meta) return null;

  const fullPath = path.join(report.files.reportDir, meta.path);
  return { fullPath, meta };
}
