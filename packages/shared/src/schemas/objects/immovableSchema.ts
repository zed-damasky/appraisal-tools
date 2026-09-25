import { z } from "zod";
import {
  baseAppraisalObjectSchema,
  depreciationSchema,
  locationCharacteristicsSchema,
  rightsOnImmovableObjectSchema,
} from "./baseSchema";

export const specialAreaSchema = z.object({
  name: z.string().min(1, "Укажите название площади"),
  area: z.number().positive("Площадь должна быть положительным числом"),
});

export const constructionElementSchema = z.object({
  id: z.uuid("ID элемента должен быть UUID"),
  name: z.string().min(1, "Укажите название элемента"),
  description: z.string().optional(),
});

export const communicationsSchema = z.object({
  coldWater: z.string().min(1, "Укажите информацию о холодном водоснабжении"),
  hotWater: z.string().min(1, "Укажите информацию о горячем водоснабжении"),
  sewerage: z.string().min(1, "Укажите информацию о канализации"),
  heating: z.string().min(1, "Укажите информацию об отоплении"),
  electricity: z.string().min(1, "Укажите информацию об электроснабжении"),
  gas: z.string().min(1, "Укажите информацию о газоснабжении"),
});

export const interiorFinishingSchema = z.object({
  interiorWallsCovers: z.array(constructionElementSchema),
  floorCovers: z.array(constructionElementSchema),
  ceilingCovers: z.array(constructionElementSchema),
});

export const exteriorFinishingSchema = z.object({
  foundationCovers: z.array(constructionElementSchema),
  exteriorWallsCovers: z.array(constructionElementSchema),
  roofCovers: z.array(constructionElementSchema),
});

export const remodelingSchema = z.object({
  hasRemodeling: z.boolean(),
  planByDocumentsPath: z.string().min(1, "Укажите путь к плану по документам"),
  planByRealPath: z.string().optional(),
  description: z.string().min(1, "Опишите перепланировку"),
  canBeComplianced: z.boolean(),
  costOfComplianceWithPlan: z
    .number()
    .min(0, "Стоимость согласования не может быть отрицательной"),
});

export const immovableObjectSchema = baseAppraisalObjectSchema.extend({
  objectType: z.literal("immovable_property"),
  kadNumber: z.string().optional(),
  totalArea: z
    .number()
    .positive("Общая площадь должна быть положительным числом"),
  specialAreas: z.array(specialAreaSchema).optional(),
  locationAddress: z
    .string()
    .min(5, "Укажите адрес объекта (минимум 5 символов)"),
  rights: z
    .array(rightsOnImmovableObjectSchema)
    .min(1, "Должно быть указано хотя бы одно право"),
  locationCharacteristics: locationCharacteristicsSchema,
  depreciation: depreciationSchema,
});

export const landPlotSchema = immovableObjectSchema.extend({
  subtype: z.literal("land_plot"),
  categoryLand: z.string().min(1, "Укажите категорию земель"),
  purposeUseLand: z.string().min(1, "Укажите вид разрешённого использования"),
  relief: z.string().min(1, "Опишите рельеф участка"),
  formLandPlot: z.string().min(1, "Укажите форму участка"),
  communications: communicationsSchema,
  hasStructures: z.boolean(),
  hasBuildings: z.boolean(),
  landStructures: z.array(constructionElementSchema).optional(),
});

export const structureSchema = immovableObjectSchema
  .omit({ totalArea: true })
  .extend({
    subtype: z.literal("structure"),
    totalArea: z.number().positive().optional(),
    unitMeasurement: z.string().min(1, "Укажите единицу измерения"),
    totalUnitsMeasurement: z
      .number()
      .positive("Количество должно быть положительным числом"),
    material: z
      .array(constructionElementSchema)
      .min(1, "Укажите хотя бы один материал"),
    remodeling: remodelingSchema,
  });

export const buildingSchema = immovableObjectSchema.extend({
  subtype: z.literal("building"),
  typeOfBuilding: z.enum(["living", "not_living"], {
    message: "Выберите тип здания: жилое или нежилое",
  }),
  yearOfConstruction: z
    .number()
    .int("Год постройки должен быть целым числом")
    .min(1000, "Год постройки не может быть ранее 1000")
    .max(new Date().getFullYear(), "Год постройки не может быть в будущем"),
  durabilityClass: z
    .number()
    .int("Группа капитальности должна быть целым числом"),
  locateLandPlot: z.lazy(() => landPlotSchema),
  aboveFloors: z
    .number()
    .int("Количество надземных этажей должно быть целым числом")
    .min(1, "Должен быть хотя бы один надземный этаж"),
  undergroundFloors: z
    .number()
    .int("Количество подземных этажей должно быть целым числом")
    .min(0, "Количество подземных этажей не может быть отрицательным"),
  foundation: z.array(constructionElementSchema),
  exteriorWalls: z.array(constructionElementSchema),
  interiorWalls: z.array(constructionElementSchema),
  floorStructures: z.array(constructionElementSchema),
  roof: z.array(constructionElementSchema),
  windows: z.array(constructionElementSchema),
  exteriorDoors: z.array(constructionElementSchema),
  interiorDoors: z.array(constructionElementSchema),
  communications: communicationsSchema,
  extraElements: z.array(constructionElementSchema),
  exteriorCovers: exteriorFinishingSchema,
  interiorCovers: interiorFinishingSchema.optional(),
  remodeling: remodelingSchema,
});

export const premisesObjectSchema = immovableObjectSchema.extend({
  subtype: z.enum(
    [
      "apartment",
      "office",
      "room_in_communal",
      "room_in_building",
      "garage_in_building",
      "other",
    ],
    { message: "Выберите тип помещения из списка" },
  ),
  locateBuilding: z.lazy(() => buildingSchema),
  interiorCovers: interiorFinishingSchema,
  interiorWalls: z.array(constructionElementSchema),
  windows: z.array(constructionElementSchema),
  exteriorDoors: z.array(constructionElementSchema),
  interiorDoors: z.array(constructionElementSchema),
  communications: communicationsSchema,
  extraElements: z.array(constructionElementSchema),
  viewFromWindow: z.string().min(1, "Опишите вид из окна"),
  remodeling: remodelingSchema,
});

export const immovablePropertyObjectSchema = z.discriminatedUnion("subtype", [
  landPlotSchema,
  structureSchema,
  buildingSchema,
  premisesObjectSchema,
]);

export type SpecialAreaInput = z.infer<typeof specialAreaSchema>;
export type ConstructionElementInput = z.infer<
  typeof constructionElementSchema
>;
export type CommunicationsInput = z.infer<typeof communicationsSchema>;
export type InteriorFinishingInput = z.infer<typeof interiorFinishingSchema>;
export type ExteriorFinishingInput = z.infer<typeof exteriorFinishingSchema>;
export type RemodelingInput = z.infer<typeof remodelingSchema>;
export type ImmovablePropertyObjectInput = z.infer<
  typeof immovablePropertyObjectSchema
>;
