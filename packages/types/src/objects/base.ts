
import { Document } from "..";

export interface Rights {
  typeOfRights: string;
  ownership: string;
  dateOfOwnership: string;
  rightsDocuments: Document[];
}

export interface Restriction {
  typeOfRestrictionRights: string;
  restrictor: string;
  regNumberRestrictionRights: string;
  regDateRestrictionRights: string;
  restrictionDocuments: Document[];
}

export interface RightsOnMovableObject extends Rights {
  restriction: Restriction[];
  quantityOfRights?: string;
  regNumberRights?: string;
  regDateRights?: string;
}

export interface RightsOnImmovableObject extends Rights {
  //pecentageOfRights: number;
  quantityOfRights: string;
  regNumberRights: string;
  regDateRights: string;
  restriction: Restriction[];
}

export interface VisualInspection {
  visualInspectionType:
    | "full"
    | "partial_external"
    | "partial_internal"
    | "partial_with_specified_criteria"
    | "without_visual_inspection";
  dateStart?: string;
  dateFinish?: string;
  description: string;
}

export interface LocationElement {
  name: string;
  description?: string;
}

export interface LocationCharacteristics {
  latitude: number;
  longitude: number;

  mapLocationImage?: Document;

  country: string;
  subjectCountry: string;
  regionSubject?: string;
  settlement?: string;
  regionSettlement?: string;
  street?: string;
  buildingNumber?: string;
  premisesNumber?: string;

  nearestHighway: string;
  roadAccess: string;
  ecologicalSituation: "favorable" | "relatively-favorable" | "unfavorable";
  ecologicalSituationDescription?: string;
  transportAccess: string;
  infrastructureObjects: LocationElement[];
  otherNearObjects?: LocationElement[];
}

export interface Depreciation {
  physicalDepreciation: number;
  functionalDepreciation: number;
  externalEconomicDepreciation: number;
}

export interface BaseAppraisalObject {
  id: string;
  name: string;
  visualInspection: VisualInspection;
  appraisalDate: string;
  technicalDocuments: Document[];
  otherDocuments?: Document[];
}

//пока пусть будет так
/*
export interface RightsOnBusiness extends Rights {
  //pecentageOfRights: number;
  regNumberRights: string;
  regDateRights: string;
  typeOfRestrictionOfRights: string;
  regNumberRestrictionRights: string;
  regDateRestrictionRights: string;
}
*/
