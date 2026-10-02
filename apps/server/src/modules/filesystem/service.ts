import { existsSync, statSync, constants } from "fs";
import { access, mkdir, readdir, writeFile, readFile } from "fs/promises";
import path from "path";
import type { MarkerData } from "@appraisal/shared/src/schemas";

const MARKER_FILENAME = ".appraisal-tools-marker.json";

const FORBIDDEN_PATHS = [
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
  "C:\\$Recycle.Bin",
  "C:\\System Volume Information",
];

export interface DirectoryCheckResult {
  exists: boolean;
  isDirectory: boolean;
  isWritable: boolean;
  isReadable: boolean;
  hasMarker: boolean;
  error?: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
}

function isForbiddenPath(dirPath: string): boolean {
  const normalizedPath = path.normalize(dirPath).toLowerCase();
  return FORBIDDEN_PATHS.some((forbidden) =>
    normalizedPath.startsWith(forbidden.toLowerCase()),
  );
}

export async function checkDirectory(
  dirPath: string,
): Promise<DirectoryCheckResult> {
  try {
    if (isForbiddenPath(dirPath)) {
      return {
        exists: false,
        isDirectory: false,
        isWritable: false,
        isReadable: false,
        hasMarker: false,
        error: "Доступ к системным папкам запрещён",
      };
    }

    if (!existsSync(dirPath)) {
      return {
        exists: false,
        isDirectory: false,
        isWritable: false,
        isReadable: false,
        hasMarker: false,
      };
    }

    const stats = statSync(dirPath);
    if (!stats.isDirectory()) {
      return {
        exists: true,
        isDirectory: false,
        isWritable: false,
        isReadable: false,
        hasMarker: false,
        error: "Указанный путь не является папкой",
      };
    }

    let isReadable = false;
    let isWritable = false;

    try {
      await access(dirPath, constants.R_OK);
      isReadable = true;
    } catch {}

    try {
      await access(dirPath, constants.W_OK);
      isWritable = true;
    } catch {}

    const markerPath = path.join(dirPath, MARKER_FILENAME);
    const hasMarker = existsSync(markerPath);

    return {
      exists: true,
      isDirectory: true,
      isWritable,
      isReadable,
      hasMarker,
    };
  } catch (error) {
    return {
      exists: false,
      isDirectory: false,
      isWritable: false,
      isReadable: false,
      hasMarker: false,
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
    };
  }
}

export async function createMarkerFile(dirPath: string): Promise<MarkerData> {
  const check = await checkDirectory(dirPath);

  if (!check.exists || !check.isDirectory) {
    throw new Error("Папка не существует или не является директорией");
  }

  if (!check.isWritable) {
    throw new Error("Нет прав на запись в выбранную папку");
  }

  const markerData: MarkerData = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    appId: crypto.randomUUID(),
  };

  const markerPath = path.join(dirPath, MARKER_FILENAME);
  await writeFile(markerPath, JSON.stringify(markerData, null, 2), "utf-8");

  return markerData;
}

export async function verifyMarkerFile(
  dirPath: string,
): Promise<{ valid: boolean; data?: MarkerData; error?: string }> {
  const markerPath = path.join(dirPath, MARKER_FILENAME);

  if (!existsSync(markerPath)) {
    return { valid: false, error: "Маркерный файл не найден" };
  }

  try {
    const content = await readFile(markerPath, "utf-8");
    const data = JSON.parse(content) as MarkerData;

    if (!data.version || !data.createdAt || !data.appId) {
      return { valid: false, error: "Маркерный файл повреждён" };
    }

    return { valid: true, data };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Ошибка чтения маркерного файла",
    };
  }
}

export async function listDirectory(
  dirPath: string,
): Promise<DirectoryEntry[]> {
  const check = await checkDirectory(dirPath);

  if (!check.exists || !check.isDirectory) {
    throw new Error("Папка не существует или не является директорией");
  }

  if (!check.isReadable) {
    throw new Error("Нет прав на чтение папки");
  }

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    return entries
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
      }));
  } catch (error) {
    throw new Error(
      `Ошибка чтения содержимого папки: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
    );
  }
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}
