import z from "zod";

export const appraisingContractSchema = z.object({
  id: z.uuid(),
  contractNumber: z.string().min(1, "Укажите номер договора"),
  contractDate: z.string().min(1, "Укажите дату договора"),
  //appraisingReportId: z.array(z.uuid()).default([]),
  //contractReward: z.number().min(0, "Вознаграждение не может быть отрицательным"),
});

export const createAppraisingContractSchema = z.object({
  contractNumber: z.string().min(1, "Номер договора обязателен"),
  contractDate: z.string().min(1, "Дата договора обязательна"),
});

export const updateAppraisingContractSchema = appraisingContractSchema.partial();

export type AppraisingContractInput = z.infer<typeof appraisingContractSchema>;
export type CreateAppraisingContractInput = z.infer<typeof createAppraisingContractSchema>;
export type UpdateAppraisingContractInput = z.infer<typeof updateAppraisingContractSchema>;