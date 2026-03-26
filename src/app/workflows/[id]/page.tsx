"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const VAR_TYPES: { value: string; label: string; icon: string; description: string }[] = [
  { value: "text", label: "Text", icon: "Aa", description: "Single-line text input" },
  { value: "rich_text", label: "Rich Text", icon: "¶", description: "Multi-line formatted text" },
  { value: "number", label: "Number", icon: "#", description: "Integer or decimal value" },
  { value: "currency", label: "Currency", icon: "$", description: "Dollar amount with formatting" },
  { value: "date", label: "Date", icon: "📅", description: "Calendar date picker" },
  { value: "boolean", label: "Yes / No", icon: "◉", description: "True/false toggle" },
  { value: "dropdown", label: "Dropdown", icon: "▾", description: "Select from predefined options" },
  { value: "multi_select", label: "Multi Select", icon: "☐", description: "Select multiple options" },
  { value: "email", label: "Email", icon: "@", description: "Email address with validation" },
  { value: "phone", label: "Phone", icon: "☎", description: "Phone number with formatting" },
  { value: "address", label: "Address", icon: "⌂", description: "Full address (street, city, state, zip)" },
  { value: "state", label: "US State", icon: "🗺", description: "US state dropdown" },
  { value: "percent", label: "Percentage", icon: "%", description: "Percentage value" },
  { value: "url", label: "URL", icon: "🔗", description: "Web address" },
  { value: "computed", label: "Computed", icon: "ƒ", description: "Calculated from other variables" },
];

const OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "does not equal" },
  { value: "gt", label: "is greater than" },
  { value: "lt", label: "is less than" },
  { value: "gte", label: "is at least" },
  { value: "lte", label: "is at most" },
  { value: "contains", label: "contains" },
  { value: "empty", label: "is empty" },
  { value: "not_empty", label: "is not empty" },
  { value: "truthy", label: "is true" },
  { value: "falsy", label: "is false" },
];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
  "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland",
  "Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
  "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming",
  "District of Columbia","Puerto Rico","Guam","US Virgin Islands",
];

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════

