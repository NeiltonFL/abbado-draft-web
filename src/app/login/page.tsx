"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { signIn, register, user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.push("/");
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    let result;
    if (mode === "login") {
      result = await signIn(email, password);
    } else {
      if (!name || !orgName) {
        setError("All fields are required");
        setSubmitting(false);
        return;
      }
      result = await register(email, password, name, orgName);
    }

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.push("/");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-brand-700">Abbado Draft</h1>
          <p className="text-sm text-gray-500 mt-1">Document Automation Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900 text-center">
            {mode === "login" ? "Sign in" : "Create account"}
          </h2>

          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="Jane Smith" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization name</label>
                <input
                  type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  placeholder="Acme Law Firm" required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="you@company.com" required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="••••••••" required minLength={8}
            />
            {mode === "register" && <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit" disabled={submitting}
            className="w-full py-2.5 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {submitting
              ? (mode === "login" ? "Signing in..." : "Creating account...")
              : (mode === "login" ? "Sign in" : "Create account")}
          </button>

          <div className="text-center pt-2">
            {mode === "login" ? (
              <p className="text-sm text-gray-500">
                New to Abbado Draft?{" "}
                <button type="button" onClick={() => { setMode("register"); setError(""); }} className="text-brand-600 hover:text-brand-700 font-medium">
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(""); }} className="text-brand-600 hover:text-brand-700 font-medium">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
