import { Appraiser } from "@appraisal/types";
import { getUsers, saveUsers } from "../../../services/storage";
import { getBaseDir } from "../../../config";

export async function getAppraiserByEmail(
  email: string,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  return users.find((u) => u.contacts.email === email) || null;
}

export async function updateProfile(
  email: string,
  profileData: Partial<Omit<Appraiser, "passwordHash" | "recoveryWordsHashes">>,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) return null;

  users[userIndex] = {
    ...users[userIndex],
    ...profileData,
  };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}
