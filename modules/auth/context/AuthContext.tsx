"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SignInDto, SignUpDto } from "../models/auth";
import type { SystemUser, SystemUserInput } from "@/modules/crm/users/models/User";
import { updateOwnProfile } from "@/modules/crm/users/services/usersService";

type BrowserSession = {
  userId: string;
  expiresAt: string;
  idleExpiresAt: string;
};

type SessionPayload = {
  session: BrowserSession;
  user: SystemUser;
};

type AuthContextValue = {
  session: BrowserSession | null;
  user: SystemUser | null;
  loading: boolean;
  error: string | null;
  signIn: (input: SignInDto) => Promise<void>;
  signUp: (input: SignUpDto) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (input: Pick<SystemUserInput, "name" | "phone" | "businessName">) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function clearLegacySupabaseStorage() {
  try {
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!projectUrl) return;
    const projectRef = new URL(projectUrl).hostname.split(".")[0];
    if (!projectRef) return;
    localStorage.removeItem(`sb-${projectRef}-auth-token`);
    localStorage.removeItem(`sb-${projectRef}-auth-token-code-verifier`);
  } catch {
    // El almacenamiento puede estar bloqueado por la configuración del navegador.
  }
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(typeof init.body === "string" ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json() as { data?: T; error?: string };
  if (!response.ok) throw new HttpError(payload.error ?? "No se pudo completar la solicitud.", response.status);
  return payload.data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [user, setUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback((payload: SessionPayload | null) => {
    setSession(payload?.session ?? null);
    setUser(payload?.user ?? null);
    setError(null);
    setLoading(false);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      applySession(await apiRequest<SessionPayload>("/api/auth/session"));
    } catch (nextError) {
      if (nextError instanceof HttpError && [401, 403].includes(nextError.status)) {
        applySession(null);
        return;
      }
      setError(nextError instanceof Error ? nextError.message : "No se pudo validar la sesión.");
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    clearLegacySupabaseStorage();
    queueMicrotask(() => { void loadSession(); });
    const channel = typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel("larutica-auth");
    channel?.addEventListener("message", loadSession);
    const expired = () => { void loadSession(); };
    window.addEventListener("larutica-auth-expired", expired);
    return () => {
      channel?.removeEventListener("message", loadSession);
      channel?.close();
      window.removeEventListener("larutica-auth-expired", expired);
    };
  }, [loadSession]);

  const broadcast = useCallback(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("larutica-auth");
    channel.postMessage("changed");
    channel.close();
  }, []);

  const signIn = useCallback(async (input: SignInDto) => {
    setError(null);
    const payload = await apiRequest<SessionPayload>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    applySession(payload);
    broadcast();
  }, [applySession, broadcast]);

  const signUp = useCallback(async (input: SignUpDto) => {
    setError(null);
    const payload = await apiRequest<SessionPayload & { requiresEmailConfirmation: boolean }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify(input) },
    );
    if (payload.session) {
      applySession(payload);
      broadcast();
    }
    return { requiresEmailConfirmation: payload.requiresEmailConfirmation };
  }, [applySession, broadcast]);

  const signOut = useCallback(async () => {
    try {
      await apiRequest<null>("/api/auth/logout", { method: "POST" });
    } finally {
      applySession(null);
      broadcast();
    }
  }, [applySession, broadcast]);

  const refreshSession = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const refreshProfile = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const saveProfile = useCallback(async (
    input: Pick<SystemUserInput, "name" | "phone" | "businessName">,
  ) => {
    if (!session) throw new Error("No hay una sesión activa.");
    setUser(await updateOwnProfile(input));
  }, [session]);

  const uploadAvatar = useCallback(async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    setUser(await apiRequest<SystemUser>("/api/profile/avatar", { method: "POST", body }));
    broadcast();
  }, [broadcast]);

  const completeOnboarding = useCallback(async () => {
    setUser(await apiRequest<SystemUser>("/api/profile/onboarding", { method: "POST" }));
    broadcast();
  }, [broadcast]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshSession,
    refreshProfile,
    saveProfile,
    uploadAvatar,
    completeOnboarding,
  }), [
    session,
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshSession,
    refreshProfile,
    saveProfile,
    uploadAvatar,
    completeOnboarding,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}
