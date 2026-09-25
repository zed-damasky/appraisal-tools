import { z } from "zod";

export const reportStatusSchema = z.enum([
  "draft",
  "in_progress",
  "review",
  "completed",
  "archived",
]);

export const objectTypeSchema = z.enum([
  "immovable_property",
  "movable_property",
  "business",
]);

export const valuationApproachSchema = z.enum([
  "comparative",
  "income",
  "cost",
]);

export const settingsSchema = z.object({
  port: z.number().int().min(1024).max(65535),
  theme: z.enum(["light", "dark"]),
});

export const contactsSchema = z.object({
  email: z.email("Некорректный email"),
  phone: z.string().min(10, "Телефон должен содержать минимум 10 символов"),
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  max: z.string().optional(),
  vk: z.string().optional(),
  viber: z.string().optional(),
});

export const documentSchema = z.object({
  id: z.uuid("ID документа должен быть UUID"),
  name: z.string().min(1, "Название документа обязательно"),
  path: z.string().min(1, "Путь к документу обязателен"),
});

export const personaSchema = z.object({
  id: z.uuid(),
  fullName: z.string().min(5, "ФИО должно содержать минимум 5 символов"),
  contacts: contactsSchema,
});

export const organisationSchema = z.object({
  id: z.uuid(),
  legalForm: z.string().min(1, "Укажите организационно-правовую форму"),
  fullName: z.string().min(1, "Укажите полное наименование"),
  shortName: z.string().min(1, "Укажите сокращённое наименование"),
  regNumber: z
    .string()
    .length(13, "ОГРН должен содержать 13 цифр")
    .regex(/^\d+$/, "Только цифры"),
  regDate: z.string().min(1, "Укажите дату регистрации"),
  taxIdentificationNumber: z
    .string()
    .length(10, "ИНН организации — 10 цифр")
    .regex(/^\d+$/, "Только цифры"),
  regReasonCodeTax: z
    .string()
    .length(9, "КПП должен содержать 9 цифр")
    .regex(/^\d+$/, "Только цифры"),
  regAddress: z.string().min(1, "Укажите юридический адрес"),
  physicalAddress: z.string().min(1, "Укажите фактический адрес"),
  contacts: contactsSchema,
});

export const insuranceInformationSchema = z.object({
  nameInsuranceCompany: z.string().min(1, "Укажите страховую компанию"),
  contractNumber: z.string().min(1, "Укажите номер полиса"),
  issueDate: z.string().min(1, "Укажите дату выдачи"),
  validDateFrom: z.string().min(1, "Укажите начало действия"),
  validDateTo: z.string().min(1, "Укажите окончание действия"),
  insuredAmount: z.string().min(1, "Укажите страховую сумму"),
});

export const appraisingContractSchema = z.object({
  id: z.uuid(),
  contractNumber: z.string().min(1, "Укажите номер договора"),
  contractDate: z.string().min(1, "Укажите дату договора"),
  appraisingReportId: z.array(z.uuid()),
  contractReward: z.number().min(0, "Стоимость не может быть отрицательной"),
});
