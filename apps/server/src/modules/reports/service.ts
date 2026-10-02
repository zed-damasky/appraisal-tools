import path from "path";
import {
  getReportsIndex,
  getReport,
  saveReport,
  ensureReportStructure,
  deleteReport,
} from "../../services/storage";
import { getBaseDir } from "../../config";
import type {
  AppraisingObject,
  AppraisingReport,
  AppraisingReportIndexData,
  ReportStatus,
} from "@appraisal/types";
import { appraisingObjectSchema } from "@appraisal/shared/src/schemas";

export async function getReportsList(filters?: {
  status?: ReportStatus;
  objectType?: string;
  search?: string;
}): Promise<AppraisingReportIndexData[]> {
  const baseDir = getBaseDir();
  const index = await getReportsIndex(baseDir);

  if (!filters) return index;

  return index.filter((report) => {
    if (filters.status && report.status !== filters.status) return false;

    if (
      filters.objectType &&
      !report.objectTypes.includes(filters.objectType as any)
    ) {
      return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = report.title.toLowerCase().includes(searchLower);
      const matchesClient = report.clientName
        .toLowerCase()
        .includes(searchLower);
      if (!matchesTitle && !matchesClient) return false;
    }

    return true;
  });
}

export async function getReportById(
  reportId: string,
): Promise<AppraisingReport | null> {
  const baseDir = getBaseDir();
  return await getReport(baseDir, reportId);
}

export async function createReport(data: {
  reportSequenceNumber: string;
  clientName: string;
  reportDir: string;
  appraisingContractId: string;
}): Promise<AppraisingReportIndexData> {
  const baseDir = getBaseDir();
  //const index = await getReportsIndex(baseDir);
  const now = new Date().toISOString();
  const reportId = crypto.randomUUID();

  const dateStr = now.split("T")[0].replace(/-/g, "");
  const folderName = `Отчёт_${data.reportSequenceNumber}_${dateStr}`;
  const fullReportDir = path.join(data.reportDir, folderName);

  await ensureReportStructure(fullReportDir);

  const initialReport: AppraisingReport = {
    id: reportId,
    status: "draft",
    metadata: {
      id: reportId,
      reportSequenceNumber: data.reportSequenceNumber,
      reportDatePreperation: now.split("T")[0],
      appraisingContractId: data.appraisingContractId,
      appraisingReportId: reportId,
    },
    reportTask: {
      id: crypto.randomUUID(),
      appraisingContractId: data.appraisingContractId,
      appraisingReportId: reportId,
      appraisingDate: now.split("T")[0],
      valueVariants: [],
      appraisingPurpose: "",
      commongAssumptions: [],
      specialAssumptions: [],
      otherAssumptions: [],
      appraisingRestrictions: [],
      usingRestrictions: [],
      formOfAppraisingReport: "electronic",
      usersOfReport: "",
      externalSpecialist: "",
      specificRequirements: [],
    },
    marketAnalysis: [],
    appraisers: [],
    files: {
      reportDir: fullReportDir,
      folderName,
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
    createdAt: now,
    updatedAt: now,
  };

  await saveReport(baseDir, initialReport, data.clientName);

  const updatedIndex = await getReportsIndex(baseDir);
  const newIndexEntry = updatedIndex.find((r) => r.id === reportId);

  if (!newIndexEntry) {
    throw new Error("Не удалось создать запись в индексе отчётов");
  }

  return newIndexEntry;
}

export async function updateReport(
  reportId: string,
  updates: Partial<AppraisingReport>,
  clientName?: string,
): Promise<AppraisingReport | null> {
  const baseDir = getBaseDir();
  const existingReport = await getReport(baseDir, reportId);

  if (!existingReport) {
    return null;
  }

  const updatedReport: AppraisingReport = {
    ...existingReport,
    ...updates,
    id: existingReport.id,
    updatedAt: new Date().toISOString(),
  };

  let finalClientName = clientName;
  if (!finalClientName) {
    const index = await getReportsIndex(baseDir);
    finalClientName =
      index.find((r) => r.id === reportId)?.clientName ||
      "Неизвестный заказчик";
  }

  await saveReport(baseDir, updatedReport, finalClientName);

  return updatedReport;
}

export async function deleteReportById(reportId: string): Promise<boolean> {
  const baseDir = getBaseDir();

  return await deleteReport(baseDir, reportId);
}

export async function duplicateReport(
  reportId: string,
): Promise<AppraisingReportIndexData | null> {
  const baseDir = getBaseDir();
  const originalReport = await getReport(baseDir, reportId);
  if (!originalReport) return null;

  const index = await getReportsIndex(baseDir);
  const originalIndexEntry = index.find((r) => r.id === reportId);
  if (!originalIndexEntry) return null;

  const now = new Date().toISOString();
  const newReportId = crypto.randomUUID();

  const newSequenceNumber = `${originalReport.metadata.reportSequenceNumber} (копия)`;

  const dateStr = now.split("T")[0].replace(/-/g, "");
  const newFolderName = `Отчёт_${newSequenceNumber}_${dateStr}`;

  const newReportDir = path.join(
    path.dirname(originalReport.files.reportDir),
    newFolderName,
  );

  await ensureReportStructure(newReportDir);

  const clonedReport: AppraisingReport = {
    ...originalReport,
    id: newReportId,
    status: "draft",
    metadata: {
      ...originalReport.metadata,
      id: newReportId,
      reportSequenceNumber: newSequenceNumber,
      reportDatePreperation: now.split("T")[0],
      appraisingReportId: newReportId,
    },
    files: {
      ...originalReport.files,
      reportDir: newReportDir,
      folderName: newFolderName,
      pdf: undefined,
      doc: undefined,
      xls: undefined,
      photos: [],
      docs: [],
    },
    createdAt: now,
    updatedAt: now,
  };

  await saveReport(baseDir, clonedReport, originalIndexEntry.clientName);

  const updatedIndex = await getReportsIndex(baseDir);
  return updatedIndex.find((r) => r.id === newReportId) ?? null;
}

export async function changeReportStatus(
  reportId: string,
  newStatus: ReportStatus,
): Promise<AppraisingReport | null> {
  return await updateReport(reportId, { status: newStatus });
}

export async function getReportObjects(
  reportId: string,
): Promise<AppraisingObject[]> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");
  return report.objects;
}