export default function WorkflowBuilderPage() {
  const params = useParams();
  const workflowId = params.id as string;
  const [workflow, setWorkflow] = useState<any>(null);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"templates" | "variables" | "interview" | "logic">("templates");
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");

  const reload = useCallback(async () => {
    const [w, t] = await Promise.all([
      api.getWorkflow(workflowId),
      api.getTemplates(),
    ]);
    setWorkflow(w);
    setAllTemplates(t);
  }, [workflowId]);

  useEffect(() => {
    reload().catch(console.error).finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <AppShell><div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading workflow builder...</p></div></AppShell>;
  if (!workflow) return <AppShell><div className="text-center py-12"><p className="text-gray-500">Workflow not found</p><Link href="/workflows" className="text-sm text-brand-500 mt-2 inline-block">Back to workflows</Link></div></AppShell>;

  const templates = workflow.templates || [];
  const variables: any[] = workflow.variables || [];
  const sections = workflow.interviewSections || [];

  return (
    <AppShell>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/workflows" className="text-xs text-gray-400 hover:text-gray-600">← Workflows</Link>
              {workflow.category && <span className="text-xs px-2 py-0.5 bg-brand-50 text-brand-600 rounded-full">{workflow.category}</span>}
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mt-1">{workflow.name}</h1>
            {workflow.description && <p className="text-sm text-gray-500 mt-0.5">{workflow.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === "saving" && <span className="text-xs text-amber-500">Saving...</span>}
            {saveStatus === "saved" && <span className="text-xs text-green-500">Saved</span>}
            {saveStatus === "error" && <span className="text-xs text-red-500">Save failed</span>}
            <Link href={`/matters?workflowId=${workflowId}`} className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600">
              New matter
            </Link>
          </div>
        </div>

        {/* Build stats */}
        <div className="flex items-center gap-6 mb-5 text-xs text-gray-400">
          <span>{templates.length} template{templates.length !== 1 ? "s" : ""}</span>
          <span>{variables.length} variable{variables.length !== 1 ? "s" : ""}</span>
          <span>{sections.length} interview step{sections.length !== 1 ? "s" : ""}</span>
          <span>{variables.filter((v: any) => v.condition).length} conditional field{variables.filter((v: any) => v.condition).length !== 1 ? "s" : ""}</span>
          <span>{variables.filter((v: any) => v.isComputed).length} computed field{variables.filter((v: any) => v.isComputed).length !== 1 ? "s" : ""}</span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 mb-6 w-fit">
          {([
            { key: "templates", label: "Templates", count: templates.length },
            { key: "variables", label: "Variables", count: variables.length },
            { key: "interview", label: "Interview", count: sections.length },
            { key: "logic", label: "Logic & Conditions", count: variables.filter((v: any) => v.condition || v.isComputed).length },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                tab === t.key
                  ? "bg-white text-gray-900 font-medium shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {t.count > 0 && <span className="ml-1.5 text-xs opacity-50">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "templates" && <TemplatesBuilder workflowId={workflowId} workflowTemplates={templates} allTemplates={allTemplates} onUpdate={reload} />}
        {tab === "variables" && <VariablesBuilder workflowId={workflowId} variables={variables} onUpdate={reload} setSaveStatus={setSaveStatus} />}
        {tab === "interview" && <InterviewBuilder workflowId={workflowId} sections={sections} variables={variables} onUpdate={reload} setSaveStatus={setSaveStatus} />}
        {tab === "logic" && <LogicBuilder variables={variables} />}
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════════════════════════════════
// TEMPLATES BUILDER
// ═══════════════════════════════════════════════════════════

function TemplatesBuilder({ workflowId, workflowTemplates, allTemplates, onUpdate }: {
  workflowId: string; workflowTemplates: any[]; allTemplates: any[]; onUpdate: () => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const availableTemplates = allTemplates.filter(t => !workflowTemplates.some(wt => wt.template?.id === t.id));

  const handleUploadNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setParseResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const ext = file.name.split(".").pop()?.toLowerCase() || "docx";
      const template = await api.createTemplate({ name: file.name.replace(/\.[^.]+$/, ""), format: ext });
      const result = await api.parseTemplate(base64, file.name, template.id);
      await api.addTemplateToWorkflow(workflowId, template.id, workflowTemplates.length + 1);
      setParseResult(result);
      setShowAdd(false);
      await onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAddExisting = async (templateId: string) => {
    try {
      await api.addTemplateToWorkflow(workflowId, templateId, workflowTemplates.length + 1);
      setShowAdd(false);
      await onUpdate();
    } catch (err: any) { alert(err.message); }
  };

  const handleRemove = async (wtId: string) => {
    if (!confirm("Remove this template from the workflow?")) return;
    try {
      await api.removeTemplateFromWorkflow(workflowId, wtId);
      await onUpdate();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div>
      {/* Parse result banner */}
      {parseResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-green-800">Template parsed — {parseResult.summary.totalVariables} variables detected</p>
            <p className="text-xs text-green-600 mt-1">
              {parseResult.summary.sdtVariables} content controls, {parseResult.summary.mustacheVariables} mustache variables,
              {" "}{parseResult.summary.conditionalBlocks} conditionals, {parseResult.summary.repeatingBlocks} repeating sections
            </p>
          </div>
          <button onClick={() => setParseResult(null)} className="text-green-400 hover:text-green-600 text-sm">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Document templates</h2>
          <p className="text-xs text-gray-400 mt-0.5">Templates are the .docx files this workflow generates. Variables detected in templates are auto-imported.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-600">
          Add template
        </button>
      </div>

      {workflowTemplates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Upload .docx templates to define which documents this workflow generates. Variables inside the templates will be auto-detected."
          action="Upload your first template"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="space-y-2">
          {workflowTemplates.map((wt: any, i: number) => {
            const vars = (wt.template?.parsedSchema as any)?.variables || [];
            return (
              <div key={wt.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 group hover:border-brand-200 transition-colors">
                <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{wt.template?.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="uppercase font-medium">{wt.template?.format}</span>
                    {vars.length > 0 && <span>{vars.length} variables</span>}
                    {wt.condition && <span className="text-amber-500">Conditional</span>}
                  </div>
                </div>
                <button onClick={() => handleRemove(wt.id)} className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity">
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Template Modal */}
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title="Add template to workflow">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload new .docx</label>
            <label className="flex items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-400 hover:bg-brand-50/20 cursor-pointer transition-all">
              <div className="text-center">
                <p className="text-2xl mb-1">📄</p>
                <p className="text-sm text-gray-500">{uploading ? "Uploading & parsing..." : "Drop a .docx file here or click to browse"}</p>
                <p className="text-xs text-gray-400 mt-0.5">Variables will be auto-detected from content controls and {"{{mustache}}"} syntax</p>
              </div>
              <input ref={fileRef} type="file" accept=".docx" onChange={handleUploadNew} className="hidden" disabled={uploading} />
            </label>
          </div>

          {availableTemplates.length > 0 && (
            <>
              <div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or add existing</span></div></div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableTemplates.map(t => (
                  <button key={t.id} onClick={() => handleAddExisting(t.id)} className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-brand-300 hover:bg-brand-50/30 transition-all">
                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.format?.toUpperCase()} • v{t.version}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VARIABLES BUILDER
// ═══════════════════════════════════════════════════════════

function VariablesBuilder({ workflowId, variables, onUpdate, setSaveStatus }: {
  workflowId: string; variables: any[]; onUpdate: () => Promise<void>; setSaveStatus: (s: string) => void;
}) {
  const [editVars, setEditVars] = useState<any[]>(variables);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedVar, setExpandedVar] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setEditVars(variables); setDirty(false); }, [variables]);

  const addVar = (v: any) => {
    setEditVars(prev => [...prev, { ...v, id: `new_${Date.now()}`, displayOrder: prev.length }]);
    setDirty(true);
    setShowAdd(false);
  };

  const updateVar = (idx: number, updates: Record<string, any>) => {
    setEditVars(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...updates };
      return next;
    });
    setDirty(true);
  };

  const removeVar = (idx: number) => {
    if (!confirm(`Delete "${editVars[idx].displayLabel}"?`)) return;
    setEditVars(prev => prev.filter((_, i) => i !== idx));
    setExpandedVar(null);
    setDirty(true);
  };

  const moveVar = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= editVars.length) return;
    setEditVars(prev => {
      const next = [...prev];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      return next;
    });
    setDirty(true);
  };

  const duplicateVar = (idx: number) => {
    const original = editVars[idx];
    const copy = { ...original, id: `new_${Date.now()}`, name: `${original.name}_copy`, displayLabel: `${original.displayLabel} (copy)` };
    setEditVars(prev => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
    setDirty(true);
  };

  const saveVariables = async () => {
    setSaveStatus("saving");
    try {
      await api.updateVariables(workflowId, editVars.map((v, i) => ({
        name: v.name,
        displayLabel: v.displayLabel,
        type: v.type === "computed" ? "text" : v.type,
        required: v.required || false,
        defaultValue: v.defaultValue || null,
        validation: v.validation || null,
        helpText: v.helpText || null,
        condition: v.condition || null,
        groupName: v.groupName || null,
        displayOrder: i,
        isComputed: v.type === "computed" || v.isComputed || false,
        expression: v.expression || null,
      })));
      await onUpdate();
      setDirty(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err: any) {
      alert(err.message);
      setSaveStatus("error");
    }
  };

  // Group variables
  const groups: Record<string, { vars: any[]; indices: number[] }> = {};
  editVars.forEach((v, i) => {
    const g = v.groupName || "Ungrouped";
    if (!groups[g]) groups[g] = { vars: [], indices: [] };
    groups[g].vars.push(v);
    groups[g].indices.push(i);
  });

  const typeInfo = (type: string) => VAR_TYPES.find(t => t.value === type);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Variables ({editVars.length})</h2>
          <p className="text-xs text-gray-400 mt-0.5">Define the data fields your templates use. Group them to organize the interview.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            + Add variable
          </button>
          {dirty && (
            <button onClick={saveVariables} className="px-4 py-1.5 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600">
              Save all changes
            </button>
          )}
        </div>
      </div>

      {editVars.length === 0 ? (
        <EmptyState
          title="No variables defined"
          description="Variables are the data fields that feed into your templates. Add them manually or upload a template to auto-detect them."
          action="Add your first variable"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([groupName, { vars: gVars, indices }]) => (
            <div key={groupName}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{groupName}</h3>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{gVars.length} field{gVars.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {gVars.map((v, gi) => {
                  const realIdx = indices[gi];
                  const isExpanded = expandedVar === realIdx;
                  const ti = typeInfo(v.type);

                  return (
                    <div key={v.id || realIdx}>
                      {/* Collapsed row */}
                      <div
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors ${isExpanded ? "bg-gray-50/80" : ""}`}
                        onClick={() => setExpandedVar(isExpanded ? null : realIdx)}
                      >
                        <div className="flex flex-col gap-0.5 opacity-40 hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => moveVar(realIdx, -1)} className="text-[10px] leading-none hover:text-brand-600">▲</button>
                          <button onClick={() => moveVar(realIdx, 1)} className="text-[10px] leading-none hover:text-brand-600">▼</button>
                        </div>

                        <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center text-xs flex-shrink-0" title={ti?.label}>
                          {ti?.icon || "?"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">{v.displayLabel}</span>
                            {v.required && <span className="text-red-400 text-xs">*</span>}
                            {v.condition && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">conditional</span>}
                            {(v.type === "computed" || v.isComputed) && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">computed</span>}
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate">{v.name}</p>
                        </div>

                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{ti?.label || v.type}</span>
                        <span className="text-xs text-gray-300">{isExpanded ? "▾" : "▸"}</span>
                      </div>

                      {/* Expanded editor */}
                      {isExpanded && (
                        <VariableEditor
                          variable={v}
                          allVariables={editVars}
                          onChange={(updates) => updateVar(realIdx, updates)}
                          onDelete={() => removeVar(realIdx)}
                          onDuplicate={() => duplicateVar(realIdx)}
                          groupNames={Object.keys(groups)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {dirty && (
        <div className="fixed bottom-6 right-6 bg-brand-700 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-40">
          <span className="text-sm">Unsaved changes</span>
          <button onClick={saveVariables} className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30">Save</button>
        </div>
      )}

      {showAdd && <AddVariableModal onAdd={addVar} onClose={() => setShowAdd(false)} groupNames={Object.keys(groups)} allVariables={editVars} />}
    </div>
  );
}

// ── Variable Inline Editor ──

function VariableEditor({ variable: v, allVariables, onChange, onDelete, onDuplicate, groupNames }: {
  variable: any; allVariables: any[]; onChange: (u: Record<string, any>) => void;
  onDelete: () => void; onDuplicate: () => void; groupNames: string[];
}) {
  const inputClass = "w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";
  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="px-4 py-4 bg-gray-50/50 border-t border-gray-100">
      <div className="grid grid-cols-3 gap-4">
        {/* Col 1: Core identity */}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Display label</label>
            <input value={v.displayLabel} onChange={e => onChange({ displayLabel: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Variable name <span className="text-gray-300 font-normal">• used in templates</span></label>
            <input value={v.name} onChange={e => onChange({ name: e.target.value })} className={`${inputClass} font-mono text-xs`} />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={v.type} onChange={e => onChange({ type: e.target.value })} className={inputClass}>
              {VAR_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Group / section</label>
            <input value={v.groupName || ""} onChange={e => onChange({ groupName: e.target.value })}
              list="group-suggestions" className={inputClass} placeholder="e.g., Company Information" />
            <datalist id="group-suggestions">
              {groupNames.map(g => <option key={g} value={g} />)}
            </datalist>
          </div>
        </div>

        {/* Col 2: Config */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={v.required || false} onChange={e => onChange({ required: e.target.checked })} className="rounded border-gray-300" />
              Required
            </label>
          </div>
          <div>
            <label className={labelClass}>Default value</label>
            <input value={v.defaultValue || ""} onChange={e => onChange({ defaultValue: e.target.value })} className={inputClass} placeholder="Pre-filled value" />
          </div>
          <div>
            <label className={labelClass}>Help text</label>
            <input value={v.helpText || ""} onChange={e => onChange({ helpText: e.target.value })} className={inputClass} placeholder="Guidance for the person filling this in" />
          </div>

          {/* Type-specific config */}
          {(v.type === "dropdown" || v.type === "multi_select") && (
            <div>
              <label className={labelClass}>Options <span className="text-gray-300 font-normal">• one per line</span></label>
              <textarea
                value={(v.validation?.options || []).join("\n")}
                onChange={e => onChange({ validation: { ...v.validation, options: e.target.value.split("\n").filter(Boolean) } })}
                className={`${inputClass} h-20 resize-y`}
                placeholder={"Option 1\nOption 2\nOption 3"}
              />
            </div>
          )}

          {v.type === "number" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Min</label>
                <input type="number" value={v.validation?.min ?? ""} onChange={e => onChange({ validation: { ...v.validation, min: e.target.value ? Number(e.target.value) : undefined } })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Max</label>
                <input type="number" value={v.validation?.max ?? ""} onChange={e => onChange({ validation: { ...v.validation, max: e.target.value ? Number(e.target.value) : undefined } })} className={inputClass} />
              </div>
            </div>
          )}

          {v.type === "text" && (
            <div>
              <label className={labelClass}>Max length</label>
              <input type="number" value={v.validation?.maxLength ?? ""} onChange={e => onChange({ validation: { ...v.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })} className={inputClass} placeholder="No limit" />
            </div>
          )}
        </div>

        {/* Col 3: Logic */}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Visibility condition</label>
            <ConditionBuilder
              condition={v.condition || ""}
              variables={allVariables.filter(av => av.name !== v.name)}
              onChange={val => onChange({ condition: val || null })}
            />
          </div>

          {(v.type === "computed" || v.isComputed) && (
            <div>
              <label className={labelClass}>Computation expression</label>
              <textarea
                value={v.expression || ""}
                onChange={e => onChange({ expression: e.target.value })}
                className={`${inputClass} h-16 font-mono text-xs resize-y`}
                placeholder="e.g., total_shares * ownership_percent / 100"
              />
              <p className="text-[10px] text-gray-400 mt-1">Available: +, -, *, /, round(), floor(), ceil(), and variable names</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
            <button onClick={onDuplicate} className="text-xs text-gray-400 hover:text-gray-600">Duplicate</button>
            <span className="text-gray-200">•</span>
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Condition Builder ──

function ConditionBuilder({ condition, variables, onChange }: {
  condition: string; variables: any[]; onChange: (val: string) => void;
}) {
  // Parse existing condition
  const parsed = parseConditionStr(condition);

  const updateCondition = (varName: string, op: string, val: string) => {
    if (!varName) { onChange(""); return; }
    if (op === "truthy" || op === "falsy") { onChange(op === "falsy" ? `!${varName}` : varName); return; }
    if (op === "empty" || op === "not_empty") { onChange(op === "empty" ? `!${varName}` : varName); return; }
    onChange(`${varName} ${op === "eq" ? "==" : op === "neq" ? "!=" : op === "gt" ? ">" : op === "lt" ? "<" : op === "gte" ? ">=" : "<="} "${val}"`);
  };

  return (
    <div className="space-y-1.5">
      <select
        value={parsed.varName}
        onChange={e => updateCondition(e.target.value, parsed.op || "eq", parsed.val)}
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none"
      >
        <option value="">Always visible</option>
        {variables.map(v => <option key={v.name} value={v.name}>{v.displayLabel || v.name}</option>)}
      </select>
      {parsed.varName && (
        <div className="flex gap-1.5">
          <select
            value={parsed.op}
            onChange={e => updateCondition(parsed.varName, e.target.value, parsed.val)}
            className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none"
          >
            {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {!["truthy", "falsy", "empty", "not_empty"].includes(parsed.op) && (
            <input
              value={parsed.val}
              onChange={e => updateCondition(parsed.varName, parsed.op, e.target.value)}
              className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none"
              placeholder="value"
            />
          )}
        </div>
      )}
    </div>
  );
}

function parseConditionStr(c: string): { varName: string; op: string; val: string } {
  if (!c) return { varName: "", op: "eq", val: "" };
  const match = c.match(/^(\S+)\s*(==|!=|>=|<=|>|<)\s*["']?([^"']*)["']?$/);
  if (match) return { varName: match[1], op: match[2] === "==" ? "eq" : match[2] === "!=" ? "neq" : match[2] === ">" ? "gt" : match[2] === "<" ? "lt" : match[2] === ">=" ? "gte" : "lte", val: match[3] };
  if (c.startsWith("!")) return { varName: c.slice(1), op: "falsy", val: "" };
  return { varName: c, op: "truthy", val: "" };
}

// ═══════════════════════════════════════════════════════════
// ADD VARIABLE MODAL
// ═══════════════════════════════════════════════════════════

function AddVariableModal({ onAdd, onClose, groupNames, allVariables }: {
  onAdd: (v: any) => void; onClose: () => void; groupNames: string[]; allVariables: any[];
}) {
  const [displayLabel, setDisplayLabel] = useState("");
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [type, setType] = useState("text");
  const [groupName, setGroupName] = useState(groupNames[0] || "");
  const [required, setRequired] = useState(false);

  // Auto-generate name from label
  useEffect(() => {
    if (!nameEdited && displayLabel) {
      setName(displayLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
    }
  }, [displayLabel, nameEdited]);

  const nameTaken = allVariables.some(v => v.name === name);

  return (
    <Modal onClose={onClose} title="Add variable">
      {/* Type picker grid */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-500 mb-2">Choose a type</label>
        <div className="grid grid-cols-5 gap-1.5">
          {VAR_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`p-2 rounded-lg border text-center transition-all ${
                type === t.value
                  ? "border-brand-400 bg-brand-50 ring-1 ring-brand-400"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="text-base block">{t.icon}</span>
              <span className="text-[10px] text-gray-600 mt-0.5 block leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Display label</label>
          <input value={displayLabel} onChange={e => setDisplayLabel(e.target.value)} autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder="e.g., Company Legal Name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Variable name</label>
          <div className="relative">
            <input value={name} onChange={e => { setName(e.target.value); setNameEdited(true); }}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none ${nameTaken ? "border-red-300" : "border-gray-300"}`}
              placeholder="company_name" />
            {nameTaken && <p className="text-[10px] text-red-500 mt-0.5">This name is already in use</p>}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Group</label>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} list="add-var-groups"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="e.g., Company Information" />
            <datalist id="add-var-groups">{groupNames.map(g => <option key={g} value={g} />)}</datalist>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className="rounded border-gray-300" />
              <span className="text-gray-600">Required</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
        <button onClick={() => { if (name && displayLabel && !nameTaken) onAdd({ name, displayLabel, type, groupName: groupName || null, required }); }}
          disabled={!name || !displayLabel || nameTaken}
          className="px-5 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
          Add variable
        </button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// INTERVIEW BUILDER
// ═══════════════════════════════════════════════════════════

function InterviewBuilder({ workflowId, sections, variables, onUpdate, setSaveStatus }: {
  workflowId: string; sections: any[]; variables: any[]; onUpdate: () => Promise<void>; setSaveStatus: (s: string) => void;
}) {
  const [editSections, setEditSections] = useState(sections);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setEditSections(sections); setDirty(false); }, [sections]);

  const varGroups = [...new Set(variables.map((v: any) => v.groupName).filter(Boolean))] as string[];
  const uncovered = varGroups.filter(g => !editSections.some((s: any) => s.name === g));

  const addSection = (name: string, desc?: string) => {
    setEditSections(prev => [...prev, { id: `new_${Date.now()}`, name, description: desc || null, condition: null }]);
    setDirty(true);
  };

  const updateSection = (i: number, updates: Record<string, any>) => {
    setEditSections(prev => { const n = [...prev]; n[i] = { ...n[i], ...updates }; return n; });
    setDirty(true);
  };

  const removeSection = (i: number) => { setEditSections(prev => prev.filter((_, j) => j !== i)); setDirty(true); };

  const moveSection = (i: number, dir: -1 | 1) => {
    const ni = i + dir;
    if (ni < 0 || ni >= editSections.length) return;
    setEditSections(prev => { const n = [...prev]; [n[i], n[ni]] = [n[ni], n[i]]; return n; });
    setDirty(true);
  };

  const autoGenerate = () => {
    setEditSections(varGroups.map((g, i) => ({ id: `auto_${Date.now()}_${i}`, name: g, description: null, condition: null })));
    setDirty(true);
  };

  const saveSections = async () => {
    setSaveStatus("saving");
    try {
      const token = (await (await import("@/lib/supabase")).supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://abbado-draft-production.up.railway.app"}/api/workflows/${workflowId}/interview`,
        { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ sections: editSections.map((s, i) => ({ name: s.name, description: s.description, displayOrder: i, condition: s.condition })) }) }
      );
      if (!res.ok) throw new Error((await res.json()).error);
      await onUpdate();
      setDirty(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err: any) { alert(err.message); setSaveStatus("error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Interview steps ({editSections.length})</h2>
          <p className="text-xs text-gray-400 mt-0.5">Each section becomes a step in the interview wizard. Variables are assigned to sections by their Group name.</p>
        </div>
        <div className="flex items-center gap-2">
          {varGroups.length > 0 && editSections.length === 0 && (
            <button onClick={autoGenerate} className="px-3 py-1.5 border border-brand-200 text-brand-700 rounded-lg text-sm hover:bg-brand-50">
              Auto-generate from groups
            </button>
          )}
          <button onClick={() => addSection("New Section")} className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
            + Add section
          </button>
          {dirty && (
            <button onClick={saveSections} className="px-4 py-1.5 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600">
              Save sections
            </button>
          )}
        </div>
      </div>

      {editSections.length === 0 ? (
        <EmptyState
          title="No interview steps"
          description="Interview steps organize variables into a multi-step wizard. Each step shows variables from a matching Group."
          action={varGroups.length > 0 ? `Auto-generate ${varGroups.length} steps from variable groups` : "Add a section"}
          onAction={() => varGroups.length > 0 ? autoGenerate() : addSection("New Section")}
        />
      ) : (
        <div className="space-y-2">
          {editSections.map((s, i) => {
            const sVars = variables.filter((v: any) => v.groupName === s.name);
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 group hover:border-brand-200 transition-colors">
                <div className="flex flex-col gap-0.5 pt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveSection(i, -1)} className="text-[10px] leading-none hover:text-brand-600">▲</button>
                  <button onClick={() => moveSection(i, 1)} className="text-[10px] leading-none hover:text-brand-600">▼</button>
                </div>
                <div className="w-8 h-8 bg-brand-50 text-brand-700 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <input
                    value={s.name}
                    onChange={e => updateSection(i, { name: e.target.value })}
                    className="text-sm font-medium text-gray-900 bg-transparent border-none outline-none w-full p-0"
                  />
                  <input
                    value={s.description || ""}
                    onChange={e => updateSection(i, { description: e.target.value || null })}
                    className="text-xs text-gray-400 bg-transparent border-none outline-none w-full p-0 mt-0.5"
                    placeholder="Add a description for this step..."
                  />
                  {s.condition && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] text-amber-500">Visible when:</span>
                      <input
                        value={s.condition}
                        onChange={e => updateSection(i, { condition: e.target.value })}
                        className="text-[11px] text-amber-600 font-mono bg-amber-50 border border-amber-200 rounded px-2 py-0.5 outline-none flex-1"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {sVars.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {sVars.slice(0, 6).map((v: any) => (
                          <span key={v.id} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{v.displayLabel}</span>
                        ))}
                        {sVars.length > 6 && <span className="text-[10px] text-gray-400">+{sVars.length - 6} more</span>}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-300">No variables in this group yet</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{sVars.length} field{sVars.length !== 1 ? "s" : ""}</span>
                  {!s.condition && (
                    <button onClick={() => updateSection(i, { condition: "" })} className="text-[10px] text-gray-300 hover:text-amber-500 opacity-0 group-hover:opacity-100">
                      + condition
                    </button>
                  )}
                  <button onClick={() => removeSection(i)} className="text-xs text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {uncovered.length > 0 && editSections.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <span className="text-amber-500 mt-0.5">⚠</span>
          <div>
            <p className="text-xs text-amber-700 font-medium">Variable groups without interview steps</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {uncovered.map(g => (
                <button key={g} onClick={() => addSection(g)} className="text-[11px] bg-white border border-amber-300 text-amber-700 px-2 py-0.5 rounded-lg hover:bg-amber-50">
                  + {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOGIC VIEW
// ═══════════════════════════════════════════════════════════

function LogicBuilder({ variables }: { variables: any[] }) {
  const conditionalVars = variables.filter((v: any) => v.condition);
  const computedVars = variables.filter((v: any) => v.isComputed || v.type === "computed");
  const requiredVars = variables.filter((v: any) => v.required);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-700">Logic overview</h2>
        <p className="text-xs text-gray-400 mt-0.5">Visual summary of conditions, computed fields, and dependencies across your workflow.</p>
      </div>

      {/* Conditional fields */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Conditional fields ({conditionalVars.length})</h3>
        {conditionalVars.length === 0 ? (
          <p className="text-xs text-gray-400 bg-white rounded-xl border border-gray-200 p-4">No conditional fields. Add conditions in the Variables tab to show/hide fields based on other answers.</p>
        ) : (
          <div className="space-y-2">
            {conditionalVars.map((v: any) => {
              const parsed = parseConditionStr(v.condition);
              const depVar = variables.find((dv: any) => dv.name === parsed.varName);
              return (
                <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{v.displayLabel}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Show when <span className="text-amber-600 font-medium">{depVar?.displayLabel || parsed.varName}</span>
                      {" "}<span className="text-gray-500">{OPERATORS.find(o => o.value === parsed.op)?.label || parsed.op}</span>
                      {parsed.val && <span className="text-brand-600 font-medium"> &ldquo;{parsed.val}&rdquo;</span>}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{v.condition}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Computed fields */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Computed fields ({computedVars.length})</h3>
        {computedVars.length === 0 ? (
          <p className="text-xs text-gray-400 bg-white rounded-xl border border-gray-200 p-4">No computed fields. Add variables with type &ldquo;Computed&rdquo; to calculate values from other variables.</p>
        ) : (
          <div className="space-y-2">
            {computedVars.map((v: any) => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-sm font-medium text-gray-900">{v.displayLabel}</p>
                <p className="text-xs text-purple-600 font-mono mt-1">{v.expression || "No expression defined"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Required fields summary */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Required fields ({requiredVars.length} of {variables.length})</h3>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {requiredVars.length === 0 ? (
            <p className="text-xs text-gray-400">No required fields. Users can skip any field in the interview.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {requiredVars.map((v: any) => (
                <span key={v.id} className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded">{v.displayLabel}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ title, description, action, onAction }: {
  title: string; description: string; action: string; onAction: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 border-dashed p-12 text-center">
      <p className="text-gray-500 font-medium">{title}</p>
      <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">{description}</p>
      <button onClick={onAction} className="mt-4 px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-100 transition-colors">
        {action}
      </button>
    </div>
  );
}
