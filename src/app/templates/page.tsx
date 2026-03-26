"use client";

import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setParseResult(null);

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      // Create template record first
      const ext = file.name.split(".").pop()?.toLowerCase() || "docx";
      const template = await api.createTemplate({
        name: file.name.replace(/\.[^.]+$/, ""),
        format: ext,
        description: "",
      });

      // Parse the template
      const result = await api.parseTemplate(base64, file.name, template.id);
      setParseResult(result);

      // Refresh list
      const updated = await api.getTemplates();
      setTemplates(updated);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Templates</h1>
            <p className="text-sm text-gray-500 mt-0.5">Document templates with variable schemas</p>
          </div>
          <label className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors cursor-pointer">
            {uploading ? "Parsing..." : "Upload template"}
            <input ref={fileRef} type="file" accept=".docx" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        {/* Parse Result Banner */}
        {parseResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-green-800">Template parsed successfully</h3>
            <div className="flex items-center gap-4 mt-2 text-xs text-green-700">
              <span>{parseResult.summary.totalVariables} variables found</span>
              <span>{parseResult.summary.sdtVariables} SDT fields</span>
              <span>{parseResult.summary.mustacheVariables} mustache variables</span>
              <span>{parseResult.summary.conditionalBlocks} conditionals</span>
              <span>{parseResult.summary.repeatingBlocks} repeating sections</span>
            </div>
            <button onClick={() => setParseResult(null)} className="text-xs text-green-600 mt-2 hover:text-green-800">Dismiss</button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading templates...</p>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No templates yet</p>
            <p className="text-sm text-gray-400 mt-1">Upload a .docx file to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Format</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Variables</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Workflows</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Version</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Updated</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-gray-500 uppercase text-xs">{t.format}</td>
                    <td className="px-4 py-3 text-gray-500">{(t.parsedSchema as any)?.variables?.length || 0}</td>
                    <td className="px-4 py-3 text-gray-500">{t._count?.workflowTemplates || 0}</td>
                    <td className="px-4 py-3 text-gray-500">v{t.version}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
