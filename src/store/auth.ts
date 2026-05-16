import { create } from "zustand";

type Role = "ADMIN" | "TEACHER" | "PARENT";

type AuthState = {
  token: string | null;
  role: Role | null;
  email: string | null;
  setAuth: (token: string, role: Role, email: string) => void;
  logout: () => void;
};

const KEY = "institute_admin_auth_v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { token: null, role: null, email: null };
    const parsed = JSON.parse(raw);
    return { token: parsed.token ?? null, role: parsed.role ?? null, email: parsed.email ?? null };
  } catch {
    return { token: null, role: null, email: null };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...load(),
  setAuth: (token, role, email) => {
    localStorage.setItem(KEY, JSON.stringify({ token, role, email }));
    set({ token, role, email });
  },
  logout: () => {
    localStorage.removeItem(KEY);
    set({ token: null, role: null, email: null });
  }
}));

