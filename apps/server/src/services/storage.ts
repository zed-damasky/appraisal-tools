import { constants, existsSync, statSync } from "fs";
import {
  readFile,
  writeFile,
  rename,
  unlink,
  copyFile,
  mkdir,
  access,
} from "fs/promises";
import path from "path";

import type {
  Appraiser,
  Settings,
  AppraisingReport,
  AppraisingReportIndexData,
  ObjectType,
} from "@appraisal/types";

export interface CheckDirectoryResult {
  exists: boolean;
  isDirectory: boolean;
  writable: boolean;
}
export async function readJson<T>(
  filePath: string,
  defaultValue: T,
): Promise<T> {
  try {
    if (!existsSync(filePath)) return defaultValue;
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const tempPath = `${filePath}.temporary`;
  try {
    const serializedData = JSON.stringify(data, null, 2);
    await writeFile(tempPath, serializedData);
    await rename(tempPath, filePath);
  } catch (writeOrRenameError) {
    console.error(writeOrRenameError);

    try {
      if (existsSync(tempPath)) {
        await unlink(tempPath);
      }
    } catch (cleanupError) {
      console.error(cleanupError);
    }
    throw writeOrRenameError;
  }
}

export async function backupJson(filePath: string): Promise<void> {
  const backupPath = `${filePath}.backup`;
  if (!existsSync(filePath)) return;
  try {
    await copyFile(filePath, backupPath);
  } catch (backupError) {
    console.error(backupError);
  }
}

export async function ensureAppStructure(baseDir: string) {
  try {
    if (!existsSync(baseDir)) {
      await mkdir(baseDir, { recursive: true });
    }

    const usersPath = path.join(baseDir, "users.json");
    if (!existsSync(usersPath)) {
      await writeJson(usersPath, []);
    }
    const settingsPath = path.join(baseDir, "settings.json");
    if (!existsSync(settingsPath)) {
      const defaultSettings = {
        port: 5000,
        theme: "light" as const,
      };
      await writeJson(settingsPath, defaultSettings);
    }

    const reportsDir = path.join(baseDir, "reports");
    if (!existsSync(reportsDir)) {
      await mkdir(reportsDir, { recursive: true });
    }

    const reportsIndexPath = path.join(reportsDir, "index.json");
    if (!existsSync(reportsIndexPath)) {
      await writeJson(reportsIndexPath, []);
    }
  } catch (appStructureError) {
    console.error(appStructureError);
    throw appStructureError;
  }
}

export async function checkDirectoryAccess(
  checkingPath: string,
): Promise<CheckDirectoryResult> {
  if (!existsSync(checkingPath)) {
    return { exists: false, isDirectory: false, writable: false };
  }

  let isDirectory = false;
  try {
    const stats = statSync(checkingPath);
    isDirectory = stats.isDirectory();
  } catch (statError) {
    console.error(statError);

    return { exists: true, isDirectory: false, writable: false };
  }
  if (!isDirectory) {
    return { exists: true, isDirectory: false, writable: false };
  }

  let writable = false;
  try {
    await access(checkingPath, constants.W_OK);
    writable = true;
  } catch (accessError) {
    console.error(accessError);
    writable = false;
  }

  return { exists: true, isDirectory: true, writable };
}

export async function getUsers(baseDir: string): Promise<Appraiser[]> {
  const usersPath = path.join(baseDir, "users.json");
  const defaultValue: Appraiser[] = [];
  return await readJson<Appraiser[]>(usersPath, defaultValue);
}

export async function saveUsers(
  baseDir: string,
  users: Appraiser[],
): Promise<void> {
  const usersPath = path.join(baseDir, "users.json");
  await backupJson(usersPath);
  await writeJson(usersPath, users);
}

export async function getSettings(baseDir: string): Promise<Settings> {
  const settingsPath = path.join(baseDir, "settings.json");
  const defaultSettings: Settings = {
    port: 5000,
    theme: "light",
  };
  return await readJson<Settings>(settingsPath, defaultSettings);
}

export async function saveSettings(
  baseDir: string,
  settings: Settings,
): Promise<void> {
  const settingsPath = path.join(baseDir, "settings.json");
  await backupJson(settingsPath);
  await writeJson(settingsPath, settings);
}

export async function getReportsIndex(
  baseDir: string,
): Promise<AppraisingReportIndexData[]> {
  const reportsIndexPath = path.join(baseDir, "reports", "index.json");
  return await readJson<AppraisingReportIndexData[]>(reportsIndexPath, []);
}

export async function saveReportsIndex(
  baseDir: string,
  index: AppraisingReportIndexData[],
): Promise<void> {
  const reportsIndexPath = path.join(baseDir, "reports", "index.json");
  await backupJson(reportsIndexPath);
  await writeJson(reportsIndexPath, index);
}

export async function ensureReportStructure(reportDir: string): Promise<void> {
  try {
    if (!existsSync(reportDir)) {
      await mkdir(reportDir, { recursive: true });
    }

    const photosDir = path.join(reportDir, "photos");
    if (!existsSync(photosDir)) {
      await mkdir(photosDir, { recursive: true });
    }

    const docsDir = path.join(reportDir, "docs");
    if (!existsSync(docsDir)) {
      await mkdir(docsDir, { recursive: true });
    }
  } catch (reportStructureError) {
    console.error(reportStructureError);
    throw reportStructureError;
  }
}

export async function getReport(
  baseDir: string,
  reportId: string,
): Promise<AppraisingReport | null> {
  try {
    const index = await getReportsIndex(baseDir);
    const reportIndex = index.find((item) => item.id === reportId);

    if (!reportIndex) {
      return null;
    }

    const reportFilePath = path.join(
      reportIndex.reportDir,
      `rpt_${reportId}.json`,
    );

    if (!existsSync(reportFilePath)) {
      return null;
    }

    return await readJson<AppraisingReport>(
      reportFilePath,
      {} as AppraisingReport,
    );
  } catch (getReportError) {
    console.error(`Ошибка получения отчёта ${reportId}:`, getReportError);
    return null;
  }
}

export async function saveReport(
  baseDir: string,
  report: AppraisingReport & { title?: string }, // временно расширяем тип
  clientName: string,
): Promise<void> {
  try {
    const reportFilePath = path.join(
      report.files.reportDir,
      `rpt_${report.id}.json`,
    );

    await backupJson(reportFilePath);
    await writeJson(reportFilePath, report);

    const index = await getReportsIndex(baseDir);
    const objectTypes = Array.from(
      new Set(report.objects.map((obj) => obj.objectType)),
    ) as ObjectType[];;

    const existingIndex = index.findIndex((item) => item.id === report.id);

    const indexData: AppraisingReportIndexData = {
      ...report.metadata,
      title: report.title || report.metadata.reportSequenceNumber,
      status: report.status,
      objectTypes,
      clientName,
      reportDir: report.files.reportDir,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };

    if (existingIndex >= 0) {
      index[existingIndex] = indexData;
    } else {
      index.push(indexData);
    }

    await saveReportsIndex(baseDir, index);
  } catch (saveReportError) {
    console.error(`Ошибка сохранения отчёта ${report.id}:`, saveReportError);
    throw saveReportError;
  }
}

export async function deleteReport(
  baseDir: string,
  reportId: string,
): Promise<boolean> {
  try {
    const index = await getReportsIndex(baseDir);
    const reportIndex = index.find((item) => item.id === reportId);

    if (!reportIndex) {
      return false;
    }

    const reportFilePath = path.join(
      reportIndex.reportDir,
      `rpt_${reportId}.json`,
    );
    if (existsSync(reportFilePath)) {
      await unlink(reportFilePath);
    }

    const newIndex = index.filter((item) => item.id !== reportId);
    await saveReportsIndex(baseDir, newIndex);

    return true;
  } catch (deleteReportError) {
    console.error(`Ошибка удаления отчёта ${reportId}:`, deleteReportError);
    throw deleteReportError;
  }
}
