import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import os from "os";

import {
  readJson,
  writeJson,
  backupJson,
  ensureAppStructure,
  checkDirectoryAccess,
  getUsers,
  saveUsers,
  getSettings,
  saveSettings,
  getReportsIndex,
  saveReportsIndex,
  ensureReportStructure,
  getReport,
  saveReport,
  deleteReport,
} from "./storage";

import type {
  AppraisingReport,
  AppraisingReportIndexData,
} from "@appraisal/types";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-storage-test-${crypto.randomUUID()}`,
);

const createMockReport = (reportDir: string): AppraisingReport => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  status: "draft",
  metadata: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    reportSequenceNumber: "REP-0001",
    reportDatePreperation: "2023-10-25",
    appraisingContractId: "123e4567-e89b-12d3-a456-426614174000",
    appraisingReportId: "550e8400-e29b-41d4-a716-446655440000",
  },
  reportTask: {
    id: "650e8400-e29b-41d4-a716-446655440000",
    appraisingDate: "2023-10-25",
    valueVariants: [],
    appraisingPurpose: "Оценка",
    commonAssumptions: [],
    specialAssumptions: [],
    otherAssumptions: [],
    appraisingRestrictions: [],
    usingRestrictions: [],
    formOfAppraisingReport: "electronic",
    usersOfReport: "Заказчик",
    externalSpecialist: "Нет",
    specificRequirements: [],
  },
  marketAnalysis: [],
  appraisers: [],
  files: {
    reportDir,
    folderName: "Отчёт_REP-0001_20231025",
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
  createdAt: "2023-10-25T10:00:00.000Z",
  updatedAt: "2023-10-25T10:00:00.000Z",
});

describe("Storage Service", () => {
  beforeEach(async () => {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  });

  describe("Core JSON Utilities", () => {
    it("должен записывать и читать JSON", async () => {
      const filePath = path.join(TEMP_DIR, "test.json");
      const data = { name: "Test", value: 42 };

      await writeJson(filePath, data);
      const result = await readJson(filePath, {});

      expect(result).toEqual(data);
    });

    it("должен возвращать defaultValue, если файл не существует", async () => {
      const filePath = path.join(TEMP_DIR, "nonexistent.json");
      const defaultValue = { fallback: true };

      const result = await readJson(filePath, defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it("должен создавать .backup файл перед записью", async () => {
      const filePath = path.join(TEMP_DIR, "backup_test.json");
      await writeJson(filePath, { version: 1 });

      await backupJson(filePath);

      expect(existsSync(`${filePath}.backup`)).toBe(true);
    });

    it("должен выполнять атомарную запись (через .temporary)", async () => {
      const filePath = path.join(TEMP_DIR, "atomic.json");
      const tempPath = `${filePath}.temporary`;

      await writeJson(filePath, { status: "ok" });

      expect(existsSync(filePath)).toBe(true);
      expect(existsSync(tempPath)).toBe(false);
    });
  });

  describe("App Structure", () => {
    it("должен создавать базовую структуру приложения", async () => {
      const appDir = path.join(TEMP_DIR, "app");
      await ensureAppStructure(appDir);

      expect(existsSync(path.join(appDir, "users.json"))).toBe(true);
      expect(existsSync(path.join(appDir, "settings.json"))).toBe(true);
      expect(existsSync(path.join(appDir, "reports", "index.json"))).toBe(true);
    });
  });

  describe("Directory Access", () => {
    it("должен корректно определять несуществующий путь", async () => {
      const result = await checkDirectoryAccess(path.join(TEMP_DIR, "fake"));
      expect(result.exists).toBe(false);
      expect(result.isDirectory).toBe(false);
      expect(result.writable).toBe(false);
    });

    it("должен определять, что путь является файлом, а не директорией", async () => {
      const filePath = path.join(TEMP_DIR, "file.txt");
      await fs.writeFile(filePath, "test");

      const result = await checkDirectoryAccess(filePath);
      expect(result.exists).toBe(true);
      expect(result.isDirectory).toBe(false);
    });

    it("должен подтверждать, что директория существует и доступна для записи", async () => {
      const dirPath = path.join(TEMP_DIR, "writable_dir");
      await fs.mkdir(dirPath);

      const result = await checkDirectoryAccess(dirPath);
      expect(result.exists).toBe(true);
      expect(result.isDirectory).toBe(true);
      expect(result.writable).toBe(true);
    });
  });

  describe("Users & Settings", () => {
    it("должен сохранять и получать пользователей", async () => {
      const users = [
        {
          id: "1",
          fullName: "Test",
          contacts: { email: "t@t.com", phone: "123" },
        } as any,
      ];
      await saveUsers(TEMP_DIR, users);

      const result = await getUsers(TEMP_DIR);
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe("Test");
    });

    it("должен сохранять и получать настройки", async () => {
      const settings = { port: 8080, theme: "dark" as const };
      await saveSettings(TEMP_DIR, settings);

      const result = await getSettings(TEMP_DIR);
      expect(result.port).toBe(8080);
      expect(result.theme).toBe("dark");
    });
  });

  describe("Reports Management", () => {
    it("должен создавать структуру папок отчёта", async () => {
      const reportDir = path.join(TEMP_DIR, "test_report");
      await ensureReportStructure(reportDir);

      expect(existsSync(reportDir)).toBe(true);
      expect(existsSync(path.join(reportDir, "photos"))).toBe(true);
      expect(existsSync(path.join(reportDir, "docs"))).toBe(true);
    });

    it("должен сохранять индекс отчётов и создавать резервную копию", async () => {
      const reportDir = path.join(TEMP_DIR, "reports");
      await fs.mkdir(reportDir, { recursive: true });
      const indexPath = path.join(reportDir, "index.json");

      await writeJson(indexPath, [
        { id: "old-id", title: "Old Report" } as any,
      ]);

      const newIndex: AppraisingReportIndexData[] = [
        {
          id: "new-id-1",
          reportSequenceNumber: "REP-0001",
          reportDatePreperation: "2023-10-25",
          appraisingContractId: "123e4567-e89b-12d3-a456-426614174000",
          appraisingReportId: "new-id-1",
          title: "New Report 1",
          status: "draft",
          objectTypes: ["immovable_property"],
          clientName: "Client 1",
          reportDir: "/path/to/report1",
          createdAt: "2023-10-25T10:00:00.000Z",
          updatedAt: "2023-10-25T10:00:00.000Z",
        },
        {
          id: "new-id-2",
          reportSequenceNumber: "REP-0002",
          reportDatePreperation: "2023-10-26",
          appraisingContractId: "123e4567-e89b-12d3-a456-426614174001",
          appraisingReportId: "new-id-2",
          title: "New Report 2",
          status: "in_progress",
          objectTypes: ["movable_property"],
          clientName: "Client 2",
          reportDir: "/path/to/report2",
          createdAt: "2023-10-26T10:00:00.000Z",
          updatedAt: "2023-10-26T10:00:00.000Z",
        },
      ];

      await saveReportsIndex(TEMP_DIR, newIndex);

      const result = await getReportsIndex(TEMP_DIR);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("new-id-1");
      expect(result[1].clientName).toBe("Client 2");

      expect(existsSync(`${indexPath}.backup`)).toBe(true);
    });

    it("должен сохранять отчёт и обновлять индекс", async () => {
      const reportDir = path.join(
        TEMP_DIR,
        "reports",
        "Отчёт_REP-0001_20231025",
      );
      await ensureReportStructure(reportDir);

      const mockReport = createMockReport(reportDir);
      await saveReport(TEMP_DIR, mockReport, "Тестовый Заказчик");

      const reportFilePath = path.join(reportDir, `rpt_${mockReport.id}.json`);
      expect(existsSync(reportFilePath)).toBe(true);

      const index = await getReportsIndex(TEMP_DIR);
      expect(index).toHaveLength(1);
      expect(index[0].clientName).toBe("Тестовый Заказчик");
      expect(index[0].title).toBe("REP-0001"); // title = reportSequenceNumber
    });

    it("должен получать сохранённый отчёт по ID", async () => {
      const reportDir = path.join(
        TEMP_DIR,
        "reports",
        "Отчёт_REP-0002_20231025",
      );
      await ensureReportStructure(reportDir);

      const mockReport = createMockReport(reportDir);
      await saveReport(TEMP_DIR, mockReport, "Заказчик 2");

      const result = await getReport(TEMP_DIR, mockReport.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockReport.id);
    });

    it("должен возвращать null при запросе несуществующего отчёта", async () => {
      const result = await getReport(TEMP_DIR, "non-existent-id");
      expect(result).toBeNull();
    });

    it("должен удалять отчёт и запись в индексе (Soft Delete для файлов не проверяется здесь, только JSON)", async () => {
      const reportDir = path.join(
        TEMP_DIR,
        "reports",
        "Отчёт_REP-0003_20231025",
      );
      await ensureReportStructure(reportDir);

      const mockReport = createMockReport(reportDir);
      await saveReport(TEMP_DIR, mockReport, "Заказчик 3");

      const reportFilePath = path.join(reportDir, `rpt_${mockReport.id}.json`);
      expect(existsSync(reportFilePath)).toBe(true);
      expect((await getReportsIndex(TEMP_DIR)).length).toBe(1);

      const success = await deleteReport(TEMP_DIR, mockReport.id);
      expect(success).toBe(true);

      expect(existsSync(reportFilePath)).toBe(false);

      const newIndex = await getReportsIndex(TEMP_DIR);
      expect(newIndex.length).toBe(0);
    });

    it("должен возвращать false при попытке удалить несуществующий отчёт", async () => {
      const success = await deleteReport(TEMP_DIR, "fake-id");
      expect(success).toBe(false);
    });
  });
});
