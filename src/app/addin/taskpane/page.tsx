"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ──

interface Variable {
  id: string;
  name: string;
  displayLabel: string;
  type: string;
  isComputed: boolean;
  validation: any;
  groupName: string | null;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  variables: Variable[];
}

type Mode = "loading" | "template" | "document" | "standalone";
type Tab = "variables" | "conditionals" | "repeating" | "structure" | "edits" | "values";

// ── Office.js helpers ──

declare const Office: any;
declare const Word: any;

function isOfficeReady(): boolean {
  return typeof Office !== "undefined" && typeof Word !== "undefined";
}

// ── Main Component ──

export default function TaskPane() {
  const [officeReady, setOfficeReady] = useState(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [tab, setTab] = useState<Tab>("variables");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [docMetadata, setDocMetadata] = useState<any>(null);
  const [error, setError] = useState("");

  // Initialize Office.js
  useEffect(() => {
    if (isOfficeReady()) {
      Office.onReady((info: any) => {
        if (info.host === Office.HostType.Word) {
          setOfficeReady(true);
          detectMode();
        } else {
          setMode("standalone");
        }
      });
    } else {
      // Not in Word — show standalone mode for testing
      const timer = setTimeout(() => {
        if (!isOfficeReady()) setMode("standalone");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Detect if this is a template or generated document
  const detectMode = useCallback(async () => {
    try {
      await Word.run(async (context: any) => {
        const props = context.document.properties.customProperties;
        props.load("items");
        await context.sync();

        // Check for Abbado Draft metadata
        let foundMeta = false;
        for (const item of props.items) {
          if (item.key === "abbado_draft_matter_id") {
            foundMeta = true;
            setDocMetadata({
              matterId: item.value,
            });
            break;
          }
        }

        setMode(foundMeta ? "document" : "template");
      });
    } catch {
      // If custom properties fail, default to template mode
      setMode("template");
    }
  }, []);

  // Load workflows
  useEffect(() => {
    if (mode === "template" || mode === "standalone") {
      loadWorkflows();
    }
  }, [mode]);

  const loadWorkflows = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await fetch(getApiUrl() + "/api/workflows", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setWorkflows(data);
    } catch (err) {
      console.error("Failed to load workflows:", err);
    }
  };

  const loadWorkflowDetail = async (id: string) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await fetch(getApiUrl() + `/api/workflows/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSelectedWorkflow(data);
    } catch (err) {
      console.error("Failed to load workflow:", err);
    }
  };

  // ── Insert Variable as Content Control ──
  const insertVariable = async (variable: Variable) => {
    if (!officeReady) { flash(`{{${variable.name}}}`); return; }

    try {
      await Word.run(async (context: any) => {
        const selection = context.document.getSelection();
        const cc = selection.insertContentControl();
        cc.tag = variable.name;
        cc.title = variable.displayLabel;
        cc.appearance = "BoundingBox";
        cc.color = "#6366f1"; // brand indigo
        cc.insertText(`{{${variable.name}}}`, "Replace");
        await context.sync();
      });
      flash(`Inserted: ${variable.displayLabel}`);
    } catch (err: any) {
      flash("Error: " + err.message);
    }
  };

  // ── Insert Conditional Block ──
  const insertConditional = async (varName: string, type: "if" | "ifelse") => {
    if (!officeReady) { flash(`{{#if ${varName}}}...{{/if}}`); return; }

    try {
      await Word.run(async (context: any) => {
        const selection = context.document.getSelection();
        if (type === "ifelse") {
          selection.insertText(`{{#if ${varName}}}\n[Content when ${varName} is true]\n{{else}}\n[Content when ${varName} is false]\n{{/if}}`, "Replace");
        } else {
          selection.insertText(`{{#if ${varName}}}\n[Content when ${varName} is true]\n{{/if}}`, "Replace");
        }
        await context.sync();
      });
      flash(`Inserted conditional block for ${varName}`);
    } catch (err: any) {
      flash("Error: " + err.message);
    }
  };

  // ── Insert Repeating Block ──
  const insertRepeating = async (varName: string, fields: string[]) => {
    if (!officeReady) { flash(`{{#each ${varName}}}...{{/each}}`); return; }

    try {
      await Word.run(async (context: any) => {
        const selection = context.document.getSelection();
        const fieldPlaceholders = fields.map(f => `{{this.${f}}}`).join(" | ");
        selection.insertText(`{{#each ${varName}}}\n{{@index}}. ${fieldPlaceholders}\n{{/each}}`, "Replace");
        await context.sync();
      });
      flash(`Inserted repeating block for ${varName}`);
    } catch (err: any) {
      flash("Error: " + err.message);
    }
  };

  // ── Insert Comparison Conditional ──
  const insertComparison = async (varName: string, operator: string, value: string) => {
    if (!officeReady) return;
    try {
      await Word.run(async (context: any) => {
        const selection = context.document.getSelection();
        selection.insertText(`{{#if ${varName} ${operator} '${value}'}}\n[Content when condition is met]\n{{/if}}`, "Replace");
        await context.sync();
      });
      flash(`Inserted comparison: ${varName} ${operator} "${value}"`);
    } catch (err: any) {
      flash("Error: " + err.message);
    }
  };

  // ── Scan Document for Variables ──
  const scanDocument = async () => {
    if (!officeReady) return;
    try {
      await Word.run(async (context: any) => {
        const body = context.document.body;
        body.load("text");
        await context.sync();

        const text = body.text;
        const vars = new Set<string>();
        const pattern = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g;
        let m;
        while ((m = pattern.exec(text)) !== null) {
          if (!m[1].startsWith("#") && !m[1].startsWith("/") && !m[1].startsWith("@") && m[1] !== "else") {
            vars.add(m[1]);
          }
        }
        flash(`Found ${vars.size} variable(s): ${Array.from(vars).join(", ")}`);
      });
    } catch (err: any) {
      flash("Scan error: " + err.message);
    }
  };

  // ── Upload as Template ──
  const uploadAsTemplate = async () => {
    if (!officeReady || !selectedWorkflow) return;
    try {
      await Word.run(async (context: any) => {
        const doc = context.document;
        const body = doc.body;
        body.load("text");
        await context.sync();
        // Get the file as base64
        // Note: Office.js getFileAsync is needed for the actual file bytes
      });

      flash("Upload as template — use File > Save first, then upload via the web app. (Direct upload coming in next update.)");
    } catch (err: any) {
      flash("Error: " + err.message);
    }
  };

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 4000);
  };

  // ── Auth ──
  const [token, setToken] = useState("");

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await fetch(getApiUrl() + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      setToken(data.token || data.access_token || "");
      localStorage.setItem("abbado_token", data.token || data.access_token || "");
      loadWorkflows();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Render ──

  if (mode === "loading") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Connecting to Word...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-sm">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">A</span>
            </div>
            <span className="font-semibold text-gray-900 text-xs">Abbado Draft</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            mode === "template" ? "bg-purple-100 text-purple-700" :
            mode === "document" ? "bg-green-100 text-green-700" :
            "bg-gray-100 text-gray-500"
          }`}>
            {mode === "template" ? "Template Mode" : mode === "document" ? "Document Mode" : "Preview"}
          </span>
        </div>
      </div>

      {/* Status bar */}
      {status && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-3 py-1.5">
          <p className="text-[11px] text-indigo-700">{status}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === "template" || mode === "standalone" ? (
          <TemplateMode
            workflows={workflows}
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={loadWorkflowDetail}
            onInsertVariable={insertVariable}
            onInsertConditional={insertConditional}
            onInsertRepeating={insertRepeating}
            onInsertComparison={insertComparison}
            onScan={scanDocument}
            onUpload={uploadAsTemplate}
            search={search}
            setSearch={setSearch}
            tab={tab}
            setTab={setTab}
            officeReady={officeReady}
          />
        ) : (
          <DocumentMode
            metadata={docMetadata}
            officeReady={officeReady}
            flash={flash}
          />
        )}
      </div>
    </div>
  );
}

// ── Template Mode ──

function TemplateMode({ workflows, selectedWorkflow, onSelectWorkflow, onInsertVariable, onInsertConditional, onInsertRepeating, onInsertComparison, onScan, onUpload, search, setSearch, tab, setTab, officeReady }: {
  workflows: Workflow[]; selectedWorkflow: Workflow | null;
  onSelectWorkflow: (id: string) => void; onInsertVariable: (v: Variable) => void;
  onInsertConditional: (name: string, type: "if" | "ifelse") => void;
  onInsertRepeating: (name: string, fields: string[]) => void;
  onInsertComparison: (name: string, op: string, val: string) => void;
  onScan: () => void; onUpload: () => void;
  search: string; setSearch: (s: string) => void;
  tab: Tab; setTab: (t: Tab) => void;
  officeReady: boolean;
}) {
  const [condVar, setCondVar] = useState("");
  const [condOp, setCondOp] = useState("==");
  const [condVal, setCondVal] = useState("");

  if (!selectedWorkflow) {
    // Workflow picker
    return (
      <div className="p-3 space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1">Select a workflow</p>
          <p className="text-[10px] text-gray-400">Choose which workflow this template belongs to. Variables from that workflow will be available to insert.</p>
        </div>
        {workflows.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No workflows found. Create one in the web app first.</p>
        ) : (
          <div className="space-y-1.5">
            {workflows.map(w => (
              <button key={w.id} onClick={() => onSelectWorkflow(w.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                <p className="text-xs font-medium text-gray-800">{w.name}</p>
                {w.description && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{w.description}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const variables = selectedWorkflow.variables?.filter(v => !v.isComputed && !v.name.includes(".$.")) || [];
  const subVars = selectedWorkflow.variables?.filter(v => v.name.includes(".$.")) || [];
  const computedVars = selectedWorkflow.variables?.filter(v => v.isComputed) || [];
  const repeatingVars = variables.filter(v => v.type === "repeating");
  const booleanVars = variables.filter(v => v.type === "boolean");
  const filteredVars = search ? variables.filter(v => v.displayLabel.toLowerCase().includes(search.toLowerCase()) || v.name.toLowerCase().includes(search.toLowerCase())) : variables;

  // Group by page
  const byPage: Record<string, Variable[]> = {};
  for (const v of filteredVars) {
    const page = v.groupName || "Other";
    if (!byPage[page]) byPage[page] = [];
    byPage[page].push(v);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "variables", label: "Variables" },
    { key: "conditionals", label: "Conditionals" },
    { key: "repeating", label: "Repeating" },
    { key: "structure", label: "Tools" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Workflow header */}
      <div className="px-3 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400">Workflow</p>
            <p className="text-xs font-medium text-gray-800 truncate">{selectedWorkflow.name}</p>
          </div>
          <button onClick={() => { /* deselect */ }} className="text-[10px] text-gray-400 hover:text-indigo-600 shrink-0">Change</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-2 py-2 text-[11px] font-medium transition-colors ${
              tab === t.key ? "text-indigo-700 border-b-2 border-indigo-500" : "text-gray-400 hover:text-gray-600"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "variables" && (
          <div className="p-3 space-y-2">
            {/* Search */}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search variables..."
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-300" />

            {/* Variable list grouped by page */}
            {Object.entries(byPage).map(([page, vars]) => (
              <div key={page}>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-2 mb-1">{page}</p>
                <div className="space-y-0.5">
                  {vars.map(v => (
                    <button key={v.id} onClick={() => onInsertVariable(v)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-indigo-50 transition-colors group flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-800 truncate">{v.displayLabel}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{`{{${v.name}}}`}</p>
                      </div>
                      <span className="text-[9px] text-gray-300 group-hover:text-indigo-500 shrink-0 ml-1">Insert</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Computed/logic variables */}
            {computedVars.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-3 mb-1">Logic Variables</p>
                <div className="space-y-0.5">
                  {computedVars.map(v => (
                    <button key={v.id} onClick={() => onInsertVariable(v)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-purple-50 transition-colors group flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs text-purple-700 truncate">{v.displayLabel}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{`{{${v.name}}}`}</p>
                      </div>
                      <span className="text-[9px] text-gray-300 group-hover:text-purple-500 shrink-0 ml-1">Insert</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "conditionals" && (
          <div className="p-3 space-y-3">
            <p className="text-[10px] text-gray-400">Insert conditional blocks that show/hide content based on variable values.</p>

            {/* Quick boolean conditionals */}
            <div>
              <p className="text-[10px] font-medium text-gray-500 mb-1.5">Show/hide by boolean</p>
              <div className="space-y-1">
                {booleanVars.map(v => (
                  <div key={v.id} className="flex items-center gap-1">
                    <button onClick={() => onInsertConditional(v.name, "if")}
                      className="flex-1 text-left px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 text-xs hover:bg-indigo-50/30 transition-colors">
                      IF {v.displayLabel}
                    </button>
                    <button onClick={() => onInsertConditional(v.name, "ifelse")}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300 text-[10px] text-gray-500 hover:bg-indigo-50/30 transition-colors" title="Insert IF/ELSE block">
                      IF/ELSE
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom comparison */}
            <div className="border-t border-gray-200 pt-3">
              <p className="text-[10px] font-medium text-gray-500 mb-1.5">Custom condition</p>
              <div className="space-y-1.5">
                <select value={condVar} onChange={e => setCondVar(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none">
                  <option value="">Select variable...</option>
                  {variables.map(v => <option key={v.id} value={v.name}>{v.displayLabel}</option>)}
                </select>
                <div className="flex gap-1">
                  <select value={condOp} onChange={e => setCondOp(e.target.value)}
                    className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none">
                    <option value="==">equals</option>
                    <option value="!=">not equal</option>
                    <option value=">">greater</option>
                    <option value="<">less</option>
                  </select>
                  <input value={condVal} onChange={e => setCondVal(e.target.value)} placeholder="Value..."
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none" />
                </div>
                <button onClick={() => { if (condVar) onInsertComparison(condVar, condOp, condVal); }}
                  disabled={!condVar}
                  className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                  Insert condition block
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "repeating" && (
          <div className="p-3 space-y-3">
            <p className="text-[10px] text-gray-400">Insert repeating blocks that iterate over collection items (e.g., founders, beneficiaries).</p>

            {repeatingVars.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No repeating variables in this workflow.</p>
            ) : (
              <div className="space-y-2">
                {repeatingVars.map(v => {
                  const subs = subVars.filter(sv => sv.name.startsWith(v.name + ".$."));
                  const fields = subs.map(sv => sv.name.split(".$.")[1]);
                  const itemLabel = v.validation?.itemLabel || "Item";

                  return (
                    <div key={v.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-800">{v.displayLabel}</p>
                        <span className="text-[10px] text-gray-400">{itemLabel}</span>
                      </div>
                      {fields.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {fields.map(f => (
                            <span key={f} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{`this.${f}`}</span>
                          ))}
                        </div>
                      )}
                      <button onClick={() => onInsertRepeating(v.name, fields)}
                        className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                        Insert {`{{#each ${v.name}}}`} block
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "structure" && (
          <div className="p-3 space-y-3">
            <p className="text-[10px] text-gray-400">Tools for working with the template document.</p>

            <button onClick={onScan} disabled={!officeReady}
              className="w-full py-2 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              🔍 Scan document for variables
            </button>

            <button onClick={onUpload} disabled={!officeReady}
              className="w-full py-2 border border-indigo-200 rounded-lg text-xs text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 transition-colors">
              ☁️ Upload as template
            </button>

            <div className="border-t border-gray-200 pt-3 space-y-2">
              <p className="text-[10px] font-medium text-gray-500">Quick insert</p>
              <div className="grid grid-cols-2 gap-1.5">
                <QuickInsertBtn label="Page break" text="\n--- PAGE BREAK ---\n" ready={officeReady} />
                <QuickInsertBtn label="Date: today" text="{{today}}" ready={officeReady} />
                <QuickInsertBtn label="Index: @index" text="{{@index}}" ready={officeReady} />
                <QuickInsertBtn label="Signature line" text="\n_____________________________\n" ready={officeReady} />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <p className="text-[10px] font-medium text-gray-500 mb-1">Syntax reference</p>
              <div className="text-[10px] text-gray-500 space-y-1 font-mono bg-gray-900 text-green-400 rounded-lg p-3">
                <p>{`{{variable_name}}`} — insert value</p>
                <p>{`{{#if condition}}...{{/if}}`}</p>
                <p>{`{{#if x}}...{{else}}...{{/if}}`}</p>
                <p>{`{{#if x == 'y'}}...{{/if}}`}</p>
                <p>{`{{#each items}}...{{/each}}`}</p>
                <p>{`{{this.field}}`} — inside #each</p>
                <p>{`{{@index}}`} — item number</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quick Insert Button ──

function QuickInsertBtn({ label, text, ready }: { label: string; text: string; ready: boolean }) {
  const insert = async () => {
    if (!ready) return;
    try {
      await Word.run(async (context: any) => {
        const selection = context.document.getSelection();
        selection.insertText(text, "Replace");
        await context.sync();
      });
    } catch {}
  };

  return (
    <button onClick={insert} disabled={!ready}
      className="px-2 py-1.5 border border-gray-200 rounded-lg text-[10px] text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-left truncate">
      {label}
    </button>
  );
}

// ── Document Mode (for generated documents) ──

function DocumentMode({ metadata, officeReady, flash }: { metadata: any; officeReady: boolean; flash: (msg: string) => void }) {
  return (
    <div className="p-3 space-y-3">
      <div className="bg-green-50 border border-green-100 rounded-lg p-3">
        <p className="text-xs font-medium text-green-800">Document Mode</p>
        <p className="text-[10px] text-green-600 mt-0.5">This document was generated by Abbado Draft. Edits you make will be tracked.</p>
      </div>

      {metadata?.matterId && (
        <div className="text-xs text-gray-500">
          <p>Matter: <span className="font-mono text-gray-700">{metadata.matterId.slice(0, 8)}...</span></p>
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        Document Mode features (edit tracking, variable panel, sync) will be available in the next update. For now, edit freely and re-upload the document via the web app to track changes.
      </p>
    </div>
  );
}

// ── Helpers ──

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "https://abbado-draft-production.up.railway.app";
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("abbado_token") || null;
}
