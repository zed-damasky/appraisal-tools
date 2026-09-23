import {
  BaseAppraisalObject,
  Depreciation,
  LocationCharacteristics,
  RightsOnImmovableObject,
} from ".";

export interface SpecialArea {
  name: string;
  area: number;
}

export interface ConstructionElement {
  id: string;
  name: string;
  description?: string;
}

export interface Communications {
  coldWater: string;
  hotWater: string;
  sewerage: string;
  heating: string;
  electricity: string;
  gas: string;
}

export interface InteriorFinishing {
  interiorWallsCovers: ConstructionElement[];
  floorCovers: ConstructionElement[];
  ceilingCovers: ConstructionElement[];
}

export interface ExteriorFinishing {
  foundationCovers: ConstructionElement[];
  exteriorWallsCovers: ConstructionElement[];
  roofCovers: ConstructionElement[];
}

export interface Remodeling {
  hasRemodeling: boolean;
  planByDocumentsPath: string;
  planByRealPath?: string;
  description: string;
  canBeComplianced: boolean;
  costOfComplianceWithPlan: number;
}

export interface ImmovableObject extends BaseAppraisalObject {
  objectType: "immovable_property";
  kadNumber?: string;
  totalArea: number;
  specialAreas?: SpecialArea[];
  locationAddress: string;
  rights: RightsOnImmovableObject[];
  locationCharacteristics: LocationCharacteristics;
  depreciation: Depreciation;
}

export interface LandPlot extends ImmovableObject {
  subtype: "land_plot";
  categoryLand: string;
  purposeUseLand: string;
  relief: string;
  formLandPlot: string;
  communications: Communications;
  hasStructures: boolean;
  hasBuildings: boolean;
  landStructures?: ConstructionElement[];
}

export interface Structure extends Omit<ImmovableObject, "totalArea"> {
  subtype: "structure";
  totalArea?: number;
  unitMeasurement: string;
  totalUnitsMeasurement: number;
  material: ConstructionElement[];
  remodeling: Remodeling;
}

export interface Building extends ImmovableObject {
  subtype: "building";
  typeOfBuilding: "living" | "not_living";
  yearOfConstruction: number;
  durabilityClass: number;
  locateLandPlot: LandPlot;
  aboveFloors: number;
  undergroundFloors: number;
  foundation: ConstructionElement[];
  exteriorWalls: ConstructionElement[];
  interiorWalls: ConstructionElement[];
  floorStructures: ConstructionElement[];
  roof: ConstructionElement[];
  windows: ConstructionElement[];
  exteriorDoors: ConstructionElement[];
  interiorDoors: ConstructionElement[];
  communications: Communications;
  extraElements: ConstructionElement[];
  exteriorCovers: ExteriorFinishing;
  interiorCovers?: InteriorFinishing;
  remodeling: Remodeling;
}

export interface PremisesObject extends ImmovableObject {
  subtype:
    | "apartment"
    | "office"
    | "room_in_communal"
    | "room_in_building"
    | "garage_in_building"
    | "other";
  locateBuilding: Building;
  interiorCovers: InteriorFinishing;
  interiorWalls: ConstructionElement[];
  windows: ConstructionElement[];
  exteriorDoors: ConstructionElement[];
  interiorDoors: ConstructionElement[];
  communications: Communications;
  extraElements: ConstructionElement[];
  viewFromWindow: string;
  remodeling: Remodeling;
}
