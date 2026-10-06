import { Appraiser, QualificationCertificate } from "@appraisal/types";
import { getUsers, saveUsers } from "../../../services/storage";
import { getBaseDir } from "../../../config";

export async function addCertificate(
  email: string,
  certificate: QualificationCertificate,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) return null;

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

  users[userIndex] = { ...user, qualificationCertificate };
  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}

export async function removeCertificate(
  email: string,
  certificateId: string,
): Promise<Appraiser | null> {
  const users = await getUsers(getBaseDir());
  const userIndex = users.findIndex((u) => u.contacts.email === email);

  if (userIndex === -1) return null;

  const user = users[userIndex];
  const qualificationCertificate = (user.qualificationCertificate || []).filter(
    (c) => c.id !== certificateId,
  );

  users[userIndex] = { ...user, qualificationCertificate };
  await saveUsers(getBaseDir(), users);
  return users[userIndex];
}
