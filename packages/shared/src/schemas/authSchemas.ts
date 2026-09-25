import z from "zod";
import { appraiserSchema, recoveryWordsInputSchema } from ".";

export const appraiserRegistrationSchema = appraiserSchema.omit({
  passwordHash: true,
  recoveryWordsHashes: true,
});

export const loginSchema = z.object({
  email: z.email("Некорректный email"),
  password: z.string().min(1, "Укажите пароль"),
});

export const recoveryWordsForResetSchema = z
  .array(
    z
      .string()
      .min(1, "Слово не может быть пустым")
      .max(50, "Слово слишком длинное")
      .transform((val) => val.trim().toLowerCase()),
  )
  .length(6, "Должно быть ровно 6 слов");

export const resetPasswordSchema = z.object({
  email: z.email("Некорректный email"),
  recoveryWords: recoveryWordsForResetSchema,
  newPassword: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

export const registerSchema = z.object({
  appraiser: appraiserRegistrationSchema,
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  recoveryWords: recoveryWordsInputSchema,
});
