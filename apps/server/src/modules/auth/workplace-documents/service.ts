import path from "path";
import { getUsers, saveUsers } from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { Appraiser, Document } from "@appraisal/types";
import { saveDocument } from "../../../services/documentStorage";
import { AllowedMimeType } from "@appraisal/types";

const WORKPLACE_DOCUMENT_MIME_TYPES = [
  AllowedMimeType.PDF,
  AllowedMimeType.DOC,
  AllowedMimeType.DOCX,
  AllowedMimeType.JPEG,
  AllowedMimeType.PNG,
  AllowedMimeType.WEBP,
  AllowedMimeType.HEIC,
];

export async function getWorkplaceDocuments(
  email: string,
  workplaceId: string,
): Promise<Document[] | null> {
  const users = await getUsers(getBaseDir());
  const user = users.find((u) => u.contacts.email === email);
  if (!user) return null;

  const workplace = (user.workPlaceList || []).find(
    (w) => w.id === workplaceId,
  );
  if (!workplace) return null;

  return workplace.providerDocumentList || [];
}

export async function addWorkplaceDocument(
  email: string,
  workplaceId: string,
  file: File,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);
  if (userIndex === -1) return null;

  const user = users[userIndex];
  const workPlaceList = user.workPlaceList || [];
  const workplaceIndex = workPlaceList.findIndex((w) => w.id === workplaceId);

  if (workplaceIndex === -1) {
    throw new Error("Рабочее место не найдено");
  }

  const workplace = workPlaceList[workplaceIndex];

  const targetDir = path.join(
    getBaseDir(),
    "profiles",
    user.id,
    "workplaces",
    workplaceId,
    "documents",
  );

  const newDoc = await saveDocument(targetDir, file, {
    allowedMimeTypes: WORKPLACE_DOCUMENT_MIME_TYPES,
  });

  const providerDocumentList = workplace.providerDocumentList || [];
  providerDocumentList.push(newDoc);

  workPlaceList[workplaceIndex] = { ...workplace, providerDocumentList };
  users[userIndex] = { ...user, workPlaceList };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}

export async function removeWorkplaceDocument(
  email: string,
  workplaceId: string,
  documentId: string,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);
  if (userIndex === -1) return null;

  const user = users[userIndex];
  const workPlaceList = user.workPlaceList || [];
  const workplaceIndex = workPlaceList.findIndex((w) => w.id === workplaceId);

  if (workplaceIndex === -1) {
    throw new Error("Рабочее место не найдено");
  }

  const workplace = workPlaceList[workplaceIndex];
  const providerDocumentList = workplace.providerDocumentList || [];

  const initialLength = providerDocumentList.length;
  const updatedList = providerDocumentList.filter((d) => d.id !== documentId);

  if (updatedList.length === initialLength) {
    return null;
  }

  workPlaceList[workplaceIndex] = {
    ...workplace,
    providerDocumentList: updatedList,
  };
  users[userIndex] = { ...user, workPlaceList };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}
