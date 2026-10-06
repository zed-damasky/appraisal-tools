import type { QualificationCertificate } from "@appraisal/types";

/**
 * Находит квалификационный аттестат, действовавший на указанную дату
 * @param certificates - Массив аттестатов
 * @param targetDate - Целевая дата (ISO string, например "2024-05-20")
 * @returns Актуальный аттестат или undefined, если ни один не подходит
 */
export function findActiveCertificate(
  certificates: QualificationCertificate[],
  targetDate: string,
): QualificationCertificate | undefined {
  if (!certificates || certificates.length === 0) {
    return undefined;
  }

  const target = new Date(targetDate);

  return certificates.find((cert) => {
    const from = new Date(cert.validDateFrom);
    const to = new Date(cert.validDateTo);
    return target >= from && target <= to;
  });
}
