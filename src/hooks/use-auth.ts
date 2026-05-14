"use client";

import { useEffect, useState, useCallback } from "react";
import { getStoredUser, clearToken, setStoredUser, type AuthUser } from "@/lib/api-client";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState & { logout: () => void } {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    // Clear httpOnly cookie server-side, then wipe localStorage
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      clearToken();
      setUser(null);
      window.location.href = "/sign-in";
    });
  }, []);

  return { user, isLoading, isAuthenticated: !!user, logout };
}

export function saveAuthResult(_token: string, user: AuthUser): void {
  // Token is kept only in the httpOnly cookie set by the backend.
  // We only persist the non-sensitive user profile for UI rendering.
  setStoredUser(user);
}
