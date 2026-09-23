import { z } from "zod";
import { documentSchema } from "..";

export const restrictionSchema = z.object({
  typeOfRestrictionRights: z
    .string()
    .min(1, "Укажите вид ограничения (обременения)"),
  restrictor: z
    .string()
    .min(1, "Укажите, в чью пользу установлено ограничение"),
  regNumberRestrictionRights: z
    .string()
    .min(1, "Укажите номер записи об ограничении"),
  regDateRestrictionRights: z
    .string()
    .min(1, "Укажите дату регистрации ограничения"),
  restrictionDocuments: z
    .array(documentSchema)
    .min(1, "Приложите хотя бы один документ, подтверждающий ограничение"),
});

export const rightsSchema = z.object({
  typeOfRights: z
    .string()
    .min(1, "Укажите вид права (например, Собственность)"),
  ownership: z.string().min(1, "Укажите правообладателя"),
  dateOfOwnership: z.string().min(1, "Укажите дату возникновения права"),
  rightsDocuments: z
    .array(documentSchema)
    .min(1, "Приложите хотя бы один правоустанавливающий документ"),
});

export const rightsOnMovableObjectSchema = rightsSchema.extend({
  restriction: z.array(restrictionSchema),
  quantityOfRights: z.string().optional(),
  regNumberRights: z.string().optional(),
  regDateRights: z.string().optional(),
});

export const rightsOnImmovableObjectSchema = rightsSchema.extend({
  quantityOfRights: z
    .string()
    .min(1, "Укажите долю в праве (например, 1/1 или 100%)"),
  regNumberRights: z.string().min(1, "Укажите номер записи ЕГРН о праве"),
  regDateRights: z.string().min(1, "Укажите дату регистрации права"),
  restriction: z.array(restrictionSchema),
});

export const visualInspectionSchema = z.object({
  visualInspectionType: z.enum(
    [
      "full",
      "partial_external",
      "partial_internal",
      "partial_with_specified_criteria",
      "without_visual_inspection",
    ],
    {
      message: "Выберите тип осмотра из списка",
    },
  ),
  dateStart: z.string().optional(),
  dateFinish: z.string().optional(),
  description: z
    .string()
    .min(10, "Детали осмотра должны содержать минимум 10 символов"),
});

export const locationElementSchema = z.object({
  name: z.string().min(1, "Укажите название объекта"),
  description: z.string().optional(),
});

export const locationCharacteristicsSchema = z.object({
  latitude: z
    .number()
    .min(-90, "Широта должна быть от -90 до 90")
    .max(90, "Широта должна быть от -90 до 90"),
  longitude: z
    .number()
    .min(-180, "Долгота должна быть от -180 до 180")
    .max(180, "Долгота должна быть от -180 до 180"),
  mapLocationImage: documentSchema.optional(),

  country: z.string().min(1, "Укажите страну"),
  subjectCountry: z.string().min(1, "Укажите субъект РФ"),
  regionSubject: z.string().optional(),
  settlement: z.string().optional(),
  regionSettlement: z.string().optional(),
  street: z.string().optional(),
  buildingNumber: z.string().optional(),
  premisesNumber: z.string().optional(),

  nearestHighway: z.string().min(1, "Укажите ближайшую магистраль"),
  roadAccess: z.string().min(1, "Опишите подъездные пути"),
  ecologicalSituation: z.enum(
    ["favorable", "relatively-favorable", "unfavorable"],
    {
      message: "Выберите экологическую ситуацию из списка",
    },
  ),
  ecologicalSituationDescription: z.string().optional(),
  transportAccess: z.string().min(1, "Опишите транспортную доступность"),
  infrastructureObjects: z
    .array(locationElementSchema)
    .min(1, "Укажите хотя бы один объект инфраструктуры"),
  otherNearObjects: z.array(locationElementSchema).optional(),
});

export const depreciationSchema = z.object({
  physicalDepreciation: z
    .number()
    .min(0, "Физический износ не может быть отрицательным")
    .max(100, "Физический износ не может превышать 100%"),
  functionalDepreciation: z
    .number()
    .min(0, "Функциональный износ не может быть отрицательным")
    .max(100, "Функциональный износ не может превышать 100%"),
  externalEconomicDepreciation: z
    .number()
    .min(0, "Внешнее устаревание не может быть отрицательным")
    .max(100, "Внешнее устаревание не может превышать 100%"),
});

export const baseAppraisalObjectSchema = z.object({
  id: z.uuid("ID объекта должен быть UUID"),
  name: z
    .string()
    .min(3, "Название объекта должно содержать минимум 3 символа"),
  visualInspection: visualInspectionSchema,
  appraisalDate: z.string().min(1, "Укажите дату оценки"),
  technicalDocuments: z
    .array(documentSchema)
    .min(1, "Должен быть хотя бы один технический документ"),
  otherDocuments: z.array(documentSchema).optional(),
});
