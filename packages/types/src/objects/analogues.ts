  import { AppraisingObject, Document  } from "..";

  export interface AnalogueMarketData {
    id: string;
    objectId?: string;
    sourceUrl?: string;
    offerDate: string;
    sourceLocalPath: string;
    offerPrice: number;
    contactPhone?: string;
    rightsOnAnalogue: string;
    restrictionsOnAnalogue: string;
  }

export type AnalogueObject = Omit<
  AppraisingObject,
  "id" | "rights" | "technicalDocuments" | "otherDocuments"
> & {
  technicalDocuments?: Document[];
  otherDocuments?: Document[];
} & AnalogueMarketData;