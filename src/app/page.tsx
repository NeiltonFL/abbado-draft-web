"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

export default function DashboardPage() {
  const { session, loading: authLoading } = useAuth();
  const [matters, setMatters] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !session) return;
    Promise.all([
      api.getMatters({ }).catch(() => ({ data: [], total: 0 })),
      api.getWorkflows().catch(() => []),
      api.getActivity({ limit: 10 }).catch(() => []),
    ]).then(([m, w, a]) => {
      setMatters(m);
      setWorkflows(w);
      setActivity(a);
      setLoading(false);
    });
  }, [authLoading, session]);

  return (
    <AppShell>
      <div className="max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your document automation</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Active matters" value={loading ? "—" : String(matters?.total || 0)} />
          <StatCard label="Workflows" value={loading ? "—" : String(workflows.length)} />
          <StatCard label="Documents generated" value={loading ? "—" : String(matters?.data?.reduce((s: number, m: any) => s + (m._count?.generatedDocs || 0), 0) || 0)} />
          <StatCard label="Templates" value="—" />
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Recent Matters */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-700">Recent matters</h2>
              <Link href="/matters" className="text-xs text-brand-500 hover:text-brand-600">View all</Link>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : (matters?.data || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No matters yet</p>
                <Link href="/matters/new" className="text-sm text-brand-500 hover:text-brand-600 mt-2 inline-block">
                  Create your first matter
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {(matters?.data || []).slice(0, 5).map((m: any) => (
                  <Link
                    key={m.id}
                    href={`/matters/${m.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.workflow?.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      m.status === "complete" ? "bg-green-50 text-green-700" :
                      m.status === "in_progress" ? "bg-blue-50 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {m.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions + Activity */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Quick actions</h2>
              <div className="space-y-2">
                <Link href="/matters/new" className="block w-full text-left px-3 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm hover:bg-brand-100 transition-colors">
                  New matter
                </Link>
                <Link href="/workflows/new" className="block w-full text-left px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                  New workflow
                </Link>
                <Link href="/templates" className="block w-full text-left px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                  Upload template
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Recent activity</h2>
              {activity.length === 0 ? (
                <p className="text-xs text-gray-400">No activity yet</p>
              ) : (
                <div className="space-y-2">
                  {activity.slice(0, 5).map((a: any) => (
                    <div key={a.id} className="text-xs text-gray-500">
                      <p>{a.summary}</p>
                      <p className="text-gray-300 mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
