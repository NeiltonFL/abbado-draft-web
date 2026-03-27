"use client";

import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function MatterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matterId = params.id as string;
  const { session, loading: authLoading } = useAuth();

  const [matter, setMatter] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [journals, setJournals] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "documents" | "variables" | "activity">("overview");

  const reload = async () => {
    const [m, a] = await Promise.all([api.getMatter(matterId), api.getActivity({ matterId })]);
    setMatter(m); setActivity(a);
  };

  useEffect(() => { if (authLoading || !session) return; reload().then(() => setLoading(false)).catch(() => setLoading(false)); }, [matterId, authLoading, session]);

  const handleDownload = async (docId: string) => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://abbado-draft-production.up.railway.app";
      const res = await fetch(`${apiUrl}/api/engine/download/${docId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const fileNameMatch = disposition.match(/filename="([^"]+)"/);
      const fileName = fileNameMatch ? fileNameMatch[1] : "document.docx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    }
    catch (err: any) { alert("Download failed: " + err.message); }
  };

  const handleRegenerate = async () => {
    const docs = matter?.generatedDocs || [];
    const hasEdits = docs.some((d: any) => (d._count?.editJournal || 0) > 0);
    if (hasEdits && !confirm("Some documents have manual edits. Regenerating will create a new version from the template + current answers. Your edits will be tracked in the journal but may not carry over. Continue?")) return;
    try {
      const result = await api.regenerateDocuments(matterId);
      const summary = result.results.map((r: any) => `${r.templateName}: ${r.applied} edits applied, ${r.dropped} dropped`).join("\n");
      alert("Regenerated!\n" + summary);
      await reload();
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const handleGenerate = async () => {
    try { await api.generateDocuments(matterId, "live"); await reload(); } catch (err: any) { alert("Error: " + err.message); }
  };

  const loadJournal = async (docId: string) => {
    if (journals[docId]) return;
    try { const entries = await api.getEditJournal(matterId, docId); setJournals(prev => ({ ...prev, [docId]: entries })); } catch {}
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
                matter.status === "in_progress" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
              }`}>{matter.status}</span>
              <span className="text-xs text-gray-400">Created {new Date(matter.createdAt).toLocaleDateString()}</span>
              {docs.length > 0 && docs[0].regenerationCount > 0 && (
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">v{docs[0].regenerationCount + 1}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/matters/${matterId}/interview`} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Edit interview</Link>
            {docs.length > 0 ? (
              <button onClick={handleRegenerate} className="px-3 py-1.5 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-600">Regenerate</button>
            ) : (
              <button onClick={handleGenerate} className="px-3 py-1.5 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-600">Generate</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
          {(["overview", "documents", "variables", "activity"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm capitalize transition-colors ${tab === t ? "text-brand-700 border-b-2 border-brand-500 font-medium" : "text-gray-500 hover:text-gray-700"}`}>
              {t}{t === "documents" && docs.length > 0 && <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{docs.length}</span>}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Documents</h3>
                </div>
                {docs.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-2xl mb-2">📄</p>
                    <p className="text-sm text-gray-500 mb-4">No documents generated yet</p>
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/matters/${matterId}/interview`} className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600">Start interview</Link>
                      <button onClick={handleGenerate} className="px-4 py-2 border border-brand-200 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-50">Generate now</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc: any) => (
                      <DocumentCard key={doc.id} doc={doc} onDownload={handleDownload}
                        matterId={matterId} journal={journals[doc.id]} onLoadJournal={() => loadJournal(doc.id)} onReload={reload} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Key variables</h3>
                <div className="space-y-2 text-sm">
                  {variables.filter((v: any) => !v.isComputed && !v.name.includes(".$.")).slice(0, 8).map((v: any) => (
                    <div key={v.id} className="flex justify-between">
                      <span className="text-gray-500 text-xs">{v.displayLabel}</span>
                      <span className="text-gray-900 text-xs font-medium truncate ml-2 max-w-[160px]">
                        {(() => {
                          const val = values[v.name];
                          if (val === undefined || val === null || val === "") return "\u2014";
                          if (typeof val === "object" && !Array.isArray(val)) return [val.street, val.city, val.state].filter(Boolean).join(", ") || "\u2014";
                          if (Array.isArray(val)) return `${val.length} items`;
                          return String(val);
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {docs.length > 0 && docs[0].regenerationCount > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Version history</h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-gray-600">Current (v{docs[0].regenerationCount + 1})</span>
                      <span className="text-gray-400 ml-auto">{new Date(docs[0].regeneratedAt || docs[0].generatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 bg-gray-300 rounded-full" />
                      <span className="text-gray-400">Original (v1)</span>
                      <span className="text-gray-400 ml-auto">{new Date(docs[0].generatedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Regenerated {docs[0].regenerationCount} time{docs[0].regenerationCount !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents tab */}
        {tab === "documents" && (
          <div className="space-y-4">
            {docs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No documents generated yet</p>
                <button onClick={handleGenerate} className="mt-3 px-4 py-2 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-600">Generate now</button>
              </div>
            ) : docs.map((doc: any) => (
              <DocumentCard key={doc.id} doc={doc} onDownload={handleDownload} expanded
                matterId={matterId} journal={journals[doc.id]} onLoadJournal={() => loadJournal(doc.id)} onReload={reload} />
            ))}
          </div>
        )}

        {/* Variables tab */}
        {tab === "variables" && (
          <div className="bg-white rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100"><th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Variable</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Value</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th></tr></thead>
              <tbody>
                {variables.filter((v: any) => !v.isComputed && !v.name.includes(".$.")).map((v: any) => {
                  const val = values[v.name];
                  const display = val === undefined || val === null || val === "" ? "\u2014"
                    : typeof val === "object" && !Array.isArray(val) ? JSON.stringify(val).slice(0, 80)
                    : Array.isArray(val) ? `[${val.length} items]`
                    : String(val);
                  return (
                    <tr key={v.id} className="border-b border-gray-50">
                      <td className="px-4 py-2.5"><span className="text-gray-800">{v.displayLabel}</span><span className="text-[10px] text-gray-400 ml-2 font-mono">{v.name}</span></td>
                      <td className="px-4 py-2.5 text-gray-700 font-mono text-xs max-w-xs truncate">{display}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{v.type}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Activity tab */}
        {tab === "activity" && (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {activity.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">No activity yet</p>
            ) : activity.map((a: any) => (
              <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs shrink-0">
                  {a.activityType?.includes("generated") ? "📄" : a.activityType?.includes("variable") ? "✏️" : "📌"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{a.summary}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Document Card ──

function DocumentCard({ doc, onDownload, matterId, journal, onLoadJournal, onReload, expanded }: {
  doc: any; onDownload: (id: string) => void; matterId: string; journal?: any[];
  onLoadJournal: () => void; onReload: () => void; expanded?: boolean;
}) {
  const [showJournal, setShowJournal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editCount = doc._count?.editJournal || 0;

  const handleUploadEdited = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const result = await api.uploadEditedDocument(matterId, doc.id, base64);
      alert(`Detected ${result.changeCount} change${result.changeCount !== 1 ? "s" : ""}. ${result.journalEntries} journal entries created.`);
      await onReload();
      onLoadJournal();
      setShowJournal(true);
    } catch (err: any) { alert("Upload failed: " + err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden hover:border-brand-200 transition-colors">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${doc.template?.format === "pdf" ? "bg-red-50 text-red-600 text-xs font-bold" : "bg-blue-50 text-blue-600"}`}>
            {doc.template?.format === "pdf" ? "PDF" : "📄"}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{(doc.variableSnapshot as any)?._displayName || doc.template?.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-400">{doc.template?.format?.toUpperCase()}</span>
              <span className="text-[10px] text-gray-300">·</span>
              <span className="text-[10px] text-gray-400">{new Date(doc.regeneratedAt || doc.generatedAt).toLocaleString()}</span>
              {doc.regenerationCount > 0 && (
                <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">v{doc.regenerationCount + 1}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editCount > 0 && (
            <button onClick={() => { setShowJournal(!showJournal); if (!showJournal) onLoadJournal(); }}
              className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-lg hover:bg-amber-100">
              {editCount} edit{editCount !== 1 ? "s" : ""}
            </button>
          )}
          <label className={`px-3 py-1.5 text-xs border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 ${uploading ? "opacity-50" : ""}`}>
            {uploading ? "Uploading..." : "Upload edited"}
            <input ref={fileRef} type="file" accept=".docx" onChange={handleUploadEdited} className="hidden" disabled={uploading} />
          </label>
          {doc.filePath ? (
            <button onClick={() => onDownload(doc.id)} className="px-3 py-1.5 text-xs bg-brand-700 text-white rounded-lg hover:bg-brand-600">Download</button>
          ) : (
            <span className="text-[10px] text-amber-500 bg-amber-50 px-2 py-1 rounded">No file</span>
          )}
        </div>
      </div>

      {/* Edit Journal (collapsible) */}
      {(showJournal || (expanded && editCount > 0)) && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-600">Edit Journal</h4>
            {!showJournal && editCount > 0 && <button onClick={() => { setShowJournal(true); onLoadJournal(); }} className="text-[10px] text-brand-600">Show</button>}
          </div>
          {journal ? (
            journal.length === 0 ? <p className="text-xs text-gray-400">No edits recorded</p> : (
              <div className="space-y-1.5">
                {journal.map((entry: any) => (
                  <div key={entry.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                    entry.status === "active" ? "bg-white border border-gray-100" :
                    entry.status === "applied" ? "bg-green-50 border border-green-100" :
                    "bg-red-50 border border-red-100"
                  }`}>
                    <span className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
                      entry.status === "active" ? "bg-amber-400" :
                      entry.status === "applied" ? "bg-green-400" : "bg-red-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700">{entry.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400">{entry.operationType}</span>
                        <span className="text-[10px] text-gray-300">{new Date(entry.createdAt).toLocaleString()}</span>
                        {entry.status !== "active" && (
                          <span className={`text-[10px] px-1 rounded ${entry.status === "applied" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{entry.status}</span>
                        )}
                      </div>
                      {entry.dropReason && <p className="text-[10px] text-red-500 mt-0.5">{entry.dropReason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : <p className="text-xs text-gray-400">Loading journal...</p>}
        </div>
      )}
    </div>
  );
}
