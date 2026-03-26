"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setError("");
    try {
      const workflow = await api.createWorkflow({ name, description, category: category || undefined });
      router.push(`/workflows/${workflow.id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">New workflow</h1>

        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workflow name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="e.g., Delaware Incorporation"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none h-20 resize-y"
              placeholder="What documents does this workflow generate?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            >
              <option value="">No category</option>
              <option value="formation">Formation</option>
              <option value="financing">Financing</option>
              <option value="employment">Employment</option>
              <option value="compliance">Compliance</option>
              <option value="transactional">Transactional</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button
              type="submit" disabled={submitting || !name}
              className="px-6 py-2.5 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create workflow"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
