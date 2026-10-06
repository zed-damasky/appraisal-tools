import type { InsuranceInformation } from "@appraisal/types";

/**
 * Находит полис страхования, действовавший на указанную дату
 * @param insurances - Массив полисов
 * @param targetDate - Целевая дата (ISO string, например "2024-05-20")
 * @returns Актуальный полис или undefined, если ни один не подходит
 */

export function findActiveInsurance(
  insurances: InsuranceInformation[],
  targetDate: string,
): InsuranceInformation | undefined {
  if (!insurances || insurances.length === 0) {
    return undefined;
  }

  const target = new Date(targetDate);

  return insurances.find((ins) => {
    const from = new Date(ins.validDateFrom);
    const to = new Date(ins.validDateTo);
    return target >= from && target <= to;
  });
}