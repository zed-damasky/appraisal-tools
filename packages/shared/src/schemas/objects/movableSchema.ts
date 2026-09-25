import { z } from "zod";
import {
  baseAppraisalObjectSchema,
  depreciationSchema,
  locationCharacteristicsSchema,
  rightsOnMovableObjectSchema,
} from "./baseSchema";

export const typeOfCarsSchema = z.enum(
  [
    "motocycle",
    "passenger_light_car",
    "passenger_heavy_car_or_bus",
    "light_truck",
    "medium_truck",
    "heavy_truck",
    "special_car",
    "tractor",
    "trailer",
    "generator",
    "watercraft",
    "aircraft",
    "other",
  ],
  {
    message: "Выберите тип транспортного средства из списка",
  },
);

export const fuelTypeSchema = z.enum(["diesel", "petrol", "other"], {
  message: "Выберите тип топлива из списка",
});

export const movableObjectSchema = baseAppraisalObjectSchema.extend({
  objectType: z.literal("movable_property"),
  rights: rightsOnMovableObjectSchema,
  locationCharacteristics: locationCharacteristicsSchema.optional(),
  locationAddress: z.string().optional(),
});

export const detailElementSchema = z.object({
  id: z.uuid("ID детали должен быть UUID"),
  name: z.string().min(1, "Укажите название детали"),
  numberDetail: z.string().optional(),
  manufacturer: z.string().min(1, "Укажите производителя"),
  yearOfManufacture: z
    .number()
    .int("Год выпуска должен быть целым числом")
    .min(1800, "Год выпуска не может быть ранее 1800")
    .max(new Date().getFullYear(), "Год выпуска не может быть в будущем"),
  yearOfCapitalRepair: z
    .number()
    .int("Год кап. ремонта должен быть целым числом")
    .min(1800)
    .max(new Date().getFullYear())
    .optional(),
  depreciation: depreciationSchema,
  impactWeightOnFullObject: z
    .number()
    .min(0, "Вес влияния не может быть отрицательным")
    .max(1, "Вес влияния не может превышать 1 (100%)")
    .optional(),
});

export const motorisedObjectSchema = movableObjectSchema.extend({
  typeOfCar: typeOfCarsSchema,
  brand: z.string().min(1, "Укажите марку"),
  model: z.string().min(1, "Укажите модель"),
  numberObject: z
    .string()
    .min(1, "Укажите номер объекта (VIN / шасси / заводской номер)"),
  color: z.string().min(1, "Укажите цвет"),
  motorPowerHP: z
    .number()
    .positive("Мощность в л.с. должна быть положительным числом"),
  motorPowerKWT: z
    .number()
    .positive("Мощность в кВт должна быть положительным числом"),
  yearOfManufacture: z
    .number()
    .int("Год выпуска должен быть целым числом")
    .min(
      1886,
      "Год выпуска не может быть ранее 1886 (год создания первого автомобиля)",
    )
    .max(new Date().getFullYear(), "Год выпуска не может быть в будущем"),
  yearOfCapitalRepair: z
    .number()
    .int("Год кап. ремонта должен быть целым числом")
    .min(1886)
    .max(new Date().getFullYear())
    .optional(),
  depreciation: depreciationSchema,
  details: z.array(detailElementSchema),
  kilometerage: z.number().min(0, "Пробег не может быть отрицательным"),
  plateNumber: z.string().optional(),
});

export const motorisedFuelObjectSchema = motorisedObjectSchema.extend({
  subtype: z.literal("motorised_fuel"),
  fuelType: fuelTypeSchema,
});

export const motorisedElectricityObjectSchema = motorisedObjectSchema.extend({
  subtype: z.literal("motorised_electricity"),
});

export const movablePropertyObjectSchema = z.discriminatedUnion("subtype", [
  motorisedFuelObjectSchema,
  motorisedElectricityObjectSchema,
]);

export type TypeOfCarsInput = z.infer<typeof typeOfCarsSchema>;
export type FuelTypeInput = z.infer<typeof fuelTypeSchema>;
export type DetailElementInput = z.infer<typeof detailElementSchema>;
export type MotorisedObjectInput = z.infer<typeof motorisedObjectSchema>;
export type MotorisedFuelObjectInput = z.infer<
  typeof motorisedFuelObjectSchema
>;
export type MotorisedElectricityObjectInput = z.infer<
  typeof motorisedElectricityObjectSchema
>;
export type MovablePropertyObjectInput = z.infer<
  typeof movablePropertyObjectSchema
>;
