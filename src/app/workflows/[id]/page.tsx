"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function WorkflowDetailPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"templates" | "variables" | "interview">("templates");

  useEffect(() => {
    api.getWorkflow(workflowId).then(setWorkflow).catch(console.error).finally(() => setLoading(false));
  }, [workflowId]);

  if (loading) return <AppShell><p className="text-gray-400">Loading...</p></AppShell>;
  if (!workflow) return <AppShell><p className="text-gray-500">Workflow not found</p></AppShell>;

  const templates = workflow.templates || [];
  const variables = workflow.variables || [];
  const sections = workflow.interviewSections || [];

  // Group variables by groupName
  const groups = variables.reduce((acc: Record<string, any[]>, v: any) => {
    const g = v.groupName || "Ungrouped";
    if (!acc[g]) acc[g] = [];
    acc[g].push(v);
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="max-w-5xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link href="/workflows" className="text-xs text-gray-400 hover:text-gray-600">Workflows</Link>
            <h1 className="text-xl font-semibold text-gray-900 mt-1">{workflow.name}</h1>
            {workflow.description && <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              {workflow.category && <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">{workflow.category}</span>}
              <span>{templates.length} templates</span>
              <span>{variables.length} variables</span>
              <span>{workflow._count?.matters || 0} matters</span>
            </div>
          </div>
          <Link
            href={`/matters/new?workflowId=${workflowId}`}
            className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
          >
            New matter from this workflow
          </Link>
        </div>

        <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
          {(["templates", "variables", "interview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm capitalize transition-colors ${
                tab === t ? "text-brand-700 border-b-2 border-brand-500 font-medium" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "templates" && (
          <div>
            {templates.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No templates added yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload templates and add them to this workflow</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((wt: any, i: number) => (
                  <div key={wt.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400 w-6">{i + 1}.</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{wt.template?.name}</p>
                        <p className="text-xs text-gray-400">{wt.template?.format?.toUpperCase()} • {(wt.template?.parsedSchema as any)?.variables?.length || 0} variables</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{wt.template?.format}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "variables" && (
          <div className="space-y-6">
            {Object.entries(groups).map(([groupName, vars]) => (
              <div key={groupName}>
                <h3 className="text-sm font-medium text-gray-700 mb-3">{groupName}</h3>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Label</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Name</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Type</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Required</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Default</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(vars as any[]).map((v: any) => (
                        <tr key={v.id} className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-900">{v.displayLabel}</td>
                          <td className="px-4 py-2 text-gray-500 font-mono text-xs">{v.name}</td>
                          <td className="px-4 py-2">
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{v.type}</span>
                          </td>
                          <td className="px-4 py-2 text-xs">{v.required ? "Yes" : ""}</td>
                          <td className="px-4 py-2 text-xs text-gray-400">{v.defaultValue || ""}</td>
                          <td className="px-4 py-2 text-xs text-gray-400 font-mono">{v.condition || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "interview" && (
          <div>
            {sections.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No interview sections configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((s: any, i: number) => {
                  const sectionVars = variables.filter((v: any) => v.groupName === s.name);
                  return (
                    <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center text-xs font-medium">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{s.name}</p>
                            {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{sectionVars.length} fields</span>
                      </div>
                      {s.condition && (
                        <p className="text-xs text-amber-600 mt-2 ml-10 font-mono">Visible when: {s.condition}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
