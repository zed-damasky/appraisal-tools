import {
  Appraiser,
  AppraisingProviderPrivatePracticeInformation,
} from "@appraisal/types";
import { getUsers, saveUsers } from "../../../services/storage";
import { getBaseDir } from "../../../config";

export async function togglePrivatePractice(
  email: string,
  hasPrivatePractice: boolean,
  privatePracticeInformation?: AppraisingProviderPrivatePracticeInformation,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) return null;

  users[userIndex] = {
    ...users[userIndex],
    hasPrivatePractice,
    privatePracticeInformation: hasPrivatePractice
      ? privatePracticeInformation
      : undefined,
  };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}
