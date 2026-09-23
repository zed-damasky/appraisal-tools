import { z } from "zod";
import { immovablePropertyObjectSchema } from "./immovableSchema";
import { movablePropertyObjectSchema } from "./movableSchema";

export * from "./baseSchema";
export * from "./immovableSchema";
export * from "./movableSchema";

export const appraisingObjectSchema = z.discriminatedUnion("objectType", [
  immovablePropertyObjectSchema,
  movablePropertyObjectSchema,
  // businessObjectSchema
]);

export type AppraisingObjectInput = z.infer<typeof appraisingObjectSchema>;
