import { z } from "zod";
import {
  createAppraisingReportSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@appraisal/shared/src/schemas";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { AppraisingReportIndexData } from "@appraisal/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
}

export interface ListDirectoryResponse {
  entries: DirectoryEntry[];
}

export interface DrivesResponse {
  drives: string[];
}

const getAuthToken = () => useAuthStore.getState().token;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${res.status}`);
  }

  return res.json();
}

export type CreateReportInput = z.infer<typeof createAppraisingReportSchema>;

export const api = {
  auth: {
    login: (data: LoginInput) =>
      request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    register: (data: RegisterInput) =>
      request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    resetPassword: (data: ResetPasswordInput) =>
      request("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getProfile: () => request("/api/auth/me"),
    logout: () =>
      request("/api/auth/logout", {
        method: "POST",
      }),
  },
  reports: {
    create: (data: CreateReportInput) =>
      request<AppraisingReportIndexData>("/api/reports", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  filesystem: {
    list: async (path: string): Promise<ListDirectoryResponse> => {
      return request<ListDirectoryResponse>(
        `/api/filesystem/list?path=${encodeURIComponent(path)}`,
      );
    },

    getDrives: async (): Promise<DrivesResponse> => {
      return request<DrivesResponse>("/api/filesystem/drives");
    },

    check: async (path: string) => {
      return request("/api/filesystem/check", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
    },

    createMarker: async (path: string) => {
      return request("/api/filesystem/create-marker", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
    },

    makeDirectory: async (path: string) => {
      return request("/api/filesystem/make-directory", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
    },
/*
    removeDirectory: async (path: string) => {
      return request("/api/filesystem/remove-directory", {
        method: "DELETE",
        body: JSON.stringify({ path }),
      });
    },
    */
  },
};
