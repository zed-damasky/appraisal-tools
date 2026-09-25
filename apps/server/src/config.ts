import path from "path";
import os from "os";

export const getBaseDir = (): string => {
  return process.env.BASE_DIR || path.join(os.homedir(), "AppData", "Roaming", "AppraisalApp");
};