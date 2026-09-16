"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  devLogin: (email?: string, name?: string) => void;
  isAllowedEmail: (email: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      const savedDevUser = sessionStorage.getItem("agendador_dev_user");
      if (savedDevUser) {
        try {
          return JSON.parse(savedDevUser);
        } catch {
          sessionStorage.removeItem("agendador_dev_user");
        }
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured());

  const isConfigured = useMemo(() => isSupabaseConfigured(), []);

  // Lista de e-mails permitidos definida via variável de ambiente pública
  const allowedEmailsList = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "";
    return raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }, []);

  const isAllowedEmail = useCallback(
    (email: string): boolean => {
      if (allowedEmailsList.length === 0) return true; // Se vazia, permite todos
      return allowedEmailsList.includes(email.trim().toLowerCase());
    },
    [allowedEmailsList]
  );

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    const supabase = createClient();

    // Busca sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setSupabaseUser(session.user);
        const email = session.user.email || "";

        if (!isAllowedEmail(email)) {
          supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setSupabaseUser(null);
          router.push("/login?error=unauthorized");
          setIsLoading(false);
          return;
        }

        const metadata = session.user.user_metadata || {};
        setUser({
          id: session.user.id,
          email,
          name: metadata.full_name || metadata.name || email.split("@")[0],
          avatarUrl: metadata.avatar_url || metadata.picture,
          createdAt: session.user.created_at,
        });
      }
      setIsLoading(false);
    });

    // Escuta mudanças no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setSupabaseUser(session.user);
        const email = session.user.email || "";

        if (!isAllowedEmail(email)) {
          supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setSupabaseUser(null);
          router.push("/login?error=unauthorized");
          return;
        }

        const metadata = session.user.user_metadata || {};
        setUser({
          id: session.user.id,
          email,
          name: metadata.full_name || metadata.name || email.split("@")[0],
          avatarUrl: metadata.avatar_url || metadata.picture,
          createdAt: session.user.created_at,
        });
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured, isAllowedEmail, router]);

  // Login com Google OAuth
  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    if (!isConfigured) {
      // Fallback dev caso Supabase ainda não tenha credenciais inseridas
      devLogin("admin@agendador.com", "Administrador Agendador");
      return { error: null };
    }

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error).message || "Falha ao conectar com o Google." };
    }
  };

  // Login com E-mail e Senha
  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    if (!isAllowedEmail(email)) {
      return {
        error: "Acesso não autorizado. Este e-mail não possui permissão de acesso no momento.",
      };
    }

    if (!isConfigured) {
      devLogin(email, email.split("@")[0]);
      return { error: null };
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user && !isAllowedEmail(data.user.email || "")) {
        await supabase.auth.signOut();
        return {
          error: "Acesso não autorizado. Este e-mail não possui permissão de acesso.",
        };
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error).message || "Falha ao autenticar com e-mail e senha." };
    }
  };

  // Cadastro com E-mail e Senha
  const signUpWithEmail = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ error: string | null }> => {
    if (!isAllowedEmail(email)) {
      return {
        error: "Acesso não autorizado. Este e-mail não está na lista de permissões para cadastro.",
      };
    }

    if (!isConfigured) {
      devLogin(email, name || email.split("@")[0]);
      return { error: null };
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user && !isAllowedEmail(data.user.email || "")) {
        await supabase.auth.signOut();
        return {
          error: "Acesso não autorizado. Este e-mail não está permitido.",
        };
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: (err as Error).message || "Falha ao criar conta." };
    }
  };

  // Logout
  const signOut = async (): Promise<void> => {
    if (isConfigured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("agendador_dev_user");
    }
    setUser(null);
    setSession(null);
    setSupabaseUser(null);
    router.push("/");
  };

  // Login de desenvolvimento simulado (para testes locais sem credenciais reais)
  const devLogin = (
    email: string = "usuario@agendador.com",
    name: string = "Usuário Agendador"
  ) => {
    const devUser: UserProfile = {
      id: "usr_dev_" + Math.random().toString(36).substring(2, 9),
      email,
      name,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      createdAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem("agendador_dev_user", JSON.stringify(devUser));
    }
    setUser(devUser);
    router.push("/dashboard");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isLoading,
        isConfigured,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        devLogin,
        isAllowedEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
