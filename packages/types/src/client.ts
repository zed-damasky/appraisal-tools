import { AppraisingContract, Organisation, Persona } from ".";

export interface Client {
  contract: AppraisingContract[];
}

export interface ClientOrganisation extends Organisation, Client {}

export interface ClientPersona extends Persona, Client {
  passportName: string;
  passportNumber: string;
  passportIssueDate: string;
  passportIssueBy: string;
  passportIssueByCode: string;
  address: string;
}
