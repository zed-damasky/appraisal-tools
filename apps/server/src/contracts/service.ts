import { getContracts, saveContracts, getReportsIndex } from "../services/storage";
import { getBaseDir } from "../config";
import type { AppraisingContract } from "@appraisal/types";

export async function getContractsList(): Promise<AppraisingContract[]> {
  const baseDir = getBaseDir();
  return await getContracts(baseDir);
}

export async function getContractById(contractId: string): Promise<AppraisingContract | null> {
  const baseDir = getBaseDir();
  const contracts = await getContracts(baseDir);
  return contracts.find((c) => c.id === contractId) || null;
}

export async function createContract(data: {
  contractNumber: string;
  contractDate: string;
}): Promise<AppraisingContract> {
  const baseDir = getBaseDir();
  const contracts = await getContracts(baseDir);

  const newContract: AppraisingContract = {
    id: crypto.randomUUID(),
    contractNumber: data.contractNumber,
    contractDate: data.contractDate,
  };

  contracts.push(newContract);
  await saveContracts(baseDir, contracts);

  return newContract;
}

export async function updateContract(
  contractId: string,
  updates: Partial<AppraisingContract>,
): Promise<AppraisingContract | null> {
  const baseDir = getBaseDir();
  const contracts = await getContracts(baseDir);
  const index = contracts.findIndex((c) => c.id === contractId);

  if (index === -1) return null;

  contracts[index] = {
    ...contracts[index],
    ...updates,
    id: contracts[index].id, 
  };

  await saveContracts(baseDir, contracts);
  return contracts[index];
}

export async function deleteContract(contractId: string): Promise<{ success: boolean; error?: string }> {
  const baseDir = getBaseDir();
  const contracts = await getContracts(baseDir);
  const contractIndex = contracts.findIndex((c) => c.id === contractId);

  if (contractIndex === -1) {
    return { success: false, error: "Договор не найден" };
  }

  const reportsIndex = await getReportsIndex(baseDir);
  const linkedReportsCount = reportsIndex.filter((r) => {
    return false;
  }).length;

  if (linkedReportsCount > 0) {
    return {
      success: false,
      error: `Невозможно удалить договор: на него ссылаются ${linkedReportsCount} отчёт(ов)`,
    };
  }

  contracts.splice(contractIndex, 1);
  await saveContracts(baseDir, contracts);

  return { success: true };
}