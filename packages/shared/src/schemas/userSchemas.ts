import { z } from "zod";
import {
  documentSchema,
  insuranceInformationSchema,
  organisationSchema,
  personaSchema,
} from ".";

export const qualificationCertificateSchema = z.object({
  issuedBy: z.string().min(1, "Укажите, кем выдан аттестат"),
  issuedDate: z.string().min(1, "Укажите дату выдачи"),
  validDateFrom: z.string().min(1, "Укажите начало действия"),
  validDateTo: z.string().min(1, "Укажите окончание действия"),
  numberQualificationCertificate: z.string().min(1, "Укажите номер аттестата"),
});

export const diplomaSchema = z.object({
  nameOfType: z.string().min(1, "Укажите тип диплома"),
  university: z.string().min(1, "Укажите университет"),
  numberDiploma: z.string().min(1, "Укажите номер диплома"),
  program: z.string().min(1, "Укажите программу обучения"),
  issueDate: z.string().min(1, "Укажите дату выдачи"),
});

export const selfRegulatoryInformationSchema = z.object({
  legalForm: z.string().min(1, "Укажите организационно-правовую форму СРО"),
  fullName: z.string().min(1, "Укажите полное наименование СРО"),
  shortName: z.string().min(1, "Укажите сокращённое наименование СРО"),
  regAddress: z.string().min(1, "Укажите юридический адрес СРО"),
  physicalAddress: z.string().min(1, "Укажите фактический адрес СРО"),
  appraiserRegNumber: z.string().min(1, "Укажите регистрационный номер в СРО"),
  appraiserRegDate: z.string().min(1, "Укажите дату регистрации в СРО"),
  appraiserDocumentOfMembershipName: z
    .string()
    .min(1, "Укажите название документа о членстве"),
  appraiserDocumentOfMembershipDate: z
    .string()
    .min(1, "Укажите дату документа о членстве"),
});

export const appraisingProviderCompanySchema = organisationSchema.extend({
  insurance: insuranceInformationSchema,
  appraiserId: z.uuid("ID оценщика должен быть UUID"),
  providerDocumentList: z
    .array(documentSchema)
    .min(1, "Должен быть хотя бы один документ"),
});

export const appraisingProviderPrivatePracticeInformationSchema = z.object({
  id: z.uuid("ID должен быть UUID"),
  legalForm: z.string().min(1, "Укажите организационно-правовую форму"),
  regDate: z.string().min(1, "Укажите дату регистрации"),
  documentName: z.string().min(1, "Укажите название документа"),
  documentDate: z.string().min(1, "Укажите дату документа"),
  documentNumber: z.string().min(1, "Укажите номер документа"),
  privatePracticeDocumentList: z.array(documentSchema),
});

export const recoveryWordsInputSchema = z
  .array(
    z
      .string()
      .min(1, "Слово не может быть пустым")
      .max(50, "Слово слишком длинное")
      .transform((val) => val.trim().toLowerCase()),
  )
  .length(12, "Должно быть ровно 12 слов")
  .transform((words) => words.sort());

export const appraiserSchema = personaSchema.extend({
  address: z.string().min(5, "Укажите адрес (минимум 5 символов)").optional(),
  passwordHash: z.string().min(1, "Пароль обязателен"),
  recoveryWordsHashes: z
    .array(z.string())
    .length(12, "Должно быть 12 хешей слов"),
  taxIdentificationNumber: z
    .string()
    .length(12, "ИНН физлица должен содержать 12 цифр")
    .regex(/^\d+$/, "Только цифры")
    .optional(),
  diploma: diplomaSchema.optional(),
  qualificationCertificate: z
    .array(qualificationCertificateSchema)
    .min(1, "Должен быть хотя бы один аттестат")
    .optional(),
  workExperienceStartYear: z
    .string()
    .min(4, "Укажите год начала стажа")
    .regex(/^\d{4}$/, "Формат: ГГГГ")
    .optional(),
  insurance: insuranceInformationSchema.optional(),
  selfRegulatoryInfo: selfRegulatoryInformationSchema.optional(),
  personalDocumentList: z.array(documentSchema).optional(),
  hasPrivatePractice: z.boolean().default(false),
  privatePracticeInformation:
    appraisingProviderPrivatePracticeInformationSchema.optional(),
  defaultWorkplaceId: z.uuid("ID места работы должен быть UUID").optional(),
  workPlaceList: z.array(appraisingProviderCompanySchema).optional(),
});

export const updateProfileSchema = appraiserSchema
  .omit({ passwordHash: true, recoveryWordsHashes: true })
  .partial();

export const addWorkplaceSchema = appraisingProviderCompanySchema;
export const addCertificateSchema = qualificationCertificateSchema;

export const togglePrivatePracticeSchema = z.object({
  hasPrivatePractice: z.boolean(),
  privatePracticeInformation:
    appraisingProviderPrivatePracticeInformationSchema.optional(),
});

export type AppraiserInput = z.infer<typeof appraiserSchema>;
export type RecoveryWordsInput = z.infer<typeof recoveryWordsInputSchema>;
