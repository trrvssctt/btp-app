import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, tokenStore, AuthUser, apiError } from "@/lib/api";

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (...perms: string[]) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { user: u, token } = await authApi.login(email, password);
      tokenStore.set(token);
      setUser(u);
    } catch (e) {
      throw new Error(apiError(e));
    }
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    window.location.href = "/login";
  };

  const hasRole = (...roles: string[]) =>
    !!user && (user.roles.includes("ADMIN") || roles.some((r) => user.roles.includes(r)));
  const hasPermission = (...perms: string[]) =>
    !!user && (user.roles.includes("ADMIN") || perms.every((p) => user.permissions.includes(p)));

  return (
    <Ctx.Provider value={{ user, loading, login, logout, hasRole, hasPermission }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
