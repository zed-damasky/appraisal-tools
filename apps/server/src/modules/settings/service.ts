import { getSettings, saveSettings } from "../../services/storage";
import { getBaseDir } from "../../config";
import type { Settings } from "@appraisal/types";

export async function getAppSettings(): Promise<Settings> {
  return await getSettings(getBaseDir());
}

export async function updateAppSettings(settings: Settings): Promise<Settings> {
  await saveSettings(getBaseDir(), settings);
  return settings;
}