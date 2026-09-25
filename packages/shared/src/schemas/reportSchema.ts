import { z } from "zod";
import {
  appraiserSchema,
  objectTypeSchema,
  reportStatusSchema,
  valuationApproachSchema,
} from ".";
import { appraisingObjectSchema } from "./objects";

export const valueVariantSchema = z.object({
  id: z.uuid("ID должен быть UUID"),
  name: z.string().min(1, "Укажите название варианта стоимости"),
  premises: z.string().min(1, "Укажите предпосылки стоимости"),
  description: z.string().optional(),
});

export const appraisingAssumptionSchema = z.object({
  id: z.uuid("ID должен быть UUID"),
  description: z.string().min(1, "Описание допущения обязательно"),
});

export const appraisingRestrictionSchema = z.object({
  id: z.uuid("ID должен быть UUID"),
  description: z.string().min(1, "Описание ограничения обязательно"),
});

export const specificRequirementSchema = z.object({
  id: z.uuid("ID должен быть UUID"),
  description: z.string().min(1, "Описание требования обязательно"),
});

export const reportFilesSchema = z.object({
  reportDir: z.string().min(1, "Укажите директорию отчета"),
  folderName: z.string().min(1, "Укажите имя папки отчёта"),
  pdf: z.string().optional(),
  doc: z.string().optional(),
  xls: z.string().optional(),
  photos: z.array(z.string()).default([]),
  docs: z.array(z.string()).default([]),
});

export const marketAnalysisSchema = z.object({
  id: z.uuid("ID должен быть UUID"),
  path: z.string().min(1, "Укажите путь к файлу/данным анализа рынка"),
  highestAndBestUse: z
    .string()
    .min(1, "Опишите ННЭИ (наилучшее и наиболее эффективное использование)"),
});

export const valuationResultsSchema = z.object({
  approachesUsed: z
    .array(valuationApproachSchema)
    .min(1, "Должен быть выбран хотя бы один подход к оценке"),
  approachesRejected: z.array(
    z.object({
      approach: valuationApproachSchema,
      reason: z.string().min(1, "Укажите причину отказа от подхода"),
    }),
  ),
  reconciliationDescription: z
    .string()
    .min(1, "Описание согласования результатов обязательно"),
  finalValue: z.number().positive("Итоговая стоимость должна быть больше 0"),
  currency: z.string().min(1, "Укажите валюту (например, RUB)"),
});

export const appraisingReportTaskSchema = z.object({
  id: z.uuid("ID должен быть UUID"),
  appraisingContractId: z.uuid("ID договора должен быть UUID"),
  appraisingReportId: z.uuid("ID отчёта должен быть UUID"),
  appraisingDate: z.string().min(1, "Укажите дату оценки"),
  valueVariants: z
    .array(valueVariantSchema)
    .min(1, "Должен быть хотя бы один вариант стоимости"),
  appraisingPurpose: z.string().min(1, "Укажите цель оценки"),

  commongAssumptions: z.array(appraisingAssumptionSchema),
  specialAssumptions: z.array(appraisingAssumptionSchema),
  otherAssumptions: z.array(appraisingAssumptionSchema),

  appraisingRestrictions: z.array(appraisingRestrictionSchema),
  usingRestrictions: z.array(appraisingRestrictionSchema),

  formOfAppraisingReport: z.enum(["on_paper", "electronic", "all"], {
    message: "Выберите форму отчёта из списка",
  }),
  usersOfReport: z
    .string()
    .min(1, "Укажите предполагаемых пользователей отчёта"),
  externalSpecialist: z
    .string()
    .min(1, "Укажите внешних специалистов (или 'не привлекались')"),
  specificRequirements: z.array(specificRequirementSchema),
});

export const appraisingReportMetadataSchema = z.object({
  id: z.uuid("ID должен быть UUID"),
  reportSequenceNumber: z.string().min(1, "Укажите порядковый номер отчёта"),
  reportDatePreperation: z.string().min(1, "Укажите дату составления отчёта"),
  appraisingContractId: z.uuid("ID договора должен быть UUID"),
  appraisingReportId: z.uuid("ID отчёта должен быть UUID"),
});

export const appraisingReportIndexDataSchema =
  appraisingReportMetadataSchema.extend({
    title: z.string().min(1, "Укажите название отчёта"),
    status: reportStatusSchema,
    objectTypes: z
      .array(objectTypeSchema)
      .min(1, "Должен быть указан хотя бы один тип объекта"),
    clientName: z.string().min(1, "Укажите заказчика"),
    reportDir: z.string().min(1, "Путь к папке отчёта обязателен"),
    createdAt: z.string().min(1, "Укажите дату создания"),
    updatedAt: z.string().min(1, "Укажите дату обновления"),
  });

export const createAppraisingReportSchema = appraisingReportIndexDataSchema
  .pick({
    clientName: true,
    reportDir: true,
  })
  .extend({
    reportSequenceNumber: z
      .string()
      .min(1, "Номер отчёта обязателен")
      .max(50, "Номер отчёта слишком длинный")
      .transform((val) => val.replace(/[<>:"/\\|?*]/g, "").trim())
      .refine(
        (val) => val.length > 0,
        "Номер отчёта не может состоять только из запрещённых символов",
      ),
    appraisingContractId: z.uuid("ID договора должен быть UUID"),
  });

export const appraisingReportSchema = z.object({
  id: z.uuid("ID отчёта должен быть UUID"),
  status: reportStatusSchema,
  metadata: appraisingReportMetadataSchema,
  reportTask: appraisingReportTaskSchema,
  marketAnalysis: z
    .array(marketAnalysisSchema)
    .min(1, "В отчёте должен быть указан хотя бы один анализ рынка"),
  appraisers: z
    .array(appraiserSchema)
    .min(1, "В отчёте должен быть указан хотя бы один оценщик"),
  files: reportFilesSchema,
  valuationResults: valuationResultsSchema,
  objects: z
    .array(appraisingObjectSchema)
    .min(1, "В отчёте должен быть хотя бы один объект оценки"),
  createdAt: z.string().min(1, "Укажите дату создания"),
  updatedAt: z.string().min(1, "Укажите дату последнего обновления"),
});

export type ReportFilesInput = z.infer<typeof reportFilesSchema>;
export type ValueVariantInput = z.infer<typeof valueVariantSchema>;
export type AppraisingAssumptionInput = z.infer<
  typeof appraisingAssumptionSchema
>;
export type AppraisingRestrictionInput = z.infer<
  typeof appraisingRestrictionSchema
>;
export type SpecificRequirementInput = z.infer<
  typeof specificRequirementSchema
>;
export type MarketAnalysisInput = z.infer<typeof marketAnalysisSchema>;
export type ValuationResultsInput = z.infer<typeof valuationResultsSchema>;
export type AppraisingReportTaskInput = z.infer<
  typeof appraisingReportTaskSchema
>;
export type AppraisingReportMetadataInput = z.infer<
  typeof appraisingReportMetadataSchema
>;
export type AppraisingReportIndexDataInput = z.infer<
  typeof appraisingReportIndexDataSchema
>;
export type AppraisingReportInput = z.infer<typeof appraisingReportSchema>;

