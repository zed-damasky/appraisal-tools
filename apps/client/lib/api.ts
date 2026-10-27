import { z } from "zod";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@appraisal/shared/src/schemas";
import { useAuthStore } from "@/lib/stores/use-auth-store";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;

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
};
