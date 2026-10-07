import path from "path";
import { getUsers, saveUsers } from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { Appraiser, Document } from "@appraisal/types";
import { saveDocument } from "../../../services/documentStorage";
import { AllowedMimeType } from "@appraisal/types";

const PERSONAL_DOCUMENT_MIME_TYPES = [
  AllowedMimeType.PDF,
  AllowedMimeType.DOC,
  AllowedMimeType.DOCX,
  AllowedMimeType.JPEG,
  AllowedMimeType.PNG,
  AllowedMimeType.WEBP,
  AllowedMimeType.HEIC,
];

export async function getPersonalDocuments(
  email: string,
): Promise<Document[] | null> {
  const users = await getUsers(getBaseDir());
  const user = users.find((u) => u.contacts.email === email);
  if (!user) return null;
  return user.personalDocumentList || [];
}

export async function addPersonalDocument(
  email: string,
  file: File,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);
  if (userIndex === -1) return null;

  const user = users[userIndex];

  const targetDir = path.join(getBaseDir(), "profiles", user.id, "documents");

  const newDoc = await saveDocument(targetDir, file, {
    allowedMimeTypes: PERSONAL_DOCUMENT_MIME_TYPES,
  });

  const personalDocumentList = user.personalDocumentList || [];
  personalDocumentList.push(newDoc);

  users[userIndex] = { ...user, personalDocumentList };
  await saveUsers(getBaseDir(), users);

  return users[userIndex];
}

export async function removePersonalDocument(
  email: string,
  documentId: string,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);
  if (userIndex === -1) return null;

  const user = users[userIndex];
  const personalDocumentList = user.personalDocumentList || [];

  const initialLength = personalDocumentList.length;
  const updatedList = personalDocumentList.filter((d) => d.id !== documentId);

  if (updatedList.length === initialLength) {
    return null;
  }

  users[userIndex] = { ...user, personalDocumentList: updatedList };
  await saveUsers(getBaseDir(), users);

  return users[userIndex];
}
