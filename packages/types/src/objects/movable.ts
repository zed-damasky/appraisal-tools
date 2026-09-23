import { BaseAppraisalObject, Depreciation, LocationCharacteristics, RightsOnMovableObject } from ".";

export type TypeOfCars =
  | "motocycle"
  | "passenger_light_car"
  | "passenger_heavy_car_or_bus"
  | "light_truck"
  | "medium_truck"
  | "heavy_truck"
  | "special_car"
  | "tractor"
  | "trailer"
  | "generator"
  | "watercraft"
  | "aircraft"
  | "other";

export interface MovableObject extends BaseAppraisalObject {
  objectType: "movable_property";
  rights: RightsOnMovableObject;
  locationCharacteristics?: LocationCharacteristics;
  locationAddress?: string;
}

export interface DetailElement {
  id: string;
  name: string;
  numberDetail?: string;
  manufacturer: string;
  yearOfManufacture: number;
  yearOfCapitalRepair?: number;
  depreciation: Depreciation;
  impactWeightOnFullObject?: number;
}

export interface MotorisedObject extends MovableObject {
  typeOfCar: TypeOfCars;
  brand: string;
  model: string;
  numberObject: string;
  color: string;
  motorPowerHP: number;
  motorPowerKWT: number;
  yearOfManufacture: number;
  yearOfCapitalRepair?: number;
  depreciation: Depreciation;
  details: DetailElement[];
  kilometerage: number;
  plateNumber?: string;
}

export interface MotorisedFuelObject extends MotorisedObject {
  subtype: "motorised_fuel";
  fuelType: "diesel" | "petrol" | "other";
}

export interface MotorisedElectricityObject extends MotorisedObject {
  subtype: "motorised_electricity";
}