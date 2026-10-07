import fs from "fs/promises";
import path from "path";
import { AllowedMimeType } from "@appraisal/types";
import type { Document } from "@appraisal/types";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ

export const ALLOWED_MIME_TYPES: string[] = Object.values(AllowedMimeType);

export const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  [AllowedMimeType.JPEG]: ["jpg", "jpeg"],
  [AllowedMimeType.PNG]: ["png"],
  [AllowedMimeType.WEBP]: ["webp"],
  [AllowedMimeType.HEIC]: ["heic", "heif"],
  [AllowedMimeType.PDF]: ["pdf"],
  [AllowedMimeType.DOC]: ["doc"],
  [AllowedMimeType.DOCX]: ["docx"],
};

export class DocumentStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentStorageError";
  }
}

export function validateFile(file: File, allowedMimeTypes?: string[]): void {
  if (!file || file.size === 0) {
    throw new DocumentStorageError("Файл пуст или не передан");
  }

  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    throw new DocumentStorageError(
      `Файл слишком большой (${(file.size / (1024 * 1024)).toFixed(2)} МБ). Максимум: ${maxSizeMB} МБ`,
    );
  }

  const mimeTypes = allowedMimeTypes || ALLOWED_MIME_TYPES;
  if (!mimeTypes.includes(file.type)) {
    throw new DocumentStorageError(
      `Неподдерживаемый тип файла: ${file.type || "неизвестно"}. Разрешены: ${mimeTypes.join(", ")}`,
    );
  }
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length <= 1 || parts[parts.length - 1] === "") {
    return "bin";
  }
  return parts.pop()!.toLowerCase();
}

export function isExtensionValidForMime(
  fileName: string,
  mimeType: string,
): boolean {
  const ext = getFileExtension(fileName);
  const allowedExtensions = MIME_TO_EXTENSIONS[mimeType];

  if (!allowedExtensions) {
    return true;
  }

  return allowedExtensions.includes(ext);
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function saveDocument(
  targetDir: string,
  file: File,
  options?: {
    allowedMimeTypes?: string[];
    relativeTo?: string;
  },
): Promise<Document> {
  validateFile(file, options?.allowedMimeTypes);

  if (!isExtensionValidForMime(file.name, file.type)) {
    throw new DocumentStorageError(
      `Расширение файла не соответствует MIME-типу: ${file.name} (${file.type})`,
    );
  }

  await ensureDirectoryExists(targetDir);

  const ext = getFileExtension(file.name);
  const fileId = crypto.randomUUID();
  const fileName = `${fileId}.${ext}`;
  const filePath = path.join(targetDir, fileName);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await Bun.write(filePath, buffer);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка";
    throw new DocumentStorageError(`Не удалось сохранить файл: ${message}`);
  }

  let storedPath = filePath;
  if (options?.relativeTo) {
    storedPath = path.relative(options.relativeTo, filePath);
    storedPath = storedPath.split(path.sep).join("/");
  }

  return {
    id: fileId,
    name: file.name,
    path: storedPath,
    mimeType: file.type as AllowedMimeType,
    size: file.size,
  };
}

export async function deleteDocument(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

export async function readDocument(filePath: string): Promise<Buffer> {
  try {
    return await fs.readFile(filePath);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      throw new DocumentStorageError(`Файл не найден: ${filePath}`);
    }
    throw error;
  }
}
