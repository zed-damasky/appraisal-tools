import z from "zod";
import {
  buildingSchema,
  landPlotSchema,
  motorisedElectricityObjectSchema,
  motorisedFuelObjectSchema,
  premisesObjectSchema,
  structureSchema,
} from ".";

const analogueMarketDataExtension = {
  id: z.uuid("ID аналога должен быть UUID"),
  objectId: z.uuid("ID объекта оценки должен быть UUID").optional(),
  sourceUrl: z.url("Невалидный URL источника").optional(),
  offerDate: z.string().min(1, "Дата предложения обязательна"),
  sourceLocalPath: z.string().min(1, "Путь к скриншоту/выкопировке обязателен"),
  offerPrice: z.number().positive("Цена должна быть положительной"),
  contactPhone: z.string().optional(),
  rightsOnAnalogue: z.string().min(1, "Укажите информацию о правах на аналог"),
  restrictionsOnAnalogue: z.string().optional().default("Не зарегистрировано"),
};

export const analogueObjectSchema = z.union([
  landPlotSchema
    .omit({
      id: true,
      rights: true,
      technicalDocuments: true,
      otherDocuments: true,
    })
    .extend(analogueMarketDataExtension),

  buildingSchema
    .omit({
      id: true,
      rights: true,
      technicalDocuments: true,
      otherDocuments: true,
    })
    .extend(analogueMarketDataExtension),

  premisesObjectSchema
    .omit({
      id: true,
      rights: true,
      technicalDocuments: true,
      otherDocuments: true,
    })
    .extend(analogueMarketDataExtension),

  structureSchema
    .omit({
      id: true,
      rights: true,
      technicalDocuments: true,
      otherDocuments: true,
    })
    .extend(analogueMarketDataExtension),

  motorisedFuelObjectSchema
    .omit({
      id: true,
      rights: true,
      technicalDocuments: true,
      otherDocuments: true,
    })
    .extend(analogueMarketDataExtension),

  motorisedElectricityObjectSchema
    .omit({
      id: true,
      rights: true,
      technicalDocuments: true,
      otherDocuments: true,
    })
    .extend(analogueMarketDataExtension),
]);

export type AnalogueObjectInput = z.infer<typeof analogueObjectSchema>;
