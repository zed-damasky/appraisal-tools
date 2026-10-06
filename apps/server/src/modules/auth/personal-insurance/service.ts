import { Appraiser, InsuranceInformation } from "@appraisal/types";
import { getUsers, saveUsers } from "../../../services/storage";
import { getBaseDir } from "../../../config";

export async function addPersonalInsurance(
  email: string,
  insurance: InsuranceInformation,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) return null;

  const user = users[userIndex];
  const insuranceList = user.insurance || [];

  if (insuranceList.some((i) => i.id === insurance.id)) {
    throw new Error("Полис с таким ID уже существует");
  }

  insuranceList.push(insurance);

  users[userIndex] = { ...user, insurance: insuranceList };
  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}

export async function removePersonalInsurance(
  email: string,
  insuranceId: string,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) return null;

  const user = users[userIndex];
  const insuranceList = (user.insurance || []).filter(
    (i) => i.id !== insuranceId,
  );

  users[userIndex] = { ...user, insurance: insuranceList };
  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}

export async function getPersonalInsurance(
  email: string,
): Promise<InsuranceInformation[] | null> {
  const users = await getUsers(getBaseDir());
  const user = users.find((u) => u.contacts.email === email);
  if (!user) return null;
  return user.insurance || [];
}
