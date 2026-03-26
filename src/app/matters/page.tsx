"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MattersPage() {
  const [matters, setMatters] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      api.getMatters().catch(() => ({ data: [], total: 0 })),
      api.getWorkflows().catch(() => []),
    ]).then(([m, w]) => {
      setMatters(m);
      setWorkflows(w);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Matters</h1>
            <p className="text-sm text-gray-500 mt-0.5">Document generation projects</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            New matter
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading matters...</p>
        ) : (matters?.data || []).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No matters yet</p>
            <p className="text-sm text-gray-400 mt-1">Create a matter to start generating documents</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Workflow</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Documents</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody>
                {(matters?.data || []).map((m: any) => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/matters/${m.id}`)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                    <td className="px-4 py-3 text-gray-500">{m.workflow?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        m.status === "complete" ? "bg-green-50 text-green-700" :
                        m.status === "in_progress" ? "bg-blue-50 text-blue-700" :
                        m.status === "draft" ? "bg-gray-100 text-gray-600" :
                        "bg-gray-100 text-gray-600"
                      }`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m._count?.generatedDocs || 0}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* New Matter Modal */}
        {showNew && (
          <NewMatterModal
            workflows={workflows}
            onClose={() => setShowNew(false)}
            onCreate={(matter) => {
              setShowNew(false);
              router.push(`/matters/${matter.id}/interview`);
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

function NewMatterModal({ workflows, onClose, onCreate }: { workflows: any[]; onClose: () => void; onCreate: (m: any) => void }) {
  const [name, setName] = useState("");
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name || !workflowId) return;
    setSubmitting(true);
    setError("");
    try {
      const matter = await api.createMatter({ name, workflowId });
      onCreate(matter);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">New matter</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matter name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="e.g., Acme Corp — Delaware Incorporation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workflow</label>
            <select
              value={workflowId} onChange={(e) => setWorkflowId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            >
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button
            onClick={handleCreate} disabled={submitting || !name}
            className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create & start interview"}
          </button>
        </div>
      </div>
    </div>
  );
}
