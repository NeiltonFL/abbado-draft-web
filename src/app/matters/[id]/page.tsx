"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function MatterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matterId = params.id as string;

  const [matter, setMatter] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "documents" | "variables" | "activity">("overview");

  useEffect(() => {
    Promise.all([
      api.getMatter(matterId),
      api.getActivity({ matterId }),
    ]).then(([m, a]) => {
      setMatter(m);
      setActivity(a);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [matterId]);

  const handleDownload = async (docId: string) => {
    try {
      const { url, fileName } = await api.getDownloadUrl(docId);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleRegenerate = async () => {
    try {
      const result = await api.regenerateDocuments(matterId);
      alert(`Regenerated ${result.results.length} documents`);
      // Reload
      const m = await api.getMatter(matterId);
      setMatter(m);
    } catch (err: any) {
      alert(`Regeneration failed: ${err.message}`);
    }
  };

  if (loading) return <AppShell><p className="text-gray-400">Loading...</p></AppShell>;
  if (!matter) return <AppShell><p className="text-gray-500">Matter not found</p></AppShell>;

  const values = (matter.variableValues as Record<string, any>) || {};
  const variables = matter.workflow?.variables || [];
  const docs = matter.generatedDocs || [];

  return (
    <AppShell>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400">{matter.workflow?.name}</p>
            <h1 className="text-xl font-semibold text-gray-900 mt-0.5">{matter.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                matter.status === "complete" ? "bg-green-50 text-green-700" :
                matter.status === "in_progress" ? "bg-blue-50 text-blue-700" :
                "bg-gray-100 text-gray-600"
              }`}>{matter.status}</span>
              <span className="text-xs text-gray-400">Created {new Date(matter.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/matters/${matterId}/interview`}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Edit interview
            </Link>
            {docs.length > 0 && (
              <button
                onClick={handleRegenerate}
                className="px-3 py-1.5 text-sm border border-brand-200 rounded-lg text-brand-700 hover:bg-brand-50"
              >
                Regenerate all
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
          {(["overview", "documents", "variables", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm capitalize transition-colors ${
                tab === t
                  ? "text-brand-700 border-b-2 border-brand-500 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
              {t === "documents" && docs.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{docs.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              {/* Generate / Documents section */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Documents</h3>
                  {docs.length > 0 && (
                    <button onClick={handleRegenerate} className="text-xs text-brand-600 hover:text-brand-700">Regenerate</button>
                  )}
                </div>
                {docs.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-2xl mb-2">📄</p>
                    <p className="text-sm text-gray-500 mb-1">No documents generated yet</p>
                    <p className="text-xs text-gray-400 mb-4">Complete the interview and generate your document set</p>
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/matters/${matterId}/interview`}
                        className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600">
                        Start interview
                      </Link>
                      <button onClick={async () => {
                        try {
                          setLoading(true);
                          const result = await api.generateDocuments(matterId, "live");
                          const m = await api.getMatter(matterId);
                          setMatter(m);
                          setLoading(false);
                        } catch (err: any) {
                          alert(err.message);
                          setLoading(false);
                        }
                      }} className="px-4 py-2 border border-brand-200 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-50">
                        Generate now
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-brand-200 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">📄</div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.template?.name}</p>
                            <p className="text-xs text-gray-400">
                              {doc.template?.format?.toUpperCase()} • {doc.mode} mode • {new Date(doc.generatedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc._count?.editJournal > 0 && (
                            <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded">{doc._count.editJournal} edits</span>
                          )}
                          {doc.filePath ? (
                            <button onClick={() => handleDownload(doc.id)}
                              className="px-4 py-1.5 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-600 opacity-80 group-hover:opacity-100 transition-opacity">
                              Download
                            </button>
                          ) : (
                            <span className="text-xs text-amber-500 bg-amber-50 px-2 py-1 rounded">No template file</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Key variables</h3>
              <div className="space-y-2 text-sm">
                {variables.filter((v: any) => !v.isComputed && !v.name.includes(".$.")).slice(0, 8).map((v: any) => (
                  <div key={v.id} className="flex justify-between">
                    <span className="text-gray-500">{v.displayLabel}</span>
                    <span className="text-gray-900 font-medium truncate ml-2 max-w-[180px]">{String(values[v.name] || "—")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "documents" && (
          <div className="bg-white rounded-xl border border-gray-200">
            {docs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No documents generated yet</p>
                <Link href={`/matters/${matterId}/interview`} className="text-sm text-brand-500 mt-2 inline-block">
                  Go to interview
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Document</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Format</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Mode</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Edits</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Generated</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc: any) => (
                    <tr key={doc.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.template?.name}</td>
                      <td className="px-4 py-3 text-gray-500 uppercase text-xs">{doc.template?.format}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${doc.mode === "live" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {doc.mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{doc._count?.editJournal || 0}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(doc.generatedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        {doc.filePath && (
                          <button onClick={() => handleDownload(doc.id)} className="text-xs text-brand-600 hover:text-brand-700">
                            Download
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "variables" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="space-y-3">
              {variables.filter((v: any) => !v.isComputed).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{v.displayLabel}</p>
                    <p className="text-xs text-gray-400">{v.name} • {v.type}</p>
                  </div>
                  <p className="text-sm text-gray-900 max-w-[300px] truncate">
                    {v.name.includes(".$.") ? "(per-item)" :
                     typeof values[v.name] === "object" ? JSON.stringify(values[v.name]).slice(0, 50) + "..." :
                     String(values[v.name] ?? "—")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "activity" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            {activity.length === 0 ? (
              <p className="text-sm text-gray-400">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {activity.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-700">{a.summary}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
