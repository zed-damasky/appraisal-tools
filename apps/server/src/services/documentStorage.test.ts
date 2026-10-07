import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { AllowedMimeType } from "@appraisal/types";
import {
  validateFile,
  saveDocument,
  deleteDocument,
  getFileExtension,
  isExtensionValidForMime,
  ensureDirectoryExists,
  directoryExists,
  fileExists,
  readDocument,
  MAX_FILE_SIZE,
  DocumentStorageError,
} from "./documentStorage";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-doc-storage-test-${crypto.randomUUID()}`,
);

function createMockFile(
  name: string,
  content: Uint8Array | string,
  type: string,
): File {
  const data =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  return new File([data], name, { type });
}

describe("Document Storage Service", () => {
  beforeEach(async () => {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  });

  describe("validateFile", () => {
    it("должен принимать валидный PDF-файл", () => {
      const file = createMockFile("test.pdf", "content", AllowedMimeType.PDF);
      expect(() => validateFile(file)).not.toThrow();
    });

    it("должен принимать валидный DOCX-файл", () => {
      const file = createMockFile("test.docx", "content", AllowedMimeType.DOCX);
      expect(() => validateFile(file)).not.toThrow();
    });

    it("должен принимать все поддерживаемые MIME-типы", () => {
      const types = Object.values(AllowedMimeType);
      for (const type of types) {
        const file = createMockFile(`test.${type.split("/")[1]}`, "c", type);
        expect(() => validateFile(file)).not.toThrow();
      }
    });

    it("должен отклонять пустой файл", () => {
      const file = createMockFile(
        "empty.pdf",
        new Uint8Array(0),
        AllowedMimeType.PDF,
      );
      expect(() => validateFile(file)).toThrow(DocumentStorageError);
    });

    it("должен отклонять файл слишком большого размера", () => {
      const bigContent = new Uint8Array(MAX_FILE_SIZE + 1);
      const file = createMockFile("big.pdf", bigContent, AllowedMimeType.PDF);
      expect(() => validateFile(file)).toThrow(DocumentStorageError);
    });

    it("должен отклонять неподдерживаемый MIME-тип", () => {
      const file = createMockFile(
        "script.exe",
        "content",
        "application/x-msdownload",
      );
      expect(() => validateFile(file)).toThrow(DocumentStorageError);
    });

    it("должен принимать только указанные MIME-типы", () => {
      const file = createMockFile("test.pdf", "content", AllowedMimeType.PDF);
      expect(() => validateFile(file, [AllowedMimeType.JPEG])).toThrow(
        DocumentStorageError,
      );
    });
  });

  describe("getFileExtension", () => {
    it("должен извлекать расширение", () => {
      expect(getFileExtension("document.pdf")).toBe("pdf");
      expect(getFileExtension("photo.JPG")).toBe("jpg");
    });

    it("должен возвращать 'bin' для файлов без расширения", () => {
      expect(getFileExtension("noextension")).toBe("bin");
    });
  });

  describe("isExtensionValidForMime", () => {
    it("должен принимать корректные пары", () => {
      expect(isExtensionValidForMime("photo.jpg", AllowedMimeType.JPEG)).toBe(
        true,
      );
      expect(isExtensionValidForMime("doc.docx", AllowedMimeType.DOCX)).toBe(
        true,
      );
      expect(isExtensionValidForMime("doc.pdf", AllowedMimeType.PDF)).toBe(
        true,
      );
    });

    it("должен отклонять некорректные пары", () => {
      expect(isExtensionValidForMime("photo.png", AllowedMimeType.JPEG)).toBe(
        false,
      );
      expect(isExtensionValidForMime("doc.exe", AllowedMimeType.PDF)).toBe(
        false,
      );
    });
  });

  describe("saveDocument", () => {
    it("должен успешно сохранить PDF-файл", async () => {
      const targetDir = path.join(TEMP_DIR, "docs");
      const file = createMockFile(
        "report.pdf",
        "PDF content",
        AllowedMimeType.PDF,
      );

      const doc = await saveDocument(targetDir, file);

      expect(doc.id).toBeDefined();
      expect(doc.name).toBe("report.pdf");
      expect(doc.mimeType).toBe(AllowedMimeType.PDF);
      expect(await fileExists(doc.path)).toBe(true);
    });

    it("должен успешно сохранить DOCX-файл", async () => {
      const targetDir = path.join(TEMP_DIR, "docs");
      const file = createMockFile(
        "report.docx",
        "DOCX content",
        AllowedMimeType.DOCX,
      );

      const doc = await saveDocument(targetDir, file);

      expect(doc.mimeType).toBe(AllowedMimeType.DOCX);
      expect(doc.path).toMatch(/\.docx$/);
      expect(await fileExists(doc.path)).toBe(true);
    });

    it("должен успешно сохранить изображение", async () => {
      const targetDir = path.join(TEMP_DIR, "photos");
      const file = createMockFile(
        "photo.jpg",
        "JPEG data",
        AllowedMimeType.JPEG,
      );

      const doc = await saveDocument(targetDir, file);

      expect(doc.mimeType).toBe(AllowedMimeType.JPEG);
      expect(doc.path).toMatch(/\.jpg$/);
    });

    it("должен создавать целевую директорию, если её нет", async () => {
      const targetDir = path.join(TEMP_DIR, "nonexistent", "nested", "dir");
      const file = createMockFile("test.pdf", "content", AllowedMimeType.PDF);

      const doc = await saveDocument(targetDir, file);

      expect(await directoryExists(targetDir)).toBe(true);
      expect(await fileExists(doc.path)).toBe(true);
    });

    it("должен генерировать уникальные ID для разных файлов", async () => {
      const targetDir = path.join(TEMP_DIR, "docs");
      const file1 = createMockFile("doc1.pdf", "content1", AllowedMimeType.PDF);
      const file2 = createMockFile("doc2.pdf", "content2", AllowedMimeType.PDF);

      const doc1 = await saveDocument(targetDir, file1);
      const doc2 = await saveDocument(targetDir, file2);

      expect(doc1.id).not.toBe(doc2.id);
      expect(doc1.path).not.toBe(doc2.path);
    });

    it("должен отклонять файл с несовпадающим расширением и MIME-типом", async () => {
      const targetDir = path.join(TEMP_DIR, "docs");
      // Пытаемся сохранить PDF с расширением .exe
      const file = createMockFile(
        "malware.exe",
        "content",
        AllowedMimeType.PDF,
      );

      await expect(saveDocument(targetDir, file)).rejects.toThrow(
        DocumentStorageError,
      );
    });

    it("должен отклонять невалидный файл", async () => {
      const targetDir = path.join(TEMP_DIR, "docs");
      const file = createMockFile(
        "script.exe",
        "content",
        "application/x-msdownload",
      );

      await expect(saveDocument(targetDir, file)).rejects.toThrow(
        DocumentStorageError,
      );
    });

    it("должен учитывать параметр allowedMimeTypes", async () => {
      const targetDir = path.join(TEMP_DIR, "docs");
      const file = createMockFile("test.pdf", "content", AllowedMimeType.PDF);

      // PDF не разрешён в этом списке
      await expect(
        saveDocument(targetDir, file, {
          allowedMimeTypes: [AllowedMimeType.JPEG, AllowedMimeType.PNG],
        }),
      ).rejects.toThrow(DocumentStorageError);
    });
  });

  describe("deleteDocument", () => {
    it("должен успешно удалить существующий файл", async () => {
      const filePath = path.join(TEMP_DIR, "to-delete.txt");
      await fs.writeFile(filePath, "content");

      await deleteDocument(filePath);
      expect(await fileExists(filePath)).toBe(false);
    });

    it("должен быть идемпотентным (не падать при удалении несуществующего файла)", async () => {
      const fakePath = path.join(TEMP_DIR, "nonexistent.txt");
      expect(await fileExists(fakePath)).toBe(false);

      expect(deleteDocument(fakePath)).resolves.toBeUndefined();
    });
  });

  describe("readDocument", () => {
    it("должен успешно читать существующий файл", async () => {
      const filePath = path.join(TEMP_DIR, "readable.txt");
      const content = "Hello, World!";
      await fs.writeFile(filePath, content);

      const buffer = await readDocument(filePath);
      expect(buffer.toString()).toBe(content);
    });

    it("должен выбрасывать ошибку при чтении несуществующего файла", async () => {
      const fakePath = path.join(TEMP_DIR, "missing.txt");

      await expect(readDocument(fakePath)).rejects.toThrow(
        DocumentStorageError,
      );
    });
  });
});
