import path from "path";
import { getUsers, saveUsers } from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { Appraiser, Document } from "@appraisal/types";
import { saveDocument } from "../../../services/documentStorage";
import { AllowedMimeType } from "@appraisal/types";

const PRIVATE_PRACTICE_DOCUMENT_MIME_TYPES = [
  AllowedMimeType.PDF,
  AllowedMimeType.DOC,
  AllowedMimeType.DOCX,
  AllowedMimeType.JPEG,
  AllowedMimeType.PNG,
  AllowedMimeType.WEBP,
  AllowedMimeType.HEIC,
];

export async function getPrivatePracticeDocuments(
  email: string,
): Promise<Document[] | null> {
  const users = await getUsers(getBaseDir());
  const user = users.find((u) => u.contacts.email === email);
  if (!user) return null;

  if (!user.hasPrivatePractice || !user.privatePracticeInformation) {
    throw new Error("Частная практика не активирована");
  }

  return user.privatePracticeInformation.privatePracticeDocumentList || [];
}

export async function addPrivatePracticeDocument(
  email: string,
  file: File,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);
  if (userIndex === -1) return null;

  const user = users[userIndex];

  if (!user.hasPrivatePractice || !user.privatePracticeInformation) {
    throw new Error("Частная практика не активирована");
  }

  const privatePracticeInfo = user.privatePracticeInformation;

  const targetDir = path.join(
    getBaseDir(),
    "profiles",
    user.id,
    "private-practice",
    "documents",
  );

  const newDoc = await saveDocument(targetDir, file, {
    allowedMimeTypes: PRIVATE_PRACTICE_DOCUMENT_MIME_TYPES,
  });

  const privatePracticeDocumentList =
    privatePracticeInfo.privatePracticeDocumentList || [];
  privatePracticeDocumentList.push(newDoc);

  const updatedPrivatePracticeInfo = {
    ...privatePracticeInfo,
    privatePracticeDocumentList,
  };

  users[userIndex] = {
    ...user,
    privatePracticeInformation: updatedPrivatePracticeInfo,
  };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}

export async function removePrivatePracticeDocument(
  email: string,
  documentId: string,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);
  if (userIndex === -1) return null;

  const user = users[userIndex];

  if (!user.hasPrivatePractice || !user.privatePracticeInformation) {
    throw new Error("Частная практика не активирована");
  }

  const privatePracticeInfo = user.privatePracticeInformation;
  const privatePracticeDocumentList =
    privatePracticeInfo.privatePracticeDocumentList || [];

  const initialLength = privatePracticeDocumentList.length;
  const updatedList = privatePracticeDocumentList.filter(
    (d) => d.id !== documentId,
  );

  if (updatedList.length === initialLength) {
    return null;
  }

  const updatedPrivatePracticeInfo = {
    ...privatePracticeInfo,
    privatePracticeDocumentList: updatedList,
  };

  users[userIndex] = {
    ...user,
    privatePracticeInformation: updatedPrivatePracticeInfo,
  };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}
