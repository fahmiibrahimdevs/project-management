import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole, LoginResponse } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickLogin: (user: User) => Promise<void>;
  updateCurrentUser: (updatedUser: Partial<User>) => void;
  logout: () => void;
  canManageUsers: boolean;
  canCreateProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canCreateTask: boolean;
  canDeleteTask: boolean;
  canCrudTask: boolean;
  canEditContent: boolean;
  isSuperUser: boolean;
  isMagang: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("protrack_auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LoginResponse;
        // Normalize role if stored with legacy name
        let normalizedRole = parsed.user.role as any;
        if (normalizedRole === "project_manager") normalizedRole = "pm";
        if (normalizedRole === "engineer") normalizedRole = "karyawan";
        if (normalizedRole === "viewer") normalizedRole = "magang";

        parsed.user.role = normalizedRole;
        setUser(parsed.user);
        setToken(parsed.token);
      } catch {
        localStorage.removeItem("protrack_auth");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let errorMsg = "Login gagal";
      try {
        const err = await res.json();
        errorMsg = err.error || err.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const data: LoginResponse = await res.json();
    let normalizedRole = data.user.role as any;
    if (normalizedRole === "project_manager") normalizedRole = "pm";
    if (normalizedRole === "engineer") normalizedRole = "karyawan";
    if (normalizedRole === "viewer") normalizedRole = "magang";
    data.user.role = normalizedRole;

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("protrack_auth", JSON.stringify(data));
  };

  const quickLogin = async (targetUser: User) => {
    await login(targetUser.email, "password123");
  };

  const updateCurrentUser = (updatedUser: Partial<User>) => {
    if (!user) return;
    const mergedUser = { ...user, ...updatedUser };
    setUser(mergedUser);
    if (token) {
      localStorage.setItem("protrack_auth", JSON.stringify({ token, user: mergedUser }));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("protrack_auth");
  };

  // RBAC Permission checks for 4 roles: owner, pm, karyawan, magang
  const role = user?.role;
  const canManageUsers = role === "owner";
  const canCreateProject = role === "owner" || role === "pm";
  const canEditProject = role === "owner" || role === "pm";
  const canDeleteProject = role === "owner";
  
  // All authenticated members (Owner, PM, Karyawan, Magang) can create tasks, comment, and upload!
  const canCreateTask = !!user;
  const canDeleteTask = role === "owner" || role === "pm";
  const canCrudTask = !!user;
  const isSuperUser = role === "owner" || role === "pm";
  const canEditContent = !!user;
  const isMagang = role === "magang";
  const isViewer = false;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        quickLogin,
        updateCurrentUser,
        logout,
        canManageUsers,
        canCreateProject,
        canEditProject,
        canDeleteProject,
        canCreateTask,
        canDeleteTask,
        canCrudTask,
        canEditContent,
        isSuperUser,
        isMagang,
        isViewer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
