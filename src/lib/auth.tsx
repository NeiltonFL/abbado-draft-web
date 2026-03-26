"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";
import { api } from "./api";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name: string, orgName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true,
  signIn: async () => ({}), signUp: async () => ({}), register: async () => ({}), signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token) api.setToken(session.access_token);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      api.setToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Sync user record with API
    try { await api.syncUser(); } catch {}
    return {};
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    return error ? { error: error.message } : {};
  };

  const register = async (email: string, password: string, name: string, orgName: string) => {
    try {
      // Call our API to create org + user + Supabase Auth account
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://abbado-draft-production.up.railway.app"}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, orgName }),
        }
      );
      const data = await res.json();
      if (!res.ok) return { error: data.error };

      // Now sign in
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) return { error: signInErr.message };

      return {};
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    api.setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
