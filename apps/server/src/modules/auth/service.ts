import {
  Appraiser,
  AppraisingProviderCompany,
  AppraisingProviderPrivatePracticeInformation,
  QualificationCertificate,
} from "@appraisal/types";
import { getUsers, saveUsers } from "../../services/storage";
import { getBaseDir } from "../../config";

export async function registerAppraiser(
  appraiserData: Omit<Appraiser, "passwordHash" | "recoveryWordsHashes">,
  password: string,
  recoveryWords: string[],
) {
  const users = await getUsers(getBaseDir());

  if (users.some((u) => u.contacts.email === appraiserData.contacts.email)) {
    throw new Error("Пользователь с таким email уже существует");
  }

  const passwordHash = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  const normalizedWords = recoveryWords.map((w) => w.trim().toLowerCase());

  const recoveryWordsHashes = await Promise.all(
    normalizedWords.map((word) =>
      Bun.password.hash(word, {
        algorithm: "bcrypt",
        cost: 10,
      }),
    ),
  );

  const newAppraiser: Appraiser = {
    ...appraiserData,
    passwordHash,
    recoveryWordsHashes,
  };

  users.push(newAppraiser);

  await saveUsers(getBaseDir(), users);

  return newAppraiser;
}

export async function loginAppraiser(
  email: string,
  password: string,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const user = users.find((u) => u.contacts.email === email);

  if (!user) {
    return null;
  }

  const isValid = await Bun.password.verify(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

export async function resetPassword(
  email: string,
  recoveryWords: string[],
  newPassword: string,
): Promise<boolean> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) {
    return false;
  }

  const user = users[userIndex];
  const normalizedWords = recoveryWords.map((w) => w.trim().toLowerCase());

  const remainingHashes = [...user.recoveryWordsHashes];

  let matchCount = 0;

  for (const word of normalizedWords) {
    const verifyPromises = remainingHashes.map((hash, index) =>
      Bun.password.verify(word, hash).then((isValid) => ({ isValid, index })),
    );

    const results = await Promise.all(verifyPromises);

    const match = results.find((r) => r.isValid);
    if (match) {
      matchCount++;

      remainingHashes.splice(match.index, 1);
    }
  }

  if (matchCount < 6) {
    return false;
  }

  const newPasswordHash = await Bun.password.hash(newPassword, {
    algorithm: "bcrypt",
    cost: 10,
  });

  users[userIndex] = {
    ...user,
    passwordHash: newPasswordHash,
  };

  await saveUsers(getBaseDir(), users);
  return true;
}

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

  if (userIndex === -1) {
    return null;
  }

  users[userIndex] = {
    ...users[userIndex],
    ...profileData,
  };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}

export async function addWorkplace(
  email: string,
  workplace: AppraisingProviderCompany,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) {
    return null;
  }

  const user = users[userIndex];
  const workPlaceList = user.workPlaceList || [];

  if (workPlaceList.some((w) => w.id === workplace.id)) {
    throw new Error("Рабочее место с таким ID уже существует");
  }

  workPlaceList.push(workplace);

  users[userIndex] = {
    ...user,
    workPlaceList,
  };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}

export async function removeWorkplace(
  email: string,
  workplaceId: string,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) {
    return null;
  }

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

export async function addCertificate(
  email: string,
  certificate: QualificationCertificate,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) {
    return null;
  }

  const user = users[userIndex];
  const qualificationCertificate = user.qualificationCertificate || [];

  if (
    qualificationCertificate.some(
      (c) =>
        c.issuedBy === certificate.issuedBy &&
        c.numberQualificationCertificate ===
          certificate.numberQualificationCertificate,
    )
  ) {
    throw new Error("Аттестат с таким номером уже существует");
  }

  qualificationCertificate.push(certificate);

  users[userIndex] = {
    ...user,
    qualificationCertificate,
  };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}

export async function removeCertificate(
  email: string,
  certificateId: string,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) {
    return null;
  }

  const user = users[userIndex];
  const qualificationCertificate = (user.qualificationCertificate || []).filter(
    (c) => c.issuedBy !== certificateId,
  );

  users[userIndex] = {
    ...user,
    qualificationCertificate,
  };

  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}

export async function togglePrivatePractice(
  email: string,
  hasPrivatePractice: boolean,
  privatePracticeInformation?: AppraisingProviderPrivatePracticeInformation,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) {
    return null;
  }

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
