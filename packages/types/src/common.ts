export type ReportStatus =
  "draft" | "in_progress" | "review" | "completed" | "archived";
export type ObjectType = "immovable_property" | "movable_property" | "business";
export type ValuationApproach = "comparative" | "income" | "cost";
export type ApproachStatus = "used" | "rejected" | "not_applicable";

export interface Settings {
  port: number;
  theme: "light" | "dark";
}

export interface Contacts {
  email: string;
  phone: string;
  telegram?: string;
  whatsapp?: string;
  max?: string;
  vk?: string;
  viber?: string;
}

export enum AllowedMimeType {
  JPEG = "image/jpeg",
  PNG = "image/png",
  WEBP = "image/webp",
  HEIC = "image/heic", 
  PDF = "application/pdf",
}

export interface Document {
  id: string;
  name: string;
  path: string;
  mimeType: AllowedMimeType;
  size?: number;
}

export interface Persona {
  id: string;
  fullName: string;
  contacts: Contacts;
}

export interface Organisation {
  id: string;
  legalForm: string;
  fullName: string;
  shortName: string;
  regNumber: string;
  regDate: string;
  taxIdentificationNumber: string;
  regReasonCodeTax: string;
  regAddress: string;
  physicalAddress: string;
  contacts: Contacts;
}

export interface InsuranceInformation {
  nameInsuranceCompany: string;
  contractNumber: string;
  issueDate: string;
  validDateFrom: string;
  validDateTo: string;
  insuredAmount: string;
}

export interface AppraisingContract {
  id: string;
  contractNumber: string;
  contractDate: string;
  //appraisingReportId: string[];
  //contractReward: number;
}
