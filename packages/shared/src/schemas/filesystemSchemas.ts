import { z } from "zod";

export const checkPathSchema = z.object({
  path: z.string().min(1, "Путь обязателен"),
});

export const markerDataSchema = z.object({
  version: z.string(),
  createdAt: z.string(),
  appId: z.uuid(),
});

export const createMarkerSchema = z.object({
  path: z.string().min(1, "Путь обязателен"),
});

export const verifyMarkerSchema = z.object({
  path: z.string().min(1, "Путь обязателен"),
});

export const listDirectorySchema = z.object({
  path: z.string().min(1, "Путь обязателен"),
});

export type CheckPathInput = z.infer<typeof checkPathSchema>;
export type MarkerData = z.infer<typeof markerDataSchema>;
export type CreateMarkerInput = z.infer<typeof createMarkerSchema>;
export type VerifyMarkerInput = z.infer<typeof verifyMarkerSchema>;
export type ListDirectoryInput = z.infer<typeof listDirectorySchema>;
