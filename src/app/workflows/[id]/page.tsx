"use client";

import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function WorkflowDetailPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const [workflow, setWorkflow] = useState<any>(null);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"templates" | "variables" | "interview">("templates");

  const reload = async () => {
    const [w, t] = await Promise.all([
      api.getWorkflow(workflowId),
      api.getTemplates(),
    ]);
    setWorkflow(w);
    setAllTemplates(t);
  };

  useEffect(() => {
    reload().catch(console.error).finally(() => setLoading(false));
  }, [workflowId]);

  if (loading) return <AppShell><p className="text-gray-400">Loading...</p></AppShell>;
  if (!workflow) return <AppShell><p className="text-gray-500">Workflow not found</p></AppShell>;

  const templates = workflow.templates || [];
  const variables = workflow.variables || [];
  const sections = workflow.interviewSections || [];

  return (
    <AppShell>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link href="/workflows" className="text-xs text-gray-400 hover:text-gray-600">← Workflows</Link>
            <h1 className="text-xl font-semibold text-gray-900 mt-1">{workflow.name}</h1>
            {workflow.description && <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              {workflow.category && <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">{workflow.category}</span>}
              <span>{templates.length} templates</span>
              <span>{variables.length} variables</span>
            </div>
          </div>
          <Link
            href={`/matters?workflowId=${workflowId}`}
            className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
          >
            New matter
          </Link>
        </div>

        {/* Tabs */}
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
              {t === "templates" && <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{templates.length}</span>}
              {t === "variables" && <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{variables.length}</span>}
              {t === "interview" && <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{sections.length}</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "templates" && (
          <TemplatesTab
            workflowId={workflowId}
            workflowTemplates={templates}
            allTemplates={allTemplates}
            onUpdate={reload}
          />
        )}
        {tab === "variables" && (
          <VariablesTab
            workflowId={workflowId}
            variables={variables}
            onUpdate={reload}
          />
        )}
        {tab === "interview" && (
          <InterviewTab
            workflowId={workflowId}
            sections={sections}
            variables={variables}
            onUpdate={reload}
          />
        )}
      </div>
    </AppShell>
  );
}

// ════════════════════════════════════════════════════════
// TEMPLATES TAB
// ════════════════════════════════════════════════════════

function TemplatesTab({ workflowId, workflowTemplates, allTemplates, onUpdate }: {
  workflowId: string; workflowTemplates: any[]; allTemplates: any[]; onUpdate: () => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Templates not yet in this workflow
  const availableTemplates = allTemplates.filter(
    (t) => !workflowTemplates.some((wt) => wt.template?.id === t.id)
  );

  const handleAddExisting = async (templateId: string) => {
    try {
      await api.addTemplateToWorkflow(workflowId, templateId, workflowTemplates.length + 1);
      setShowAdd(false);
      await onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUploadNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const ext = file.name.split(".").pop()?.toLowerCase() || "docx";
      const template = await api.createTemplate({
        name: file.name.replace(/\.[^.]+$/, ""),
        format: ext,
      });

      await api.parseTemplate(base64, file.name, template.id);
      await api.addTemplateToWorkflow(workflowId, template.id, workflowTemplates.length + 1);
      setShowAdd(false);
      await onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = async (wtId: string) => {
    if (!confirm("Remove this template from the workflow?")) return;
    try {
      await api.removeTemplateFromWorkflow(workflowId, wtId);
      await onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-700">Templates in this workflow</h2>
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-600">
          Add template
        </button>
      </div>

      {workflowTemplates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No templates yet</p>
          <p className="text-sm text-gray-400 mt-1">Add templates to define which documents this workflow generates</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm hover:bg-brand-100">
            Add your first template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workflowTemplates.map((wt: any, i: number) => (
            <div key={wt.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="w-7 h-7 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center text-xs font-medium">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{wt.template?.name}</p>
                  <p className="text-xs text-gray-400">
                    {wt.template?.format?.toUpperCase()}
                    {(wt.template?.parsedSchema as any)?.variables?.length > 0 &&
                      ` • ${(wt.template.parsedSchema as any).variables.length} variables detected`}
                  </p>
                </div>
              </div>
              <button onClick={() => handleRemove(wt.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Add Template Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Add template</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload new .docx template</label>
              <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-400 hover:bg-brand-50/30 cursor-pointer transition-colors">
                <div className="text-center">
                  <p className="text-sm text-gray-500">{uploading ? "Uploading & parsing..." : "Click to upload .docx"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Variables will be auto-detected</p>
                </div>
                <input ref={fileRef} type="file" accept=".docx" onChange={handleUploadNew} className="hidden" disabled={uploading} />
              </label>
            </div>

            {availableTemplates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Or add existing template</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableTemplates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleAddExisting(t.id)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.format?.toUpperCase()} • v{t.version}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// VARIABLES TAB
// ════════════════════════════════════════════════════════

const VAR_TYPES = ["text", "number", "currency", "date", "boolean", "dropdown", "multi_select", "email", "phone", "address", "rich_text"];

function VariablesTab({ workflowId, variables, onUpdate }: {
  workflowId: string; variables: any[]; onUpdate: () => Promise<void>;
}) {
  const [editVars, setEditVars] = useState<any[]>(variables);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Reset when variables change from parent
  useEffect(() => { setEditVars(variables); setDirty(false); }, [variables]);

  const addVariable = (v: any) => {
    setEditVars((prev) => [...prev, { ...v, id: `new_${Date.now()}` }]);
    setDirty(true);
    setShowAdd(false);
  };

  const updateVariable = (index: number, field: string, value: any) => {
    setEditVars((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setDirty(true);
  };

  const removeVariable = (index: number) => {
    setEditVars((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const moveVariable = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= editVars.length) return;
    setEditVars((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
    setDirty(true);
  };

  const saveVariables = async () => {
    setSaving(true);
    try {
      await api.updateVariables(workflowId, editVars.map((v, i) => ({
        name: v.name,
        displayLabel: v.displayLabel,
        type: v.type,
        required: v.required || false,
        defaultValue: v.defaultValue || null,
        validation: v.validation || null,
        helpText: v.helpText || null,
        condition: v.condition || null,
        groupName: v.groupName || null,
        displayOrder: i,
        isComputed: v.isComputed || false,
        expression: v.expression || null,
      })));
      await onUpdate();
      setDirty(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Group by groupName
  const groups: Record<string, any[]> = {};
  editVars.forEach((v, i) => {
    const g = v.groupName || "Ungrouped";
    if (!groups[g]) groups[g] = [];
    groups[g].push({ ...v, _index: i });
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-700">
          Variables ({editVars.length})
          {dirty && <span className="text-amber-500 ml-2 text-xs">• unsaved changes</span>}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Add variable
          </button>
          {dirty && (
            <button onClick={saveVariables} disabled={saving} className="px-4 py-1.5 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-600 disabled:opacity-50">
              {saving ? "Saving..." : "Save variables"}
            </button>
          )}
        </div>
      </div>

      {editVars.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No variables defined</p>
          <p className="text-sm text-gray-400 mt-1">Add variables that your templates will use</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm hover:bg-brand-100">
            Add your first variable
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([groupName, groupVars]) => (
            <div key={groupName}>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{groupName}</h3>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {groupVars.map((v: any) => (
                  <div key={v._index} className="p-3 flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveVariable(v._index, -1)} className="text-gray-300 hover:text-gray-500 text-xs leading-none">▲</button>
                      <button onClick={() => moveVariable(v._index, 1)} className="text-gray-300 hover:text-gray-500 text-xs leading-none">▼</button>
                    </div>

                    <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                      <input
                        value={v.displayLabel}
                        onChange={(e) => updateVariable(v._index, "displayLabel", e.target.value)}
                        className="col-span-3 px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-brand-500 outline-none"
                        placeholder="Label"
                      />
                      <input
                        value={v.name}
                        onChange={(e) => updateVariable(v._index, "name", e.target.value)}
                        className="col-span-2 px-2 py-1 border border-gray-200 rounded text-xs font-mono focus:ring-1 focus:ring-brand-500 outline-none"
                        placeholder="var_name"
                      />
                      <select
                        value={v.type}
                        onChange={(e) => updateVariable(v._index, "type", e.target.value)}
                        className="col-span-2 px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                      >
                        {VAR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        value={v.groupName || ""}
                        onChange={(e) => updateVariable(v._index, "groupName", e.target.value)}
                        className="col-span-2 px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                        placeholder="Group"
                      />
                      <label className="col-span-1 flex items-center gap-1 text-xs text-gray-500">
                        <input
                          type="checkbox"
                          checked={v.required || false}
                          onChange={(e) => updateVariable(v._index, "required", e.target.checked)}
                          className="rounded"
                        />
                        Req
                      </label>
                      <input
                        value={v.defaultValue || ""}
                        onChange={(e) => updateVariable(v._index, "defaultValue", e.target.value)}
                        className="col-span-2 px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                        placeholder="Default"
                      />
                    </div>

                    <button onClick={() => removeVariable(v._index)} className="text-red-300 hover:text-red-500 text-sm">✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Variable Modal */}
      {showAdd && <AddVariableModal onAdd={addVariable} onClose={() => setShowAdd(false)} groups={Object.keys(groups)} />}
    </div>
  );
}

function AddVariableModal({ onAdd, onClose, groups }: { onAdd: (v: any) => void; onClose: () => void; groups: string[] }) {
  const [name, setName] = useState("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [type, setType] = useState("text");
  const [groupName, setGroupName] = useState(groups[0] || "");
  const [newGroup, setNewGroup] = useState("");
  const [required, setRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState("");
  const [helpText, setHelpText] = useState("");
  const [condition, setCondition] = useState("");
  const [dropdownOptions, setDropdownOptions] = useState("");

  const handleAdd = () => {
    if (!name || !displayLabel) return;
    const finalGroup = newGroup || groupName;
    onAdd({
      name,
      displayLabel,
      type,
      groupName: finalGroup || null,
      required,
      defaultValue: defaultValue || null,
      helpText: helpText || null,
      condition: condition || null,
      validation: type === "dropdown" && dropdownOptions ? { options: dropdownOptions.split(",").map((s: string) => s.trim()) } : null,
    });
  };

  // Auto-generate name from label
  useEffect(() => {
    if (displayLabel && !name) {
      setName(displayLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
    }
  }, [displayLabel]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Add variable</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display label</label>
            <input value={displayLabel} onChange={(e) => setDisplayLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="e.g., Company Legal Name" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Variable name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="e.g., company_name" />
            <p className="text-xs text-gray-400 mt-0.5">Used in templates as {"{{"}company_name{"}}"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                {VAR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group / section</label>
              {groups.length > 0 ? (
                <select value={newGroup || groupName} onChange={(e) => { setGroupName(e.target.value); setNewGroup(""); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                  {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                  <option value="">+ New group</option>
                </select>
              ) : (
                <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="e.g., Company Information" />
              )}
              {groupName === "" && groups.length > 0 && (
                <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none mt-2"
                  placeholder="New group name" />
              )}
            </div>
          </div>

          {type === "dropdown" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dropdown options</label>
              <input value={dropdownOptions} onChange={(e) => setDropdownOptions(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Option 1, Option 2, Option 3 (comma-separated)" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default value</label>
              <input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Optional" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="rounded" />
                Required field
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Help text</label>
            <input value={helpText} onChange={(e) => setHelpText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Guidance shown to the user filling the interview" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition (optional)</label>
            <input value={condition} onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="e.g., entity_type == 'Corporation'" />
            <p className="text-xs text-gray-400 mt-0.5">Only show this field when the condition is true</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={handleAdd} disabled={!name || !displayLabel}
            className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
            Add variable
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// INTERVIEW TAB
// ════════════════════════════════════════════════════════

function InterviewTab({ workflowId, sections, variables, onUpdate }: {
  workflowId: string; sections: any[]; variables: any[]; onUpdate: () => Promise<void>;
}) {
  const [editSections, setEditSections] = useState(sections);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setEditSections(sections); setDirty(false); }, [sections]);

  // Get unique group names from variables that don't have sections yet
  const varGroups = [...new Set(variables.map((v: any) => v.groupName).filter(Boolean))];
  const uncoveredGroups = varGroups.filter((g) => !editSections.some((s) => s.name === g));

  const addSection = (name: string, description: string) => {
    setEditSections((prev) => [...prev, { id: `new_${Date.now()}`, name, description, displayOrder: prev.length, condition: null }]);
    setDirty(true);
    setShowAdd(false);
  };

  const updateSection = (index: number, field: string, value: any) => {
    setEditSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setDirty(true);
  };

  const removeSection = (index: number) => {
    setEditSections((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= editSections.length) return;
    setEditSections((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
    setDirty(true);
  };

  const autoGenerate = () => {
    const newSections = varGroups.map((g, i) => ({
      id: `auto_${Date.now()}_${i}`,
      name: g,
      description: null,
      displayOrder: i,
      condition: null,
    }));
    setEditSections(newSections);
    setDirty(true);
  };

  const saveSections = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://abbado-draft-production.up.railway.app"}/api/workflows/${workflowId}/interview`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${(await (await import("@/lib/supabase")).supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify({ sections: editSections.map((s, i) => ({ name: s.name, description: s.description, displayOrder: i, condition: s.condition })) }),
        }
      );
      if (!res.ok) throw new Error((await res.json()).error);
      await onUpdate();
      setDirty(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-700">
          Interview sections ({editSections.length})
          {dirty && <span className="text-amber-500 ml-2 text-xs">• unsaved changes</span>}
        </h2>
        <div className="flex items-center gap-2">
          {varGroups.length > 0 && editSections.length === 0 && (
            <button onClick={autoGenerate} className="px-3 py-1.5 border border-brand-200 rounded-lg text-sm text-brand-700 hover:bg-brand-50">
              Auto-generate from variable groups
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Add section
          </button>
          {dirty && (
            <button onClick={saveSections} disabled={saving} className="px-4 py-1.5 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-600 disabled:opacity-50">
              {saving ? "Saving..." : "Save sections"}
            </button>
          )}
        </div>
      </div>

      {editSections.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No interview sections configured</p>
          <p className="text-sm text-gray-400 mt-1">Sections define the steps in the interview wizard. Each section groups related variables.</p>
          {varGroups.length > 0 && (
            <button onClick={autoGenerate} className="mt-4 px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm hover:bg-brand-100">
              Auto-generate {varGroups.length} sections from variable groups
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {editSections.map((s, i) => {
            const sectionVars = variables.filter((v: any) => v.groupName === s.name);
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveSection(i, -1)} className="text-gray-300 hover:text-gray-500 text-xs leading-none">▲</button>
                    <button onClick={() => moveSection(i, 1)} className="text-gray-300 hover:text-gray-500 text-xs leading-none">▼</button>
                  </div>
                  <span className="w-7 h-7 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <input
                      value={s.name}
                      onChange={(e) => updateSection(i, "name", e.target.value)}
                      className="text-sm font-medium text-gray-900 border-none focus:ring-0 p-0 w-full outline-none bg-transparent"
                    />
                    <input
                      value={s.description || ""}
                      onChange={(e) => updateSection(i, "description", e.target.value)}
                      className="text-xs text-gray-400 border-none focus:ring-0 p-0 w-full outline-none bg-transparent mt-0.5"
                      placeholder="Optional description"
                    />
                  </div>
                  <span className="text-xs text-gray-400">{sectionVars.length} fields</span>
                  <button onClick={() => removeSection(i)} className="text-red-300 hover:text-red-500 text-sm ml-2">✕</button>
                </div>
                {s.condition && (
                  <div className="mt-2 ml-10">
                    <input
                      value={s.condition}
                      onChange={(e) => updateSection(i, "condition", e.target.value)}
                      className="text-xs text-amber-600 font-mono border border-amber-200 rounded px-2 py-0.5 w-full outline-none focus:ring-1 focus:ring-amber-400"
                      placeholder="Visibility condition"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {uncoveredGroups.length > 0 && editSections.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            Variable groups without matching sections: {uncoveredGroups.join(", ")}. Variables in these groups won&apos;t appear in the interview.
          </p>
        </div>
      )}

      {/* Add Section Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Add interview section</h2>
            <AddSectionForm
              existingGroups={uncoveredGroups}
              onAdd={(name, desc) => addSection(name, desc)}
              onClose={() => setShowAdd(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AddSectionForm({ existingGroups, onAdd, onClose }: {
  existingGroups: string[]; onAdd: (name: string, desc: string) => void; onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-4">
      {existingGroups.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick add from variable groups</label>
          <div className="flex flex-wrap gap-2">
            {existingGroups.map((g) => (
              <button key={g} onClick={() => onAdd(g, "")}
                className="px-3 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs hover:bg-brand-100">
                {g}
              </button>
            ))}
          </div>
          <div className="my-3 border-t border-gray-200" />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Section name</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          placeholder="e.g., Company Information" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          placeholder="Brief description for the user" />
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
        <button onClick={() => { if (name) onAdd(name, description); }} disabled={!name}
          className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
          Add section
        </button>
      </div>
    </div>
  );
}
