import { InsuranceInformation, Organisation, Persona } from ".";

export interface QualificationCertificate {
  issuedBy: string;
  issuedDate: string;
  validDateFrom: string;
  validDateTo: string;
  numberQualificationCertificate: string;
}

export interface Diploma {
  nameOfType: string;
  university: string;
  numberDiploma: string;
  program: string;
  issueDate: string;
}

export interface SelfRegulatoryInformation {
  legalForm: string;
  fullName: string;
  shortName: string;
  regAddress: string;
  physicalAddress: string;
  appraiserRegNumber: string;
  appraiserRegDate: string;
  appraiserDocumentOfMembershipName: string;
  appraiserDocumentOfMembershipDate: string;
}

export interface AppraisingProviderCompany extends Organisation {
  insurance: InsuranceInformation;
  appraiserId: string;
  providerDocumentList: Document[];
}

export interface AppraisingProviderPrivatePracticeInformation {
  id: string;
  legalForm: string;
  regDate: string;
  documentName: string;
  documentDate: string;
  documentNumber: string;
  privatePracticeDocumentList: Document[];
}

export interface Appraiser extends Persona {
  address: string;

  passwordHash: string;

  taxIdentificationNumber: string;

  diploma: Diploma;

  qualificationCertificate: QualificationCertificate[];

  workExperienceStartYear: string;

  insurance: InsuranceInformation;

  selfRegulatoryInfo: SelfRegulatoryInformation;

  personalDocumentList: Document[];

  hasPrivatePractice: boolean;
  privatePracticeInformation?: AppraisingProviderPrivatePracticeInformation;

  defaultWorkplaceId: string;

  workPlaceList: AppraisingProviderCompany[];
}
