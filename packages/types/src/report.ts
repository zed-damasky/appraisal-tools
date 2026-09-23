import { Appraiser, AppraisingObject, ReportStatus, ValuationApproach } from ".";

export interface ReportFiles {
  baseDir: string;
  folderName: string;
  pdf?: string;
  doc?: string;
  xls?: string;
  photos: string[];
  docs: string[];
}

export interface ValueVariant {
  id: string;
  name: string;
  premises: string;
  description?: string;
}

export interface AppraisingAssumption {
  id: string;
  description: string;
}

export interface AppraisingRestriction {
  id: string;
  description: string;
}

export interface SpecificRequirement {
  id: string;
  description: string;
}

export interface MarketAnalysis {
  id: string;
  path: string;
  highestAndBestUse: string;
}

export interface ValuationResults {
  approachesUsed: ValuationApproach[];
  approachesRejected: { approach: ValuationApproach; reason: string }[];
  reconciliationDescription: string;
  finalValue: number;
  currency: string;
}

export interface AppraisingReportTask {
  id: string;

  appraisingContractId: string;
  appraisingReportId: string;

  appraisingDate: string;

  valueVariants: ValueVariant[];

  appraisingPurpose: string;

  commongAssumptions: AppraisingAssumption[];
  specialAssumptions: AppraisingAssumption[];
  otherAssumptions: AppraisingAssumption[];

  appraisingRestrictions: AppraisingRestriction[];
  usingRestrictions: AppraisingRestriction[];

  formOfAppraisingReport: "on_paper" | "electronic" | "all";

  usersOfReport: string;

  externalSpecialist: string;

  specificRequirements: SpecificRequirement[];
}

export interface AppraisingReportMetadata {
  id: string;
  reportSequenceNumber: string;
  reportDatePreperation: string;
  appraisingContractId: string;
  appraisingReportId: string;
}

export interface AppraisingReport {
  id: string;
  status: ReportStatus;
  metadata: AppraisingReportMetadata;
  reportTask: AppraisingReportTask;
  marketAnalysis: MarketAnalysis;
  appraisers: Appraiser[];
  files: ReportFiles;
  valuationResults: ValuationResults;
  objects: AppraisingObject[];
  createdAt: string;
  updatedAt: string;
}
