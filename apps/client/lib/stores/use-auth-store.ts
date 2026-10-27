import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
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
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        Cookies.set("auth_token", token, { expires: 7, path: "/" });
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        Cookies.remove("auth_token");
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },
    }),
    {
      name: "appraisal-auth-storage",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
