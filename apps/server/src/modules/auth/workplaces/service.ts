import { Appraiser, AppraisingProviderCompany } from "@appraisal/types";
import { getUsers, saveUsers } from "../../../services/storage";
import { getBaseDir } from "../../../config";

export async function addWorkplace(
  email: string,
  workplace: AppraisingProviderCompany,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) return null;

  const user = users[userIndex];
  const workPlaceList = user.workPlaceList || [];

  if (workPlaceList.some((w) => w.id === workplace.id)) {
    throw new Error("Рабочее место с таким ID уже существует");
  }

  workPlaceList.push(workplace);

  users[userIndex] = { ...user, workPlaceList };
  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}

export async function removeWorkplace(
  email: string,
  workplaceId: string,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) return null;

  const user = users[userIndex];
  const workPlaceList = (user.workPlaceList || []).filter(
    (w) => w.id !== workplaceId,
  );

  users[userIndex] = {
    ...user,
    workPlaceList,
    defaultWorkplaceId:
      user.defaultWorkplaceId === workplaceId
        ? undefined
        : user.defaultWorkplaceId,
  };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}
