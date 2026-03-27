"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user, session, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"users" | "adapters" | "org">("users");
  const [users, setUsers] = useState<any[]>([]);
  const [adapters, setAdapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (authLoading || !session) return;
    Promise.all([
      api.getUsers().catch(() => []),
      api.getAdapters().catch(() => []),
    ]).then(([u, a]) => {
      setUsers(u);
      setAdapters(a);
      setLoading(false);
    });
  }, [authLoading, session]);

  return (
    <AppShell>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your organization, users, and integrations</p>
        </div>

        <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
          {(["users", "adapters", "org"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm capitalize transition-colors ${
                tab === t ? "text-brand-700 border-b-2 border-brand-500 font-medium" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "org" ? "Organization" : t}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-700">Team members</h2>
              <button onClick={() => setShowInvite(true)} className="px-3 py-1.5 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-600">
                Invite user
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          u.role === "admin" ? "bg-red-50 text-red-700" :
                          u.role === "editor" ? "bg-blue-50 text-blue-700" :
                          u.role === "user" ? "bg-green-50 text-green-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{u.isActive ? "Active" : "Deactivated"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={async () => {
              setShowInvite(false);
              const u = await api.getUsers().catch(() => []);
              setUsers(u);
            }} />}
          </div>
        )}

        {tab === "adapters" && (
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-4">Storage adapters</h2>
            {adapters.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No storage adapters configured</p>
                <p className="text-xs text-gray-400 mt-1">Documents are stored locally in Supabase Storage by default</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adapters.map((a) => (
                  <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.adapterType} {a.isDefault && "• Default"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.healthStatus === "healthy" ? "bg-green-50 text-green-700" :
                      a.healthStatus === "degraded" ? "bg-yellow-50 text-yellow-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{a.healthStatus || "Unknown"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "org" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Organization details</h2>
            <p className="text-sm text-gray-400">Organization settings will be configurable here — branding, default document mode, notification preferences.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async () => {
    if (!email || !name) return;
    setSubmitting(true);
    setError("");
    try {
      await api.inviteUser({ email, name, role });
      onInvited();
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Invite user</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={handleInvite} disabled={submitting || !email || !name} className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
            {submitting ? "Inviting..." : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
