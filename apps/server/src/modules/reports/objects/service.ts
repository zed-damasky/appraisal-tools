import {
  getReport,
  getReportsIndex,
  saveReport,
} from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { AppraisingObject, AppraisingReport } from "@appraisal/types";
import { appraisingObjectSchema } from "@appraisal/shared/src/schemas";

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
