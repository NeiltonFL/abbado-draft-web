"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

export default function WorkflowsPage() {
  const { session, loading: authLoading } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !session) return;
    api.getWorkflows().then(setWorkflows).catch(console.error).finally(() => setLoading(false));
  }, [authLoading, session]);

  const seedDemo = async () => {
    try {
      setLoading(true);
      const result = await api.seedDemoWorkflow();
      alert(result.message);
      const wfs = await api.getWorkflows();
      setWorkflows(wfs);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Workflows</h1>
            <p className="text-sm text-gray-500 mt-0.5">Template collections that generate document packages</p>
          </div>
          <div className="flex gap-2">
            <button onClick={seedDemo} className="px-4 py-2 border border-brand-200 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors">
              Create demo workflow
            </button>
            <Link href="/workflows/new" className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
              New workflow
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading workflows...</p>
        ) : workflows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No workflows yet</p>
            <p className="text-sm text-gray-400 mt-1">Create a workflow to start automating document generation</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {workflows.map((w) => (
              <div key={w.id} className="bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-sm transition-all group">
                <Link href={`/workflows/${w.id}`} className="block p-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-2">
                      <h3 className="text-sm font-medium text-gray-900">{w.name}</h3>
                      {w.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{w.description}</p>}
                    </div>
                    {w.category && (
                      <span className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full shrink-0">{w.category}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                    <span>{w._count?.templates || 0} templates</span>
                    <span>{w._count?.variables || 0} variables</span>
                    <span>{w._count?.matters || 0} matters</span>
                  </div>
                </Link>
                {/* Actions bar — appears on hover */}
                <div className="border-t border-gray-100 px-5 py-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={async () => {
                    try {
                      await api.duplicateWorkflow(w.id);
                      const wfs = await api.getWorkflows();
                      setWorkflows(wfs);
                    } catch (err: any) { alert("Error: " + err.message); }
                  }} className="px-2.5 py-1 text-[11px] text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors">
                    Duplicate
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`Delete "${w.name}"? This cannot be undone.`)) return;
                    try {
                      await api.deleteWorkflow(w.id);
                      setWorkflows(prev => prev.filter(x => x.id !== w.id));
                    } catch (err: any) { alert("Error: " + err.message); }
                  }} className="px-2.5 py-1 text-[11px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
