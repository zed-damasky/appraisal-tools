import { z } from "zod";
import { appraisingContractSchema, organisationSchema, personaSchema } from ".";

export const clientSchema = z.object({
  contract: z.array(appraisingContractSchema).min(1, "Должен быть хотя бы один договор"),
});


export const clientOrganisationSchema = organisationSchema.extend({
  contract: z.array(appraisingContractSchema).min(1, "Должен быть хотя бы один договор"),
});

export const clientPersonaSchema = personaSchema.extend({
  passportName: z.string().min(5, "ФИО должно содержать минимум 5 символов"),
  passportNumber: z
    .string()
    .length(10, "Серия и номер паспорта должны содержать 10 цифр")
    .regex(/^\d+$/, "Только цифры"),
  passportIssueDate: z.string().min(1, "Укажите дату выдачи паспорта"),
  passportIssueBy: z.string().min(5, "Укажите кем выдан паспорт"),
  passportIssueByCode: z
    .string()
    .length(7, "Код подразделения должен содержать 7 символов")
    .regex(/^\d{3}-\d{3}$/, "Формат: XXX-XXX"),
  address: z.string().min(5, "Укажите адрес регистрации"),
  contract: z.array(appraisingContractSchema).min(1, "Должен быть хотя бы один договор"),
});

export type ClientOrganisationInput = z.infer<typeof clientOrganisationSchema>;
export type ClientPersonaInput = z.infer<typeof clientPersonaSchema>;