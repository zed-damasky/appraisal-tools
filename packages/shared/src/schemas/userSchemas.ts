import { z } from "zod";
import { documentSchema, insuranceInformationSchema, organisationSchema, personaSchema } from ".";

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
  appraiserDocumentOfMembershipName: z.string().min(1, "Укажите название документа о членстве"),
  appraiserDocumentOfMembershipDate: z.string().min(1, "Укажите дату документа о членстве"),
});

export const appraisingProviderCompanySchema = organisationSchema.extend({
  insurance: insuranceInformationSchema,
  appraiserId: z.uuid("ID оценщика должен быть UUID"),
  providerDocumentList: z.array(documentSchema).min(1, "Должен быть хотя бы один документ"),
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

export const appraiserSchema = personaSchema.extend({
  address: z.string().min(5, "Укажите адрес (минимум 5 символов)"),
  passwordHash: z.string().min(1, "Пароль обязателен"),
  taxIdentificationNumber: z
    .string()
    .length(12, "ИНН физлица должен содержать 12 цифр")
    .regex(/^\d+$/, "Только цифры"),
  diploma: diplomaSchema,
  qualificationCertificate: z.array(qualificationCertificateSchema).min(1, "Должен быть хотя бы один аттестат"),
  workExperienceStartYear: z.string().min(4, "Укажите год начала стажа").regex(/^\d{4}$/, "Формат: ГГГГ"),
  insurance: insuranceInformationSchema,
  selfRegulatoryInfo: selfRegulatoryInformationSchema,
  personalDocumentList: z.array(documentSchema),
  hasPrivatePractice: z.boolean(),
  privatePracticeInformation: appraisingProviderPrivatePracticeInformationSchema.optional(),
  defaultWorkplaceId: z.uuid("ID места работы должен быть UUID"),
  workPlaceList: z.array(appraisingProviderCompanySchema),
});