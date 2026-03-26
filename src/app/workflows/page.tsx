"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import Link from "next/link";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWorkflows().then(setWorkflows).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Workflows</h1>
            <p className="text-sm text-gray-500 mt-0.5">Template collections that generate document packages</p>
          </div>
          <Link href="/workflows/new" className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
            New workflow
          </Link>
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
              <Link
                key={w.id}
                href={`/workflows/${w.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{w.name}</h3>
                    {w.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{w.description}</p>}
                  </div>
                  {w.category && (
                    <span className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">{w.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                  <span>{w._count?.templates || 0} templates</span>
                  <span>{w._count?.variables || 0} variables</span>
                  <span>{w._count?.matters || 0} matters</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
