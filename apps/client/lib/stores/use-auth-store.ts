import { create } from "zustand";
import { persist } from "zustand/middleware";
import { appraiserRegistrationSchema } from "@appraisal/shared/src/schemas";
import { z } from "zod";

export type AppraiserProfile = z.infer<typeof appraiserRegistrationSchema>;

interface AuthState {
  user: AppraiserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: AppraiserProfile, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<AppraiserProfile>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: "appraisal-auth-storage",
    },
  ),
);
