import {
  getReport,
  getReportsIndex,
  saveReport,
} from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { AnalogueObject, AppraisingReport } from "@appraisal/types";
import { analogueObjectSchema } from "@appraisal/shared/src/schemas";

function ensureAnalogues(report: AppraisingReport): AnalogueObject[] {
  if (!Array.isArray(report.analogues)) {
    report.analogues = [];
  }
  return report.analogues;
}

export async function getAnalogues(
  reportId: string,
): Promise<AnalogueObject[]> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");
  return ensureAnalogues(report);
}

export async function getAnalogueById(
  reportId: string,
  analogueId: string,
): Promise<AnalogueObject | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");
  return ensureAnalogues(report).find((a) => a.id === analogueId) || null;
}

export async function addAnalogue(
  reportId: string,
  analogueData: any,
): Promise<AnalogueObject> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const parsed = analogueObjectSchema.safeParse(analogueData);
  if (!parsed.success) {
    throw new Error(
      `Невалидные данные аналога: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  const newAnalogue = parsed.data as AnalogueObject;
  const analogues = ensureAnalogues(report);

  if (analogues.some((a) => a.id === newAnalogue.id)) {
    throw new Error("Аналог с таким ID уже существует");
  }

  analogues.push(newAnalogue);
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return newAnalogue;
}

export async function updateAnalogue(
  reportId: string,
  analogueId: string,
  updates: any,
): Promise<AnalogueObject | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const analogues = ensureAnalogues(report);
  const analogueIndex = analogues.findIndex((a) => a.id === analogueId);
  if (analogueIndex === -1) return null;

  const existingAnalogue = analogues[analogueIndex];
  const mergedAnalogue = {
    ...existingAnalogue,
    ...updates,
    id: existingAnalogue.id,
  };

  const parsed = analogueObjectSchema.safeParse(mergedAnalogue);
  if (!parsed.success) {
    throw new Error(
      `Невалидные данные аналога: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  analogues[analogueIndex] = parsed.data as AnalogueObject;
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return analogues[analogueIndex];
}

export async function removeAnalogue(
  reportId: string,
  analogueId: string,
): Promise<boolean> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const analogues = ensureAnalogues(report);
  const initialLength = analogues.length;

  report.analogues = analogues.filter((a) => a.id !== analogueId);

  if (report.analogues.length === initialLength) {
    return false;
  }

  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return true;
}