export async function getObjectById(
  reportId: string,
  objectId: string,
): Promise<AppraisingObject | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");
  return report.objects.find((obj) => obj.id === objectId) || null;
}

export async function addObjectToReport(
  reportId: string,
  objectData: any,
): Promise<AppraisingObject> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const parsed = appraisingObjectSchema.safeParse(objectData);
  if (!parsed.success) {
    throw new Error(
      `Невалидные данные объекта: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  const newObject = parsed.data as AppraisingObject;

  if (report.objects.some((obj) => obj.id === newObject.id)) {
    throw new Error("Объект с таким ID уже существует в отчёте");
  }

  validateObjectReferences(newObject, report.objects);

  report.objects.push(newObject);
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return newObject;
}

export async function updateObjectInReport(
  reportId: string,
  objectId: string,
  updates: any,
): Promise<AppraisingObject | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const objectIndex = report.objects.findIndex((obj) => obj.id === objectId);
  if (objectIndex === -1) return null;

  const existingObject = report.objects[objectIndex];

  const mergedObject = {
    ...existingObject,
    ...updates,
    id: existingObject.id,
    objectType: existingObject.objectType,
    subtype: (existingObject as any).subtype,
  };

  const parsed = appraisingObjectSchema.safeParse(mergedObject);
  if (!parsed.success) {
    throw new Error(
      `Невалидные данные объекта: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  const otherObjects = report.objects.filter((obj) => obj.id !== objectId);
  validateObjectReferences(parsed.data as AppraisingObject, otherObjects);

  report.objects[objectIndex] = parsed.data as AppraisingObject;
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return report.objects[objectIndex];
}

export async function removeObjectFromReport(
  reportId: string,
  objectId: string,
): Promise<boolean> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) throw new Error("Отчёт не найден");

  const objectToRemove = report.objects.find((obj) => obj.id === objectId);
  if (!objectToRemove) return false;

  const dependentObjects = report.objects.filter((obj) => {
    if (obj.id === objectId) return false;
    const anyObj = obj as any;
    return (
      anyObj.locateLandPlotId === objectId ||
      anyObj.locateBuildingId === objectId
    );
  });

  if (dependentObjects.length > 0) {
    const names = dependentObjects.map((o) => o.name).join(", ");
    throw new Error(
      `Невозможно удалить объект: на него ссылаются другие объекты (${names})`,
    );
  }

  report.objects = report.objects.filter((obj) => obj.id !== objectId);
  report.updatedAt = new Date().toISOString();

  const index = await getReportsIndex(baseDir);
  const clientName = index.find((r) => r.id === reportId)?.clientName || "";
  await saveReport(baseDir, report, clientName);

  return true;
}

function validateObjectReferences(
  newObject: AppraisingObject,
  existingObjects: AppraisingObject[],
): void {
  const anyObj = newObject as any;

  if (anyObj.subtype === "building" && anyObj.locateLandPlotId) {
    const landPlot = existingObjects.find(
      (obj) =>
        obj.id === anyObj.locateLandPlotId &&
        (obj as any).subtype === "land_plot",
    );
    if (!landPlot) {
      throw new Error(
        `Земельный участок с ID ${anyObj.locateLandPlotId} не найден в отчёте`,
      );
    }
  }

  if (
    [
      "apartment",
      "office",
      "room_in_communal",
      "room_in_building",
      "garage_in_building",
      "other",
    ].includes(anyObj.subtype) &&
    anyObj.locateBuildingId
  ) {
    const building = existingObjects.find(
      (obj) =>
        obj.id === anyObj.locateBuildingId &&
        (obj as any).subtype === "building",
    );
    if (!building) {
      throw new Error(
        `Здание с ID ${anyObj.locateBuildingId} не найдено в отчёте`,
      );
    }
  }
}
