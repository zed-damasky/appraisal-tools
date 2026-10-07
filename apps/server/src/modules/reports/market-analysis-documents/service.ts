import path from "path";
import {
  getReport,
  getReportsIndex,
  saveReport,
} from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { AppraisingReport, MarketAnalysisChapter } from "@appraisal/types";
import {
  saveDocument,
  DocumentStorageError,
} from "../../../services/documentStorage";
import { AllowedMimeType } from "@appraisal/types";

const MARKET_ANALYSIS_MIME_TYPES = [
  AllowedMimeType.PDF,
  AllowedMimeType.DOC,
  AllowedMimeType.DOCX,
];

export type ChapterType =
  | "macro"
  | "region"
  | "segment"
  | "analogues"
  | "nhue"
  | "liquidity"
  | "conclusions";

const VALID_CHAPTER_TYPES: ChapterType[] = [
  "macro",
  "region",
  "segment",
  "analogues",
  "nhue",
  "liquidity",
  "conclusions",
];

const CHAPTER_TYPE_TO_FIELD: Record<
  ChapterType,
  keyof AppraisingReport["marketAnalysis"]
> = {
  macro: "macroAnalysisChapter",
  region: "regionAnalysisChapter",
  segment: "marketSegmentChapter",
  analogues: "analoguesChapter",
  nhue: "nhueChapter",
  liquidity: "liquidityChapter",
  conclusions: "marketConclusionsChapter",
};

export function isValidChapterType(type: string): type is ChapterType {
  return VALID_CHAPTER_TYPES.includes(type as ChapterType);
}

function getChaptersByType(
  report: AppraisingReport,
  chapterType: ChapterType,
): MarketAnalysisChapter[] {
  const field = CHAPTER_TYPE_TO_FIELD[chapterType];
  const chapters = report.marketAnalysis[field];
  if (!Array.isArray(chapters)) {
    (report.marketAnalysis as any)[field] = [];
    return (report.marketAnalysis as any)[field];
  }
  return chapters;
}

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

export async function getMarketAnalysisDocuments(
  reportId: string,
  chapterType: ChapterType,
): Promise<MarketAnalysisChapter[] | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) return null;

  return getChaptersByType(report, chapterType);
}

export async function addMarketAnalysisDocument(
  reportId: string,
  chapterType: ChapterType,
  file: File,
  folder?: string,
): Promise<MarketAnalysisChapter> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  if (folder) {
    validateFolderName(folder);
  }

  let targetDir = path.join(report.files.reportDir, "анализ_рынка");
  if (folder) {
    targetDir = path.join(targetDir, folder);
  }

  const savedDoc = await saveDocument(targetDir, file, {
    allowedMimeTypes: MARKET_ANALYSIS_MIME_TYPES,
    relativeTo: report.files.reportDir,
  });

  const chapter: MarketAnalysisChapter = {
    id: savedDoc.id,
    path: savedDoc.path,
    fileName: savedDoc.name,
  };

  const chapters = getChaptersByType(report, chapterType);
  chapters.push(chapter);

  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return chapter;
}

export async function removeMarketAnalysisDocument(
  reportId: string,
  chapterType: ChapterType,
  documentId: string,
): Promise<boolean> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const chapters = getChaptersByType(report, chapterType);
  const initialLength = chapters.length;
  const updatedChapters = chapters.filter((c) => c.id !== documentId);

  if (updatedChapters.length === initialLength) {
    return false;
  }

  const field = CHAPTER_TYPE_TO_FIELD[chapterType];
  (report.marketAnalysis as any)[field] = updatedChapters;
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return true;
}
