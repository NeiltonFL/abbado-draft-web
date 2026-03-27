"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AddressInput } from "@/components/AddressInput";
import { PhoneInput } from "@/components/PhoneInput";

// ═══════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════

interface Question {
  id: string;
  name: string;
  displayLabel: string;
  type: string;
  required: boolean;
  defaultValue: string | null;
  validation: any;
  helpText: string | null;
  condition: string | null;
  groupName: string | null; // maps to a Page
  displayOrder: number;
  isComputed: boolean;
  expression: string | null;
  // Client-side only
  _isNew?: boolean;
  _isRepeating?: boolean;
  _repeatItemLabel?: string;
  _subQuestions?: Question[];
}

interface Page {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  condition: string | null;
}

const QUESTION_TYPES = [
  { value: "text", label: "Short Text", icon: "Aa", desc: "Single-line text" },
  { value: "rich_text", label: "Long Text", icon: "¶", desc: "Multi-line paragraph" },
  { value: "number", label: "Number", icon: "#", desc: "Integer or decimal" },
  { value: "currency", label: "Currency", icon: "$", desc: "Dollar amount" },
  { value: "percent", label: "Percentage", icon: "%", desc: "Percent value" },
  { value: "date", label: "Date", icon: "📅", desc: "Date picker" },
  { value: "boolean", label: "Yes / No", icon: "◉", desc: "Toggle choice" },
  { value: "dropdown", label: "Single Choice", icon: "▾", desc: "Pick one option" },
  { value: "multi_select", label: "Multiple Choice", icon: "☐", desc: "Pick many options" },
  { value: "email", label: "Email", icon: "@", desc: "Email address" },
  { value: "phone", label: "Phone", icon: "☎", desc: "Phone number" },
  { value: "address", label: "Address", icon: "⌂", desc: "Full mailing address" },
  { value: "state", label: "US State", icon: "🏛", desc: "State dropdown" },
  { value: "url", label: "Website", icon: "🔗", desc: "Web URL" },
  { value: "file_upload", label: "File Upload", icon: "📎", desc: "Upload a document" },
  { value: "info", label: "Info Block", icon: "ℹ", desc: "Display-only text (no input)" },
  { value: "repeating", label: "Repeating Item", icon: "↻", desc: "Collect a list (e.g. founders, assets)" },
  { value: "computed", label: "Calculation", icon: "ƒ", desc: "Auto-computed from other answers" },
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
  const [tab, setTab] = useState<string>("questions");
  const [saveMsg, setSaveMsg] = useState("");

  const reload = useCallback(async () => {
    const [w, t] = await Promise.all([api.getWorkflow(workflowId), api.getTemplates()]);
    setWorkflow(w);
    setAllTemplates(t);
  }, [workflowId]);

  useEffect(() => { reload().catch(console.error).finally(() => setLoading(false)); }, [reload]);

  if (loading) return <AppShell><div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div></AppShell>;
  if (!workflow) return <AppShell><p className="text-gray-500">Workflow not found</p></AppShell>;

  const questions: Question[] = workflow.variables || [];
  const pages: Page[] = workflow.interviewSections || [];
  const templates = workflow.templates || [];

  const flash = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(""), 2500); };

  const logicVars = questions.filter(q => q.isComputed || q.type === "computed");

  const TABS = [
    { key: "questions", label: "Questions", count: questions.filter(q => !q.isComputed && q.type !== "computed").length },
    { key: "pages", label: "Pages", count: pages.length },
    { key: "logic", label: "Logic", count: logicVars.length },
    { key: "documents", label: "Output Documents", count: templates.length },
    { key: "preview", label: "Preview" },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <Link href="/workflows" className="text-xs text-gray-400 hover:text-gray-600">← Workflows</Link>
            <h1 className="text-xl font-semibold text-gray-900 mt-1">{workflow.name}</h1>
            {workflow.description && <p className="text-sm text-gray-500 mt-0.5">{workflow.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && <span className={`text-xs ${saveMsg.includes("Error") ? "text-red-500" : "text-green-500"}`}>{saveMsg}</span>}
            <Link href={`/matters?workflowId=${workflowId}`} className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600">
              Run this workflow
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-5 text-xs">
          <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5">{questions.filter(q => !q.isComputed && q.type !== "computed").length} question{questions.length !== 1 ? "s" : ""}</span>
          <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5">{pages.length} page{pages.length !== 1 ? "s" : ""}</span>
          <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5">{logicVars.length} logic rule{logicVars.length !== 1 ? "s" : ""}</span>
          <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5">{templates.length} document{templates.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 mb-6 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm rounded-md transition-all ${tab === t.key ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}
              {t.count !== undefined && t.count > 0 && <span className="ml-1.5 text-[10px] opacity-50">{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === "questions" && <QuestionsTab workflowId={workflowId} questions={questions} pages={pages} onUpdate={reload} flash={flash} />}
        {tab === "pages" && <PagesTab workflowId={workflowId} pages={pages} questions={questions} onUpdate={reload} flash={flash} />}
        {tab === "logic" && <LogicTab workflowId={workflowId} questions={questions} onUpdate={reload} flash={flash} />}
        {tab === "documents" && <DocumentsTab workflowId={workflowId} templates={templates} allTemplates={allTemplates} questions={questions} onUpdate={reload} flash={flash} />}
        {tab === "preview" && <PreviewTab pages={pages} questions={questions} />}
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════════════════════════════════
// QUESTIONS TAB
// ═══════════════════════════════════════════════════════════

function QuestionsTab({ workflowId, questions, pages, onUpdate, flash }: {
  workflowId: string; questions: Question[]; pages: Page[]; onUpdate: () => Promise<void>; flash: (m: string) => void;
}) {
  const [items, setItems] = useState<Question[]>(questions);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    // Reconstitute: group Parent.$.field variables back under their parent
    const parents: Question[] = [];
    const subMap: Record<string, any[]> = {};

    for (const q of questions) {
      const dotDollar = q.name.match(/^(.+)\.\$\.(.+)$/);
      if (dotDollar) {
        const [, parentName, field] = dotDollar;
        if (!subMap[parentName]) subMap[parentName] = [];
        subMap[parentName].push({ field, label: q.displayLabel, type: q.type, required: q.required, helpText: q.helpText, validation: q.validation, condition: q.condition });
      } else {
        parents.push(q);
      }
    }

    // Attach sub-questions to their parent's validation
    for (const p of parents) {
      if (subMap[p.name]) {
        p.validation = { ...(p.validation || {}), subQuestions: subMap[p.name] };
      }
    }

    setItems(parents);
    setDirty(false);
  }, [questions]);

  const pageNames = pages.map(p => p.name);
  const add = (q: Question) => { setItems(p => [...p, q]); setDirty(true); setAdding(false); setEditing(q.id); };
  const update = (id: string, u: Partial<Question>) => { setItems(p => p.map(q => q.id === id ? { ...q, ...u } : q)); setDirty(true); };
  const remove = (id: string) => { if (!confirm("Delete this question?")) return; setItems(p => p.filter(q => q.id !== id)); setEditing(null); setDirty(true); };
  const move = (id: string, dir: -1 | 1) => {
    setItems(p => {
      const idx = p.findIndex(q => q.id === id);
      const ni = idx + dir;
      if (ni < 0 || ni >= p.length) return p;
      const n = [...p]; [n[idx], n[ni]] = [n[ni], n[idx]]; return n;
    });
    setDirty(true);
  };
  const duplicate = (id: string) => {
    const src = items.find(q => q.id === id);
    if (!src) return;
    const copy = { ...src, id: `new_${Date.now()}`, name: src.name + "_copy", displayLabel: src.displayLabel + " (copy)", _isNew: true };
    setItems(p => { const idx = p.findIndex(q => q.id === id); return [...p.slice(0, idx + 1), copy, ...p.slice(idx + 1)]; });
    setDirty(true);
  };

  const save = async () => {
    try {
      // Flatten: for each repeating item, emit the parent + all sub-questions as separate variables
      const flat: any[] = [];
      let order = 0;
      for (const q of items) {
        flat.push({
          name: q.name, displayLabel: q.displayLabel,
          type: q.type,
          required: q.required, defaultValue: q.defaultValue,
          validation: q.validation,
          helpText: q.helpText, condition: q.condition, groupName: q.groupName,
          displayOrder: order++, isComputed: q.type === "computed" || q.isComputed, expression: q.expression,
        });
        // Emit sub-questions for repeating items
        if (q.type === "repeating" && q.validation?.subQuestions) {
          for (const sq of q.validation.subQuestions) {
            flat.push({
              name: `${q.name}.$.${sq.field}`,
              displayLabel: sq.label,
              type: sq.type || "text",
              required: sq.required || false,
              defaultValue: null,
              validation: sq.validation || null,
              helpText: sq.helpText || null,
              condition: sq.condition || null,
              groupName: q.groupName, // same page as parent
              displayOrder: order++,
              isComputed: false, expression: null,
            });
          }
        }
      }
      await api.updateVariables(workflowId, flat);
      await onUpdate();
      setDirty(false);
      flash("Questions saved");
    } catch (err: any) { flash("Error: " + err.message); }
  };

  const ti = (type: string) => QUESTION_TYPES.find(t => t.value === type);

  // Page filter
  const [filterPage, setFilterPage] = useState<string | null>(null); // null = all

  // Drag and drop
  const [dragQuestionId, setDragQuestionId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null); // question id or "page:PageName"

  const onQuestionDragStart = (id: string) => setDragQuestionId(id);
  const onQuestionDragOver = (e: React.DragEvent, targetId: string) => { e.preventDefault(); setDropTargetId(targetId); };
  const onPageHeaderDragOver = (e: React.DragEvent, pageName: string) => { e.preventDefault(); setDropTargetId(`page:${pageName}`); };

  const onQuestionDrop = () => {
    if (!dragQuestionId || !dropTargetId) { resetQuestionDrag(); return; }

    if (dropTargetId.startsWith("page:")) {
      // Dropped onto a page header — reassign to that page
      const targetPage = dropTargetId.replace("page:", "");
      update(dragQuestionId, { groupName: targetPage === "Unassigned" ? null : targetPage });
    } else if (dragQuestionId !== dropTargetId) {
      // Dropped onto another question — reorder
      setItems(prev => {
        const fromIdx = prev.findIndex(q => q.id === dragQuestionId);
        const toIdx = prev.findIndex(q => q.id === dropTargetId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const item = prev[fromIdx];
        const next = [...prev];
        next.splice(fromIdx, 1);
        const newToIdx = next.findIndex(q => q.id === dropTargetId);
        // Also adopt the target's page if dragging between groups
        const targetPage = next[newToIdx]?.groupName;
        if (targetPage !== item.groupName) item.groupName = targetPage;
        next.splice(newToIdx, 0, item);
        return next;
      });
      setDirty(true);
    }
    resetQuestionDrag();
  };

  const resetQuestionDrag = () => { setDragQuestionId(null); setDropTargetId(null); };

  // Build page tree from pages (parse section metadata)
  const parsePageMeta = (p: Page): { section: string } => {
    if (p.description && p.description.startsWith("{")) {
      try { return { section: JSON.parse(p.description).section || "General" }; } catch {}
    }
    return { section: "General" };
  };
  const pageSections: Record<string, Page[]> = {};
  for (const p of pages) {
    const sec = parsePageMeta(p).section;
    if (!pageSections[sec]) pageSections[sec] = [];
    pageSections[sec].push(p);
  }

  const filteredItems = filterPage ? items.filter(q => q.groupName === filterPage) : items;
  const filteredGroups = groupBy(filteredItems, q => q.groupName || "Unassigned");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Questions</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Questions collect data from the user. Assign each question to a <strong>Page</strong> to control which step it appears on.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAdding(true)} className="px-3 py-1.5 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-600">+ Add question</button>
          {dirty && <button onClick={save} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Save all</button>}
        </div>
      </div>

      {items.length === 0 ? (
        <Empty title="No questions yet" desc="Questions are the fields your users fill in. Each answer feeds into your document templates." action="Add your first question" onAction={() => setAdding(true)} />
      ) : (
        <div className="flex gap-4">
          {/* ── Left: Page filter sidebar ── */}
          <div className="w-56 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
              <div className="p-2.5 border-b border-gray-100">
                <button onClick={() => setFilterPage(null)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${!filterPage ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                  All questions <span className="float-right text-gray-400">{items.length}</span>
                </button>
              </div>
              <div className="p-2 space-y-0.5 max-h-[60vh] overflow-y-auto">
                {Object.entries(pageSections).map(([sec, secPages]) => (
                  <div key={sec}>
                    <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-2.5 pt-2 pb-0.5">{sec}</p>
                    {secPages.map(p => {
                      const count = items.filter(q => q.groupName === p.name).length;
                      return (
                        <button key={p.id} onClick={() => setFilterPage(filterPage === p.name ? null : p.name)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-1 ${filterPage === p.name ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                          <span className="truncate">{p.name}</span>
                          <span className={`shrink-0 ${count > 0 ? "text-gray-400" : "text-gray-300"}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
                {/* Unassigned */}
                {items.some(q => !q.groupName || !pageNames.includes(q.groupName)) && (
                  <div>
                    <p className="text-[9px] font-semibold text-amber-500 uppercase tracking-wider px-2.5 pt-2 pb-0.5">Unassigned</p>
                    <button onClick={() => setFilterPage("__unassigned__")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-1 ${filterPage === "__unassigned__" ? "bg-amber-50 text-amber-700 font-medium" : "text-amber-600 hover:bg-amber-50/50"}`}>
                      <span>No page assigned</span>
                      <span>{items.filter(q => !q.groupName || !pageNames.includes(q.groupName)).length}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Question list ── */}
          <div className="flex-1 min-w-0">
            {filterPage && (
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-brand-600 font-medium">
                  Showing: {filterPage === "__unassigned__" ? "Unassigned questions" : filterPage}
                  <span className="text-gray-400 font-normal"> ({(filterPage === "__unassigned__" ? items.filter(q => !q.groupName || !pageNames.includes(q.groupName)) : filteredItems).length})</span>
                </span>
                <button onClick={() => setFilterPage(null)} className="text-[10px] text-gray-400 hover:text-gray-600">Show all</button>
              </div>
            )}
            <div className="space-y-6">
              {Object.entries(filterPage === "__unassigned__" ? { "Unassigned": items.filter(q => !q.groupName || !pageNames.includes(q.groupName)) } : filteredGroups).map(([pageName, qs]) => (
                <div key={pageName}>
                  <div
                    className={`flex items-center gap-2 mb-2 rounded-lg px-1 py-0.5 transition-colors ${dropTargetId === `page:${pageName}` ? "bg-brand-50 ring-1 ring-brand-300" : ""}`}
                    onDragOver={(e) => onPageHeaderDragOver(e, pageName)}
                    onDrop={onQuestionDrop}
                  >
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{pageName}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">{qs.length}</span>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
                    {qs.map((q) => (
                      <QuestionRow key={q.id} q={q} ti={ti} isEditing={editing === q.id}
                        onToggle={() => setEditing(editing === q.id ? null : q.id)}
                        onUpdate={(u) => update(q.id, u)} onRemove={() => remove(q.id)}
                        onMove={(d) => move(q.id, d)} onDuplicate={() => duplicate(q.id)}
                        allQuestions={items} pageNames={pageNames}
                        isDragOver={dropTargetId === q.id}
                        onDragStart={() => onQuestionDragStart(q.id)}
                        onDragOver={(e) => onQuestionDragOver(e, q.id)}
                        onDrop={onQuestionDrop}
                        onDragEnd={resetQuestionDrag} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {dirty && <SaveBar onSave={save} />}
      {adding && <AddQuestionModal onAdd={add} onClose={() => setAdding(false)} pageNames={pageNames} allQuestions={items} />}
    </div>
  );
}

// ── Question Row ──

function QuestionRow({ q, ti, isEditing, onToggle, onUpdate, onRemove, onMove, onDuplicate, allQuestions, pageNames, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }: {
  q: Question; ti: (t: string) => any; isEditing: boolean;
  onToggle: () => void; onUpdate: (u: Partial<Question>) => void; onRemove: () => void;
  onMove: (d: -1 | 1) => void; onDuplicate: () => void;
  allQuestions: Question[]; pageNames: string[];
  isDragOver?: boolean; onDragStart?: () => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: () => void; onDragEnd?: () => void;
}) {
  const typeInfo = ti(q.type);
  const ic = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

  return (
    <div>
      {/* Collapsed */}
      <div
        draggable={!isEditing}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors ${isEditing ? "bg-brand-50/30 cursor-default" : "cursor-grab"} ${isDragOver ? "ring-1 ring-brand-400 bg-brand-50/20" : ""}`}
        onClick={onToggle}
      >
        <div className="flex flex-col gap-px opacity-30 hover:opacity-100" onClick={e => { e.stopPropagation(); }}>
          <button onClick={() => onMove(-1)} className="text-[10px] leading-none">▲</button>
          <button onClick={() => onMove(1)} className="text-[10px] leading-none">▼</button>
        </div>
        <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center text-xs shrink-0" title={typeInfo?.label}>{typeInfo?.icon || "?"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{q.displayLabel || q.name}</span>
            {q.required && <span className="text-red-400 text-[10px]">required</span>}
            {q.condition && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">conditional</span>}
            {q.isComputed && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">computed</span>}
          </div>
          <p className="text-xs text-gray-400 font-mono truncate">{q.name}</p>
        </div>
        <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{typeInfo?.label || q.type}</span>
        <span className="text-gray-300 text-xs">{isEditing ? "▾" : "▸"}</span>
      </div>

      {/* Expanded editor */}
      {isEditing && (
        <div className="px-4 py-5 bg-gray-50/80 border-t border-gray-100 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Identity */}
            <div className="space-y-3">
              <Field label="Question label" sub="What the user sees">
                <input value={q.displayLabel} onChange={e => onUpdate({ displayLabel: e.target.value })} className={ic} placeholder="e.g., What is the company's legal name?" />
              </Field>
              <Field label="Variable name" sub="Used in templates as {{name}}">
                <input value={q.name} onChange={e => onUpdate({ name: e.target.value })} className={`${ic} font-mono text-xs`} />
              </Field>
              <Field label="Type">
                <select value={q.type} onChange={e => onUpdate({ type: e.target.value })} className={ic}>
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label} — {t.desc}</option>)}
                </select>
              </Field>
              <Field label="Page" sub="Which interview step this appears on">
                <input value={q.groupName || ""} onChange={e => onUpdate({ groupName: e.target.value || null })} list={`pages-${q.id}`} className={ic} placeholder="e.g., Company Information" />
                <datalist id={`pages-${q.id}`}>{pageNames.map(p => <option key={p} value={p} />)}</datalist>
              </Field>
            </div>

            {/* Right: Config + Logic */}
            <div className="space-y-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={q.required} onChange={e => onUpdate({ required: e.target.checked })} className="rounded border-gray-300" />
                  Required
                </label>
              </div>
              <Field label="Help text" sub="Guidance shown below the question">
                <input value={q.helpText || ""} onChange={e => onUpdate({ helpText: e.target.value || null })} className={ic} placeholder="e.g., Must match your Certificate of Incorporation exactly" />
              </Field>
              <Field label="Default value">
                <input value={q.defaultValue || ""} onChange={e => onUpdate({ defaultValue: e.target.value || null })} className={ic} placeholder="Pre-filled answer" />
              </Field>

              {/* Type-specific config */}
              <TypeConfig q={q} onUpdate={onUpdate} ic={ic} allQuestions={allQuestions} />
            </div>
          </div>

          {/* Question Logic */}
          <div className="pt-3 border-t border-gray-200">
            <Field label="Question logic" sub="Only show this question when a condition is met">
              <ConditionBuilder condition={q.condition || ""} questions={allQuestions.filter(aq => aq.id !== q.id)} onChange={val => onUpdate({ condition: val || null })} />
            </Field>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
            <button onClick={onDuplicate} className="text-xs text-gray-400 hover:text-gray-600">Duplicate</button>
            <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">Delete question</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADD QUESTION MODAL
// ═══════════════════════════════════════════════════════════

function AddQuestionModal({ onAdd, onClose, pageNames, allQuestions }: {
  onAdd: (q: Question) => void; onClose: () => void; pageNames: string[]; allQuestions: Question[];
}) {
  const [step, setStep] = useState<"type" | "config">("type");
  const [type, setType] = useState("");
  const [label, setLabel] = useState("");
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [page, setPage] = useState(pageNames[0] || "");
  const [required, setRequired] = useState(false);

  useEffect(() => {
    if (!nameEdited && label) setName(label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  }, [label, nameEdited]);

  const nameTaken = allQuestions.some(q => q.name === name);
  const ic = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none";

  if (step === "type") {
    return (
      <Modal onClose={onClose} title="Add a question" subtitle="Choose the type of data you want to collect">
        <div className="grid grid-cols-3 gap-2 mt-2">
          {QUESTION_TYPES.map(t => (
            <button key={t.value} onClick={() => { setType(t.value); setStep("config"); }}
              className="p-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50/30 text-left transition-all group">
              <span className="text-lg block">{t.icon}</span>
              <span className="text-sm font-medium text-gray-900 block mt-1">{t.label}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5 leading-tight">{t.desc}</span>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  const typeInfo = QUESTION_TYPES.find(t => t.value === type)!;

  return (
    <Modal onClose={onClose} title={`New ${typeInfo.label} question`} subtitle={typeInfo.desc}>
      <div className="space-y-4 mt-3">
        <Field label="Question label" sub="What the user sees in the interview">
          <input value={label} onChange={e => setLabel(e.target.value)} className={ic} autoFocus placeholder={
            type === "text" ? "What is the company's legal name?" :
            type === "boolean" ? "Will shares vest?" :
            type === "dropdown" ? "What type of entity is this?" :
            type === "date" ? "When should the entity be formed?" :
            type === "repeating" ? "Add a founder" :
            "Enter your question..."
          } />
        </Field>
        <Field label="Variable name" sub={`Used in templates as {{${name || "variable_name"}}}`}>
          <input value={name} onChange={e => { setName(e.target.value); setNameEdited(true); }} className={`${ic} font-mono`} />
          {nameTaken && <p className="text-xs text-red-500 mt-0.5">Already in use</p>}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Page">
            <input value={page} onChange={e => setPage(e.target.value)} list="add-q-pages" className={ic} placeholder="e.g., Company Info" />
            <datalist id="add-q-pages">{pageNames.map(p => <option key={p} value={p} />)}</datalist>
          </Field>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className="rounded border-gray-300" />
              Required
            </label>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-6">
        <button onClick={() => setStep("type")} className="text-sm text-gray-500 hover:text-gray-700">← Change type</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button disabled={!label || !name || nameTaken} onClick={() => onAdd({
            id: `new_${Date.now()}`, name, displayLabel: label, type, required,
            defaultValue: null, validation: null, helpText: null, condition: null,
            groupName: page || null, displayOrder: allQuestions.length, isComputed: type === "computed",
            expression: null, _isNew: true,
          })} className="px-5 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-40">
            Add question
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGES TAB
// ═══════════════════════════════════════════════════════════

function PagesTab({ workflowId, pages, questions, onUpdate, flash }: {
  workflowId: string; pages: Page[]; questions: Question[]; onUpdate: () => Promise<void>; flash: (m: string) => void;
}) {
  // Parse section info from page descriptions (stored as JSON: {"section":"name","text":"desc"})
  const parsePageMeta = (p: Page): { section: string; text: string } => {
    if (p.description && p.description.startsWith("{")) {
      try { const d = JSON.parse(p.description); return { section: d.section || "General", text: d.text || "" }; } catch {}
    }
    return { section: "General", text: p.description || "" };
  };

  const encodePageMeta = (section: string, text: string): string => JSON.stringify({ section, text });

  const [items, setItems] = useState<(Page & { _section: string; _text: string })[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null); // page id
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  // Drag and drop state
  const [dragType, setDragType] = useState<"section" | "page" | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const onDragStartSection = (sec: string) => { setDragType("section"); setDragId(sec); };
  const onDragStartPage = (pageId: string) => { setDragType("page"); setDragId(pageId); };

  const onDragOverSection = (e: React.DragEvent, sec: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragType === "page" ? "move" : "move";
    setDropTarget(`sec:${sec}`);
  };

  const onDragOverPage = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(`page:${pageId}`);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId || !dropTarget) { resetDrag(); return; }

    if (dragType === "section" && dropTarget.startsWith("sec:")) {
      const targetSec = dropTarget.replace("sec:", "");
      if (dragId !== targetSec) {
        setSections(prev => {
          const from = prev.indexOf(dragId);
          const to = prev.indexOf(targetSec);
          if (from === -1 || to === -1) return prev;
          const next = [...prev];
          next.splice(from, 1);
          next.splice(to, 0, dragId);
          return next;
        });
        setDirty(true);
      }
    } else if (dragType === "page") {
      if (dropTarget.startsWith("sec:")) {
        // Drop page onto section = move to that section
        const targetSec = dropTarget.replace("sec:", "");
        movePageToSection(dragId, targetSec);
      } else if (dropTarget.startsWith("page:")) {
        // Drop page onto another page = reorder
        const targetPageId = dropTarget.replace("page:", "");
        if (dragId !== targetPageId) {
          setItems(prev => {
            const from = prev.findIndex(p => p.id === dragId);
            const to = prev.findIndex(p => p.id === targetPageId);
            if (from === -1 || to === -1) return prev;
            const item = prev[from];
            const targetSection = prev[to]._section;
            const next = [...prev];
            next.splice(from, 1);
            const newTo = next.findIndex(p => p.id === targetPageId);
            next.splice(newTo, 0, { ...item, _section: targetSection });
            return next;
          });
          setDirty(true);
        }
      }
    }
    resetDrag();
  };

  const resetDrag = () => { setDragType(null); setDragId(null); setDropTarget(null); };

  // Load and parse
  useEffect(() => {
    const parsed = pages.map(p => {
      const meta = parsePageMeta(p);
      return { ...p, _section: meta.section, _text: meta.text };
    });
    setItems(parsed);

    // Extract unique sections in order
    const seen = new Set<string>();
    const secs: string[] = [];
    for (const p of parsed) { if (!seen.has(p._section)) { seen.add(p._section); secs.push(p._section); } }
    if (secs.length === 0) secs.push("General");
    setSections(secs);
    setDirty(false);
  }, [pages]);

  const questionGroups = Array.from(new Set(questions.map(q => q.groupName).filter(Boolean))) as string[];

  // Section operations
  const addSection = (name: string) => {
    if (!name.trim() || sections.includes(name.trim())) return;
    setSections(s => [...s, name.trim()]);
    setAddingSection(false);
    setNewSectionName("");
    setDirty(true);
  };

  const renameSection = (old: string, newName: string) => {
    if (!newName.trim() || (newName !== old && sections.includes(newName))) return;
    setSections(s => s.map(n => n === old ? newName.trim() : n));
    setItems(p => p.map(pg => pg._section === old ? { ...pg, _section: newName.trim() } : pg));
    if (selectedSection === old) setSelectedSection(newName.trim());
    setDirty(true);
  };

  const removeSection = (name: string) => {
    const pagesInSection = items.filter(p => p._section === name);
    if (pagesInSection.length > 0 && !confirm(`Delete section "${name}" and its ${pagesInSection.length} page(s)?`)) return;
    setSections(s => s.filter(n => n !== name));
    setItems(p => p.filter(pg => pg._section !== name));
    if (selectedSection === name) setSelectedSection(null);
    setDirty(true);
  };

  const moveSection = (name: string, dir: -1 | 1) => {
    setSections(s => {
      const i = s.indexOf(name);
      const ni = i + dir;
      if (ni < 0 || ni >= s.length) return s;
      const n = [...s]; [n[i], n[ni]] = [n[ni], n[i]]; return n;
    });
    setDirty(true);
  };

  // Page operations
  const addPage = (sectionName: string) => {
    const pageName = `New Page ${items.length + 1}`;
    const newPage = { id: `new_${Date.now()}`, name: pageName, description: null, displayOrder: items.length, condition: null, _section: sectionName, _text: "" };
    setItems(p => [...p, newPage]);
    setSelected(newPage.id);
    setSelectedSection(null);
    setDirty(true);
  };

  const updatePage = (id: string, updates: Partial<Page & { _section: string; _text: string }>) => {
    setItems(p => p.map(pg => pg.id === id ? { ...pg, ...updates } : pg));
    setDirty(true);
  };

  const removePage = (id: string) => {
    setItems(p => p.filter(pg => pg.id !== id));
    if (selected === id) setSelected(null);
    setDirty(true);
  };

  const movePage = (id: string, dir: -1 | 1) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === id);
      const sectionPages = prev.filter(p => p._section === prev[idx]._section);
      const sIdx = sectionPages.findIndex(p => p.id === id);
      const nsi = sIdx + dir;
      if (nsi < 0 || nsi >= sectionPages.length) return prev;
      // Swap within the full array
      const otherId = sectionPages[nsi].id;
      const ai = prev.findIndex(p => p.id === id);
      const bi = prev.findIndex(p => p.id === otherId);
      const next = [...prev];
      [next[ai], next[bi]] = [next[bi], next[ai]];
      return next;
    });
    setDirty(true);
  };

  const movePageToSection = (pageId: string, newSection: string) => {
    setItems(p => p.map(pg => pg.id === pageId ? { ...pg, _section: newSection } : pg));
    setDirty(true);
  };

  const autoGen = () => {
    const secs = questionGroups.length > 0 ? ["General"] : ["General"];
    const newPages = questionGroups.map((g, i) => ({
      id: `auto_${Date.now()}_${i}`, name: g, description: null, displayOrder: i, condition: null, _section: "General", _text: "",
    }));
    setSections(["General"]);
    setItems(newPages);
    setDirty(true);
  };

  // Save
  const save = async () => {
    try {
      const token = (await (await import("@/lib/supabase")).supabase.auth.getSession()).data.session?.access_token;

      // Build ordered list: pages ordered by section order, then by position within section
      const ordered: any[] = [];
      let displayOrder = 0;
      for (const sec of sections) {
        const sectionPages = items.filter(p => p._section === sec);
        for (const p of sectionPages) {
          ordered.push({ name: p.name, description: encodePageMeta(p._section, p._text), displayOrder: displayOrder++, condition: p.condition });
        }
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://abbado-draft-production.up.railway.app"}/api/workflows/${workflowId}/interview`, {
        method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ sections: ordered }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await onUpdate(); setDirty(false); flash("Structure saved");
    } catch (err: any) { flash("Error: " + err.message); }
  };

  // Selected item
  const selectedPage = selected ? items.find(p => p.id === selected) : null;
  const selectedPageQuestions = selectedPage ? questions.filter(q => q.groupName === selectedPage.name) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Sections &amp; Pages</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            <strong>Sections</strong> are broad categories in the progress sidebar. <strong>Pages</strong> are individual screens within a section.
            Questions are assigned to pages via their &ldquo;Page&rdquo; field.
          </p>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && questionGroups.length > 0 && (
            <button onClick={autoGen} className="px-3 py-1.5 border border-brand-200 text-brand-700 rounded-lg text-sm hover:bg-brand-50">Auto-generate</button>
          )}
          {dirty && <button onClick={save} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Save structure</button>}
        </div>
      </div>

      {items.length === 0 && sections.length <= 1 && items.length === 0 ? (
        <Empty title="No interview structure" desc="Create sections to organize the interview, then add pages within each section." action="Get started" onAction={() => { addSection("General"); addPage("General"); }} />
      ) : (
        <div className="flex gap-4" style={{ minHeight: 500 }}>
          {/* ── Left: Section / Page Tree ── */}
          <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Structure</span>
              <button onClick={() => setAddingSection(true)} className="text-[10px] text-brand-600 hover:text-brand-700 font-medium">+ Section</button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sections.map((sec) => {
                const secPages = items.filter(p => p._section === sec);
                const isSelSec = selectedSection === sec && !selected;
                return (
                  <div key={sec}>
                    {/* Section header */}
                    <div
                      draggable
                      onDragStart={() => onDragStartSection(sec)}
                      onDragOver={(e) => onDragOverSection(e, sec)}
                      onDrop={onDrop}
                      onDragEnd={resetDrag}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-grab group transition-colors ${isSelSec ? "bg-brand-50 ring-1 ring-brand-300" : dropTarget === `sec:${sec}` ? "bg-brand-50 ring-1 ring-brand-300 ring-dashed" : "hover:bg-gray-50"}`}
                      onClick={() => { setSelectedSection(sec); setSelected(null); }}
                    >
                      <div className="flex flex-col gap-px opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                        <button onClick={() => moveSection(sec, -1)} className="text-[8px] leading-none text-gray-400 hover:text-gray-600">▲</button>
                        <button onClick={() => moveSection(sec, 1)} className="text-[8px] leading-none text-gray-400 hover:text-gray-600">▼</button>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{sec}</span>
                      <span className="text-[10px] text-gray-400">{secPages.length}</span>
                      <button onClick={(e) => { e.stopPropagation(); addPage(sec); }} className="text-[10px] text-brand-500 hover:text-brand-700 opacity-0 group-hover:opacity-100" title="Add page">+</button>
                    </div>

                    {/* Pages in this section */}
                    {secPages.map((p, pi) => {
                      const pqs = questions.filter(q => q.groupName === p.name);
                      const isSel = selected === p.id;
                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={() => onDragStartPage(p.id)}
                          onDragOver={(e) => onDragOverPage(e, p.id)}
                          onDrop={onDrop}
                          onDragEnd={resetDrag}
                          className={`flex items-center gap-1.5 ml-5 px-2 py-1.5 rounded-lg cursor-grab group transition-colors ${isSel ? "bg-brand-50 ring-1 ring-brand-300" : dropTarget === `page:${p.id}` ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-gray-50"}`}
                          onClick={() => { setSelected(p.id); setSelectedSection(null); }}
                        >
                          <div className="flex flex-col gap-px opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                            <button onClick={() => movePage(p.id, -1)} className="text-[8px] leading-none text-gray-400 hover:text-gray-600">▲</button>
                            <button onClick={() => movePage(p.id, 1)} className="text-[8px] leading-none text-gray-400 hover:text-gray-600">▼</button>
                          </div>
                          <span className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center text-[9px] text-gray-500 shrink-0">{pi + 1}</span>
                          <span className={`text-xs flex-1 truncate ${isSel ? "text-brand-700 font-medium" : "text-gray-600"}`}>{p.name}</span>
                          <span className="text-[9px] text-gray-300">{pqs.length}Q</span>
                          {p.condition && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" title="Has page logic" />}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Add section inline */}
              {addingSection && (
                <div className="flex gap-1 px-2 mt-1">
                  <input value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addSection(newSectionName); if (e.key === "Escape") setAddingSection(false); }}
                    className="flex-1 px-2 py-1 border border-brand-300 rounded text-xs outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="Section name" autoFocus />
                  <button onClick={() => addSection(newSectionName)} className="text-xs text-brand-600 font-medium">Add</button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Detail Panel ── */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5 overflow-y-auto">
            {selectedPage ? (
              <PageEditor
                page={selectedPage}
                questions={selectedPageQuestions}
                allQuestions={questions}
                sections={sections}
                onUpdate={(u) => updatePage(selectedPage.id, u)}
                onRemove={() => removePage(selectedPage.id)}
                onMoveToSection={(sec) => movePageToSection(selectedPage.id, sec)}
              />
            ) : selectedSection ? (
              <SectionEditor
                name={selectedSection}
                pages={items.filter(p => p._section === selectedSection)}
                questions={questions}
                onRename={(n) => renameSection(selectedSection, n)}
                onRemove={() => removeSection(selectedSection)}
                onAddPage={() => addPage(selectedSection)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <p className="text-gray-400">Select a section or page from the left panel</p>
                  <p className="text-xs text-gray-300 mt-1">Or create a new section to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {dirty && <SaveBar onSave={save} />}
    </div>
  );
}

// ── Page Editor (right panel) ──

function PageEditor({ page, questions: pageQuestions, allQuestions, sections, onUpdate, onRemove, onMoveToSection }: {
  page: any; questions: Question[]; allQuestions: Question[]; sections: string[];
  onUpdate: (u: any) => void; onRemove: () => void; onMoveToSection: (sec: string) => void;
}) {
  const ic = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Page Settings</h3>
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">Delete page</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Page name" sub="Shown as the heading when this page is active">
          <input value={page.name} onChange={e => onUpdate({ name: e.target.value })} className={ic} />
        </Field>
        <Field label="Section" sub="Which section this page belongs to">
          <select value={page._section} onChange={e => onMoveToSection(e.target.value)} className={ic}>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description" sub="Optional text shown below the page heading">
        <textarea value={page._text || ""} onChange={e => onUpdate({ _text: e.target.value })} className={`${ic} h-16 resize-y`} placeholder="Help the user understand what this page is about" />
      </Field>

      {/* Page Logic */}
      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-amber-700">Page Logic</span>
          {page.condition && <button onClick={() => onUpdate({ condition: null })} className="text-[10px] text-amber-400 hover:text-amber-600">Clear</button>}
        </div>
        <p className="text-[10px] text-amber-600 mb-2">Only show this entire page when a condition is met. Leave empty to always show.</p>
        <ConditionBuilder condition={page.condition || ""} questions={allQuestions} onChange={val => onUpdate({ condition: val || null })} />
      </div>

      {/* Questions on this page */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Questions on this page ({pageQuestions.length})</span>
        </div>
        {pageQuestions.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-200 rounded-xl text-center">
            <p className="text-xs text-gray-400">No questions assigned yet</p>
            <p className="text-[10px] text-gray-300 mt-0.5">Go to the Questions tab and set a question&apos;s &ldquo;Page&rdquo; to &ldquo;{page.name}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-1">
            {pageQuestions.map((q, i) => {
              const ti = QUESTION_TYPES.find(t => t.value === q.type);
              return (
                <div key={q.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-400">{i + 1}.</span>
                  <span className="w-5 h-5 bg-white rounded flex items-center justify-center text-[10px]">{ti?.icon}</span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{q.displayLabel}</span>
                  {q.required && <span className="text-[9px] text-red-400">req</span>}
                  {q.condition && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />}
                  <span className="text-[10px] text-gray-300">{ti?.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section Editor (right panel) ──

function SectionEditor({ name, pages: sectionPages, questions, onRename, onRemove, onAddPage }: {
  name: string; pages: any[]; questions: Question[];
  onRename: (n: string) => void; onRemove: () => void; onAddPage: () => void;
}) {
  const [editName, setEditName] = useState(name);
  useEffect(() => setEditName(name), [name]);

  const totalQuestions = sectionPages.reduce((sum, p) => sum + questions.filter(q => q.groupName === p.name).length, 0);
  const ic = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Section Settings</h3>
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">Delete section</button>
      </div>

      <Field label="Section name" sub="Shown in the progress sidebar during the interview">
        <input value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => onRename(editName)} onKeyDown={e => { if (e.key === "Enter") onRename(editName); }} className={ic} />
      </Field>

      <div className="flex gap-4 text-sm text-gray-500">
        <span>{sectionPages.length} page{sectionPages.length !== 1 ? "s" : ""}</span>
        <span>{totalQuestions} question{totalQuestions !== 1 ? "s" : ""} total</span>
      </div>

      {/* Pages in this section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Pages in this section</span>
          <button onClick={onAddPage} className="text-[10px] text-brand-600 hover:text-brand-700 font-medium">+ Add page</button>
        </div>
        {sectionPages.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-200 rounded-xl text-center">
            <p className="text-xs text-gray-400">No pages in this section yet</p>
            <button onClick={onAddPage} className="text-xs text-brand-500 mt-1">Add a page</button>
          </div>
        ) : (
          <div className="space-y-1">
            {sectionPages.map((p, i) => {
              const pqs = questions.filter(q => q.groupName === p.name);
              return (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="w-5 h-5 bg-brand-50 text-brand-700 rounded flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-400">{pqs.length} Q</span>
                  {p.condition && <span className="text-[9px] text-amber-500">conditional</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* What users see */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-700 font-medium">What the end user sees</p>
        <p className="text-[10px] text-blue-600 mt-1">
          &ldquo;{name}&rdquo; appears in the progress sidebar as a broad category.
          When the user reaches this section, they step through its {sectionPages.length} page{sectionPages.length !== 1 ? "s" : ""} one at a time.
          {sectionPages.length > 0 && ` First page: "${sectionPages[0].name}".`}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOGIC TAB (Hidden Variables)
// ═══════════════════════════════════════════════════════════

interface LogicRule {
  condition: string; // JSON condition data
  value: string; // output value when condition is true
}

interface LogicConfig {
  logicType: "conditional" | "formula" | "lookup";
  rules?: LogicRule[];
  defaultValue?: string;
  formula?: string;
  lookupVariable?: string;
  lookupTable?: Record<string, string>;
  outputType?: string;
}

function LogicTab({ workflowId, questions, onUpdate, flash }: {
  workflowId: string; questions: Question[]; onUpdate: () => Promise<void>; flash: (m: string) => void;
}) {
  const visibleQuestions = questions.filter(q => !q.isComputed && q.type !== "computed" && !q.name.includes(".$." ));
  const logicVars = questions.filter(q => q.isComputed || q.type === "computed");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [items, setItems] = useState<Question[]>(logicVars);

  useEffect(() => { setItems(logicVars); setDirty(false); }, [questions]);

  const updateItem = (id: string, updates: Partial<Question>) => {
    setItems(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
    setDirty(true);
  };

  const removeItem = (id: string) => {
    if (!confirm("Delete this logic variable?")) return;
    setItems(prev => prev.filter(q => q.id !== id));
    setEditing(null);
    setDirty(true);
  };

  const addItem = (name: string, label: string, logicType: string) => {
    const id = `logic_${Date.now()}`;
    const newItem: Question = {
      id, name, displayLabel: label, type: "computed", required: false,
      defaultValue: null, validation: { logicType, rules: [], defaultValue: "", outputType: "text" },
      helpText: null, condition: null, groupName: null, displayOrder: 999,
      isComputed: true, expression: logicType === "formula" ? "" : null,
    };
    setItems(prev => [...prev, newItem]);
    setEditing(id);
    setAdding(false);
    setDirty(true);
  };

  const save = async () => {
    try {
      // Merge logic vars back into the full question list and save
      const nonLogic = questions.filter(q => !q.isComputed && q.type !== "computed");
      const all = [...nonLogic, ...items].map((q, i) => ({
        name: q.name, displayLabel: q.displayLabel, type: q.type,
        required: q.required, defaultValue: q.defaultValue, validation: q.validation,
        helpText: q.helpText, condition: q.condition, groupName: q.groupName,
        displayOrder: i, isComputed: q.isComputed || q.type === "computed", expression: q.expression,
      }));
      await api.updateVariables(workflowId, all);
      await onUpdate();
      setDirty(false);
      flash("Logic saved");
    } catch (err: any) { flash("Error: " + err.message); }
  };

  const editingItem = editing ? items.find(q => q.id === editing) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Logic</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Hidden variables that are computed from interview answers. They never appear in the interview but are available in templates as <code className="bg-gray-100 px-1 rounded">{"{{variable_name}}"}</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAdding(true)} className="px-3 py-1.5 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-600">+ Add logic variable</button>
          {dirty && <button onClick={save} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Save all</button>}
        </div>
      </div>

      {items.length === 0 ? (
        <Empty
          title="No logic variables"
          desc="Create hidden variables computed from answers. Use them for pronouns, fee calculations, conditional text, date math, and more."
          action="Add your first logic variable"
          onAction={() => setAdding(true)}
        />
      ) : (
        <div className="flex gap-4" style={{ minHeight: 400 }}>
          {/* Left: Variable list */}
          <div className="w-64 shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hidden Variables</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {items.map(q => {
                const cfg = (q.validation || {}) as LogicConfig;
                const isSel = editing === q.id;
                return (
                  <button key={q.id} onClick={() => setEditing(q.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${isSel ? "bg-brand-50 ring-1 ring-brand-300" : "hover:bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{cfg.logicType === "conditional" ? "🔀" : cfg.logicType === "formula" ? "ƒ" : "📋"}</span>
                      <span className={`text-sm flex-1 truncate ${isSel ? "text-brand-700 font-medium" : "text-gray-700"}`}>{q.displayLabel}</span>
                    </div>
                    <span className="text-[9px] text-gray-300 font-mono ml-5">{q.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Editor */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5 overflow-y-auto">
            {editingItem ? (
              <LogicEditor
                item={editingItem}
                visibleQuestions={visibleQuestions}
                allQuestions={questions}
                onUpdate={(u) => updateItem(editingItem.id, u)}
                onRemove={() => removeItem(editingItem.id)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <p className="text-gray-400">Select a logic variable to edit</p>
                  <p className="text-xs text-gray-300 mt-1">Or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {dirty && <SaveBar onSave={save} />}

      {/* Add modal */}
      {adding && (
        <AddLogicModal onAdd={addItem} onClose={() => setAdding(false)} existingNames={items.map(q => q.name)} />
      )}
    </div>
  );
}

// ── Add Logic Modal ──

function AddLogicModal({ onAdd, onClose, existingNames }: {
  onAdd: (name: string, label: string, type: string) => void; onClose: () => void; existingNames: string[];
}) {
  const [label, setLabel] = useState("");
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [logicType, setLogicType] = useState("conditional");

  useEffect(() => {
    if (!nameEdited && label) setName(label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  }, [label, nameEdited]);

  const nameTaken = existingNames.includes(name);
  const ic = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none";

  const TYPES = [
    { value: "conditional", icon: "🔀", label: "Conditional Rules", desc: "IF gender is Male THEN \"he\", ELSE IF Female THEN \"she\", ELSE \"they\". Visual builder — no coding." },
    { value: "formula", icon: "ƒ", label: "Formula", desc: "Write expressions: total_shares * price_per_share, add_days(formation_date, 90), upper(company_name). For power users." },
    { value: "lookup", icon: "📋", label: "Lookup Table", desc: "Map values: state → filing fee. Delaware = $300, California = $800, New York = $200." },
  ];

  return (
    <Modal onClose={onClose} title="Add logic variable" subtitle="Create a hidden variable computed from interview answers">
      <div className="space-y-4 mt-4">
        <Field label="Label" sub="What this variable represents">
          <input value={label} onChange={e => setLabel(e.target.value)} className={ic} autoFocus placeholder='e.g., Pronoun, Filing Fee, Total Shares' />
        </Field>
        <Field label="Variable name" sub={`Used in templates as {{${name || "variable_name"}}}`}>
          <input value={name} onChange={e => { setName(e.target.value); setNameEdited(true); }} className={`${ic} font-mono`} />
          {nameTaken && <p className="text-xs text-red-500 mt-0.5">Already in use</p>}
        </Field>

        <Field label="Logic type">
          <div className="space-y-2 mt-1">
            {TYPES.map(t => (
              <label key={t.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${logicType === t.value ? "border-brand-400 bg-brand-50/30" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="logicType" value={t.value} checked={logicType === t.value} onChange={() => setLogicType(t.value)} className="mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-gray-900">{t.icon} {t.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
        <button disabled={!label || !name || nameTaken} onClick={() => onAdd(name, label, logicType)}
          className="px-5 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-40">
          Create
        </button>
      </div>
    </Modal>
  );
}

// ── Logic Editor (right panel) ──

function LogicEditor({ item, visibleQuestions, allQuestions, onUpdate, onRemove }: {
  item: Question; visibleQuestions: Question[]; allQuestions: Question[];
  onUpdate: (u: Partial<Question>) => void; onRemove: () => void;
}) {
  const cfg: LogicConfig = (item.validation || { logicType: "conditional" }) as LogicConfig;
  const setCfg = (updates: Partial<LogicConfig>) => onUpdate({ validation: { ...cfg, ...updates } });
  const ic = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">{item.displayLabel}</h3>
          <p className="text-xs text-gray-400 font-mono">{"{{" + item.name + "}}"}</p>
        </div>
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">Delete</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Label">
          <input value={item.displayLabel} onChange={e => onUpdate({ displayLabel: e.target.value })} className={ic} />
        </Field>
        <Field label="Variable name">
          <input value={item.name} onChange={e => onUpdate({ name: e.target.value })} className={`${ic} font-mono text-xs`} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Logic type">
          <select value={cfg.logicType} onChange={e => setCfg({ logicType: e.target.value as any })} className={ic}>
            <option value="conditional">🔀 Conditional Rules</option>
            <option value="formula">ƒ Formula</option>
            <option value="lookup">📋 Lookup Table</option>
          </select>
        </Field>
        <Field label="Output type">
          <select value={cfg.outputType || "text"} onChange={e => setCfg({ outputType: e.target.value })} className={ic}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">True / False</option>
            <option value="date">Date</option>
          </select>
        </Field>
      </div>

      <div className="border-t border-gray-200 pt-4">
        {cfg.logicType === "conditional" && (
          <ConditionalRulesEditor cfg={cfg} setCfg={setCfg} questions={visibleQuestions} />
        )}
        {cfg.logicType === "formula" && (
          <FormulaEditor item={item} cfg={cfg} setCfg={setCfg} onUpdate={onUpdate} questions={visibleQuestions} allQuestions={allQuestions} />
        )}
        {cfg.logicType === "lookup" && (
          <LookupEditor cfg={cfg} setCfg={setCfg} questions={visibleQuestions} />
        )}
      </div>
    </div>
  );
}

// ── Conditional Rules Editor (visual, no-code) ──

function ConditionalRulesEditor({ cfg, setCfg, questions }: {
  cfg: LogicConfig; setCfg: (u: Partial<LogicConfig>) => void; questions: Question[];
}) {
  const rules = cfg.rules || [];

  const addRule = () => setCfg({ rules: [...rules, { condition: "", value: "" }] });
  const updateRule = (i: number, u: Partial<LogicRule>) => {
    const next = [...rules]; next[i] = { ...next[i], ...u }; setCfg({ rules: next });
  };
  const removeRule = (i: number) => setCfg({ rules: rules.filter((_, j) => j !== i) });
  const moveRule = (i: number, dir: -1 | 1) => {
    const ni = i + dir; if (ni < 0 || ni >= rules.length) return;
    const next = [...rules]; [next[i], next[ni]] = [next[ni], next[i]]; setCfg({ rules: next });
  };

  const ic = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600">Conditional Rules</p>
          <p className="text-[10px] text-gray-400">Rules are evaluated top to bottom. First match wins.</p>
        </div>
      </div>

      {rules.map((rule, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2 group hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-px opacity-0 group-hover:opacity-100">
                <button type="button" onClick={() => moveRule(i, -1)} className="text-[9px] text-gray-400">▲</button>
                <button type="button" onClick={() => moveRule(i, 1)} className="text-[9px] text-gray-400">▼</button>
              </div>
              <span className={`text-xs font-bold ${i === 0 ? "text-blue-600" : "text-amber-600"}`}>
                {i === 0 ? "IF" : "ELSE IF"}
              </span>
            </div>
            <button type="button" onClick={() => removeRule(i)} className="text-[10px] text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100">Remove</button>
          </div>

          {/* Condition */}
          <ConditionBuilder condition={rule.condition} questions={questions} onChange={val => updateRule(i, { condition: val })} />

          {/* Output value */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <span className="text-xs text-green-600 font-bold shrink-0">THEN →</span>
            <input value={rule.value} onChange={e => updateRule(i, { value: e.target.value })} className={`${ic} flex-1`} placeholder="Output value" />
          </div>
        </div>
      ))}

      {/* Default / ELSE */}
      <div className="rounded-xl border border-dashed border-gray-300 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">ELSE →</span>
          <input value={cfg.defaultValue || ""} onChange={e => setCfg({ defaultValue: e.target.value })} className={`${ic} flex-1`} placeholder="Default value (when no rules match)" />
        </div>
      </div>

      <button type="button" onClick={addRule} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
        + Add {rules.length > 0 ? "ELSE IF" : "IF"} rule
      </button>

      {/* Preview */}
      {(rules.length > 0 || cfg.defaultValue) && (
        <div className="p-3 bg-gray-50 rounded-xl mt-2">
          <p className="text-[10px] font-medium text-gray-500 mb-1">Reads as:</p>
          <div className="text-xs text-gray-700 space-y-0.5">
            {rules.map((r, i) => (
              <p key={i}><span className="font-bold text-blue-600">{i === 0 ? "IF" : "ELSE IF"}</span> {r.condition ? "conditions met" : "..."} <span className="font-bold text-green-600">→</span> &ldquo;{r.value || "..."}&rdquo;</p>
            ))}
            {cfg.defaultValue && <p><span className="font-bold text-gray-500">ELSE</span> <span className="font-bold text-green-600">→</span> &ldquo;{cfg.defaultValue}&rdquo;</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formula Editor (power user, code) ──

function FormulaEditor({ item, cfg, setCfg, onUpdate, questions, allQuestions }: {
  item: Question; cfg: LogicConfig; setCfg: (u: Partial<LogicConfig>) => void;
  onUpdate: (u: Partial<Question>) => void; questions: Question[]; allQuestions: Question[];
}) {
  const ic = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">Formula</p>
        <p className="text-[10px] text-gray-400 mb-2">Write an expression using variable names, math operators, and functions.</p>
        <textarea
          value={item.expression || cfg.formula || ""}
          onChange={e => { onUpdate({ expression: e.target.value }); setCfg({ formula: e.target.value }); }}
          className={`${ic} h-28 font-mono text-xs resize-y`}
          placeholder={'e.g., total_shares * price_per_share\ne.g., upper(company_name)\ne.g., add_days(formation_date, 90)'}
        />
      </div>

      {/* Available variables */}
      <div>
        <p className="text-[10px] text-gray-500 mb-1">Click a variable to insert:</p>
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
          {questions.map(q => (
            <button key={q.id} type="button" onClick={() => {
              const cur = item.expression || cfg.formula || "";
              const updated = cur + (cur ? " " : "") + q.name;
              onUpdate({ expression: updated });
              setCfg({ formula: updated });
            }} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded hover:bg-brand-50 hover:text-brand-600">
              {q.name}
            </button>
          ))}
        </div>
      </div>

      {/* Reference card */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5">
        <p className="text-xs text-purple-700 font-medium">Reference</p>
        <div className="text-[10px] text-purple-600 space-y-1">
          <p><strong>Math:</strong> <code>+</code> <code>-</code> <code>*</code> <code>/</code> <code>%</code> (modulo) — <code>total_shares * price</code></p>
          <p><strong>Compare:</strong> <code>{">"}</code> <code>{"<"}</code> <code>==</code> <code>!=</code> — <code>shares {">"} 1000 ? "major" : "minor"</code></p>
          <p><strong>Text:</strong> <code>upper(x)</code> <code>lower(x)</code> <code>trim(x)</code> <code>concat(a, " ", b)</code> <code>left(x, n)</code> <code>right(x, n)</code></p>
          <p><strong>Math fns:</strong> <code>round(x)</code> <code>floor(x)</code> <code>ceil(x)</code> <code>min(a,b)</code> <code>max(a,b)</code> <code>abs(x)</code> <code>sum(repeating.$.field)</code></p>
          <p><strong>Date:</strong> <code>days_between(d1, d2)</code> <code>add_days(d, n)</code> <code>add_months(d, n)</code> <code>format_date(d, "MMMM D, YYYY")</code></p>
          <p><strong>Logic:</strong> <code>if(condition, then, else)</code> — <code>if(state == "DE", "Delaware", state)</code></p>
          <p><strong>Counts:</strong> <code>count(repeating_item)</code> — number of items in a repeating list</p>
        </div>
      </div>
    </div>
  );
}

// ── Lookup Table Editor ──

function LookupEditor({ cfg, setCfg, questions }: {
  cfg: LogicConfig; setCfg: (u: Partial<LogicConfig>) => void; questions: Question[];
}) {
  const table = cfg.lookupTable || {};
  const entries = Object.entries(table);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const ic = "px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none";

  const addEntry = () => {
    if (!newKey.trim()) return;
    setCfg({ lookupTable: { ...table, [newKey.trim()]: newVal } });
    setNewKey("");
    setNewVal("");
  };

  const removeEntry = (key: string) => {
    const next = { ...table };
    delete next[key];
    setCfg({ lookupTable: next });
  };

  const updateEntry = (oldKey: string, newValue: string) => {
    setCfg({ lookupTable: { ...table, [oldKey]: newValue } });
  };

  // Find the source question for the lookup
  const srcQ = questions.find(q => q.name === cfg.lookupVariable);
  const srcOptions = srcQ?.validation?.options || [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">Lookup Table</p>
        <p className="text-[10px] text-gray-400 mb-2">Map values from a question to output values. Example: state → filing fee.</p>
      </div>

      <Field label="Source variable" sub="The question whose answer is used as the lookup key">
        <select value={cfg.lookupVariable || ""} onChange={e => setCfg({ lookupVariable: e.target.value })} className={`w-full ${ic}`}>
          <option value="">Select a question...</option>
          {questions.map(q => <option key={q.name} value={q.name}>{q.displayLabel || q.name}</option>)}
        </select>
      </Field>

      {/* Auto-populate from source options */}
      {srcOptions.length > 0 && entries.length === 0 && (
        <button type="button" onClick={() => {
          const autoTable: Record<string, string> = {};
          for (const opt of srcOptions) autoTable[opt] = "";
          setCfg({ lookupTable: autoTable });
        }} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
          Auto-populate from &ldquo;{srcQ?.displayLabel}&rdquo; options ({srcOptions.length} values)
        </button>
      )}

      {/* Table */}
      {entries.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_32px] bg-gray-50 px-3 py-1.5 border-b border-gray-200">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">When value is</span>
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Output</span>
            <span />
          </div>
          {entries.map(([key, val]) => (
            <div key={key} className="grid grid-cols-[1fr_1fr_32px] px-3 py-1.5 border-b border-gray-50 items-center group">
              <span className="text-sm text-gray-700">{key}</span>
              <input value={val} onChange={e => updateEntry(key, e.target.value)} className={`${ic} text-xs`} placeholder="→ output value" />
              <button type="button" onClick={() => removeEntry(key)} className="text-red-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 text-center">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom entry */}
      <div className="flex gap-2">
        <input value={newKey} onChange={e => setNewKey(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEntry(); } }}
          className={`flex-1 ${ic}`} placeholder="Key value" />
        <input value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEntry(); } }}
          className={`flex-1 ${ic}`} placeholder="→ Output" />
        <button type="button" onClick={addEntry} disabled={!newKey.trim()} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-30 shrink-0">Add</button>
      </div>

      {/* Default */}
      <Field label="Default value" sub="When no lookup key matches">
        <input value={cfg.defaultValue || ""} onChange={e => setCfg({ defaultValue: e.target.value })} className={`w-full ${ic}`} placeholder="Fallback value" />
      </Field>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OUTPUT DOCUMENTS TAB
// ═══════════════════════════════════════════════════════════

function DocumentsTab({ workflowId, templates, allTemplates, questions, onUpdate, flash }: {
  workflowId: string; templates: any[]; allTemplates: any[]; questions: Question[]; onUpdate: () => Promise<void>; flash: (m: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const available = allTemplates.filter(t => !templates.some((wt: any) => wt.template?.id === t.id));

  const addExisting = async (templateId: string) => {
    try { await api.addTemplateToWorkflow(workflowId, templateId, templates.length + 1); setShowAdd(false); await onUpdate(); flash("Template added"); } catch (err: any) { flash("Error: " + err.message); }
  };

  const uploadNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer(); const bytes = new Uint8Array(buffer);
      let binary = ""; for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const tmpl = await api.createTemplate({ name: file.name.replace(/\.[^.]+$/, ""), format: file.name.split(".").pop()?.toLowerCase() || "docx" });
      const result = await api.parseTemplate(base64, file.name, tmpl.id);
      await api.addTemplateToWorkflow(workflowId, tmpl.id, templates.length + 1);
      setShowAdd(false); await onUpdate();
      flash(`Template added — ${result.summary.totalVariables} variables detected`);
    } catch (err: any) { flash("Error: " + err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const removeTmpl = async (wtId: string) => {
    if (!confirm("Remove this document from the workflow?")) return;
    try { await api.removeTemplateFromWorkflow(workflowId, wtId); await onUpdate(); flash("Template removed"); } catch (err: any) { flash("Error: " + err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Output Documents</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            These are the Word templates that get generated when a user completes the interview. You can add <strong>document logic</strong> to control which documents are generated based on answers.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-600">+ Add document</button>
      </div>

      {templates.length === 0 ? (
        <Empty title="No output documents" desc="Upload your Word templates (.docx). Variables inside them ({{company_name}}) will be auto-detected and filled with interview answers." action="Add your first template" onAction={() => setShowAdd(true)} />
      ) : (
        <div className="space-y-3">
          {templates.map((wt: any, i: number) => {
            const vars = (wt.template?.parsedSchema as any)?.variables || [];
            const docCondition = (wt.variableMapping as any)?.generateCondition || "";
            return (
              <div key={wt.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:border-brand-200 transition-colors">
                <div className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">📄</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{wt.template?.name}</p>
                      {docCondition && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">conditional</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="uppercase font-medium">{wt.template?.format}</span>
                      {vars.length > 0 && <span>{vars.length} variables detected</span>}
                      {docCondition ? (
                        <span className="text-amber-600">Only generated when conditions are met</span>
                      ) : (
                        <span className="text-green-600">Always generated</span>
                      )}
                    </div>
                    {vars.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {vars.slice(0, 8).map((v: any) => (
                          <span key={v.name} className={`text-[10px] px-1.5 py-0.5 rounded ${questions.some(q => q.name === v.name) ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                            {v.name}
                          </span>
                        ))}
                        {vars.length > 8 && <span className="text-[10px] text-gray-400">+{vars.length - 8}</span>}
                      </div>
                    )}
                    {vars.length > 0 && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        <span className="text-green-600">{vars.filter((v: any) => questions.some(q => q.name === v.name)).length} matched</span>
                        {" / "}
                        <span className="text-red-500">{vars.filter((v: any) => !questions.some(q => q.name === v.name)).length} unmatched</span>
                      </p>
                    )}
                  </div>
                  <button onClick={() => removeTmpl(wt.id)} className="text-xs text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100">Remove</button>
                </div>

                {/* Document Generation Logic */}
                <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Document Logic</span>
                    <span className="text-[10px] text-gray-400">When should this document be generated?</span>
                  </div>
                  <ConditionBuilder
                    condition={docCondition}
                    questions={questions}
                    onChange={async (val) => {
                      try {
                        const token = (await (await import("@/lib/supabase")).supabase.auth.getSession()).data.session?.access_token;
                        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://abbado-draft-production.up.railway.app"}/api/workflows/${workflowId}/templates/${wt.id}/mapping`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                          body: JSON.stringify({ variableMapping: { ...(wt.variableMapping || {}), generateCondition: val || undefined } }),
                        });
                        await onUpdate();
                        flash(val ? "Document condition saved" : "Document condition removed — will always generate");
                      } catch (err: any) { flash("Error: " + err.message); }
                    }}
                  />
                  {!docCondition && <p className="text-[10px] text-gray-300 mt-1">No conditions — this document is always generated. Add a condition to only generate it when certain answers are given.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title="Add output document" subtitle="Upload a Word template or select from your library">
          <div className="mb-5">
            <label className="flex items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-400 hover:bg-brand-50/20 cursor-pointer transition-all">
              <div className="text-center">
                <p className="text-2xl mb-1">📄</p>
                <p className="text-sm text-gray-500">{uploading ? "Parsing template..." : "Upload .docx template"}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Variables like {"{{company_name}}"} will be auto-detected</p>
              </div>
              <input ref={fileRef} type="file" accept=".docx" onChange={uploadNew} className="hidden" disabled={uploading} />
            </label>
          </div>
          {available.length > 0 && (
            <>
              <div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or from library</span></div></div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {available.map(t => (
                  <button key={t.id} onClick={() => addExisting(t.id)} className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-brand-300 hover:bg-brand-50/30 transition-all">
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
// PREVIEW TAB
// ═══════════════════════════════════════════════════════════

function PreviewTab({ pages, questions }: { pages: Page[]; questions: Question[] }) {
  const [currentPage, setCurrentPage] = useState(0);

  // Parse page description (might be JSON with section metadata)
  const getPageText = (p: Page): string => {
    if (!p.description) return "";
    if (p.description.startsWith("{")) {
      try { return JSON.parse(p.description).text || ""; } catch {}
    }
    return p.description;
  };

  if (pages.length === 0) {
    return <Empty title="Nothing to preview" desc="Add pages and questions first, then preview the interview experience here." action="Go to Questions tab" onAction={() => {}} />;
  }

  const page = pages[currentPage];
  const pageText = getPageText(page);
  // Filter: only top-level questions (not sub-questions with .$ in name), exclude computed
  const pageQs = questions.filter(q => q.groupName === page?.name && !q.isComputed && q.type !== "info" && !q.name.includes(".$." ));
  const infoBlocks = questions.filter(q => q.groupName === page?.name && q.type === "info");
  // Sub-questions grouped by parent
  const subQsByParent: Record<string, Question[]> = {};
  for (const q of questions) {
    const match = q.name.match(/^(.+)\.\$\.(.+)$/);
    if (match && q.groupName === page?.name) {
      if (!subQsByParent[match[1]]) subQsByParent[match[1]] = [];
      subQsByParent[match[1]].push(q);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Interview Preview</h2>
          <p className="text-xs text-gray-400">This is what the end user will see when filling out the interview.</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-6 px-1">
        {pages.map((p, i) => (
          <button key={p.id} onClick={() => setCurrentPage(i)} className="flex-1 group">
            <div className={`h-1.5 rounded-full transition-all ${i < currentPage ? "bg-brand-500" : i === currentPage ? "bg-brand-500" : "bg-gray-200 group-hover:bg-gray-300"}`} />
            <p className={`text-[10px] mt-1 truncate ${i === currentPage ? "text-brand-700 font-medium" : "text-gray-400"}`}>{p.name}</p>
          </button>
        ))}
      </div>

      {/* Page content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm max-w-2xl mx-auto overflow-hidden">
        {/* Page header */}
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-xl font-semibold text-gray-900">{page?.name}</h3>
          {pageText && <p className="text-sm text-gray-500 mt-1">{pageText}</p>}
          {page?.condition && (
            <p className="text-[10px] text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded inline-block">
              ⚡ This page is conditional — only shown when conditions are met
            </p>
          )}
        </div>

        {/* Questions */}
        <div className="px-8 pb-8 space-y-6">
          {infoBlocks.map(q => (
            <div key={q.id} className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800 leading-relaxed">
              {q.defaultValue || "Information for the user"}
            </div>
          ))}

          {pageQs.map(q => {
            const subs = subQsByParent[q.name] || [];

            return (
              <div key={q.id} className="space-y-1">
                <label className="block text-sm font-medium text-gray-800">
                  {q.displayLabel}
                  {q.required && <span className="text-red-400 ml-0.5">*</span>}
                  {q.condition && <span className="text-[10px] text-amber-500 ml-1.5 font-normal">(conditional)</span>}
                </label>
                {q.helpText && <p className="text-xs text-gray-400 leading-relaxed">{q.helpText}</p>}

                {q.type === "repeating" ? (
                  <div className="mt-2">
                    {/* Repeating item preview with sub-questions */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">{q.validation?.itemLabel || "Item"} 1</span>
                        <span className="text-[10px] text-gray-400">of 1</span>
                      </div>
                      <div className="p-4 space-y-4">
                        {subs.length > 0 ? subs.map(sq => (
                          <div key={sq.id}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {sq.displayLabel}
                              {sq.required && <span className="text-red-400 ml-0.5">*</span>}
                              {sq.condition && <span className="text-[10px] text-amber-500 ml-1">(conditional)</span>}
                            </label>
                            <PreviewInput type={sq.type} validation={sq.validation} />
                          </div>
                        )) : (
                          <p className="text-xs text-gray-400 italic">No sub-fields defined yet. Add them in the Questions tab.</p>
                        )}
                      </div>
                    </div>
                    <button className="mt-2 w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors">
                      + Add another {q.validation?.itemLabel || "item"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-1">
                    <PreviewInput type={q.type} validation={q.validation} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
          <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="px-5 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors">
            ← Back
          </button>
          {currentPage < pages.length - 1 ? (
            <button onClick={() => setCurrentPage(p => p + 1)} className="px-6 py-2.5 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
              Next →
            </button>
          ) : (
            <button className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              Generate documents
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewInput({ type, validation }: { type: string; validation: any }) {
  const ic = "w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white";
  switch (type) {
    case "boolean":
      return (
        <div className="flex gap-2">
          <button className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-gray-200 hover:border-brand-300 hover:bg-brand-50/30 transition-colors text-gray-600">
            {validation?.trueLabel || "Yes"}
          </button>
          <button className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-gray-200 hover:border-brand-300 hover:bg-brand-50/30 transition-colors text-gray-600">
            {validation?.falseLabel || "No"}
          </button>
        </div>
      );
    case "dropdown":
      return (
        <select className={ic}>
          <option>Select...</option>
          {(validation?.options || []).map((o: string) => <option key={o}>{o}</option>)}
        </select>
      );
    case "state":
      return <select className={ic}><option>Select state...</option></select>;
    case "multi_select":
      const opts = validation?.options || [];
      return (
        <div className="space-y-1.5">
          {opts.map((o: string) => (
            <label key={o} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50/20 transition-colors cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-brand-600 w-4 h-4" />
              <span className="text-sm text-gray-700">{o}</span>
            </label>
          ))}
          {validation?.allowOther && (
            <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-dashed border-gray-200 hover:border-brand-300 transition-colors cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 w-4 h-4" />
              <span className="text-sm text-gray-400 italic">Other...</span>
            </label>
          )}
        </div>
      );
    case "date": return <input type="date" className={ic} />;
    case "rich_text": return <textarea className={`${ic} h-24 resize-y`} placeholder="Type your answer..." />;
    case "file_upload":
      return (
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-400 hover:bg-brand-50/20 cursor-pointer transition-colors">
          <span className="text-lg">📎</span>
          <span className="text-xs text-gray-400 mt-1">Click or drag to upload</span>
          {validation?.acceptedTypes && <span className="text-[10px] text-gray-300 mt-0.5">{validation.acceptedTypes}</span>}
        </label>
      );
    case "repeating":
      return null; // Handled in PreviewTab directly
    case "phone": return <PhoneInput value={null} onChange={() => {}} />;
    case "address": return <AddressInput value={null} onChange={() => {}} fields={validation?.fields} />;
    case "currency":
      return (
        <div className="relative">
          <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">$</span>
          <input type="number" className={`${ic} pl-7`} placeholder="0.00" />
        </div>
      );
    case "percent":
      return (
        <div className="relative">
          <input type="number" className={`${ic} pr-8`} placeholder="0" />
          <span className="absolute right-3.5 top-2.5 text-gray-400 text-sm">%</span>
        </div>
      );
    case "email": return <input type="email" className={ic} placeholder="name@example.com" />;
    case "url": return <input type="url" className={ic} placeholder="https://" />;
    case "number": return <input type="number" className={ic} placeholder={validation?.min !== undefined ? `Min: ${validation.min}` : "0"} />;
    default:
      return <input type="text" className={ic} placeholder={validation?.placeholder || ""} />;
  }
}

// ═══════════════════════════════════════════════════════════
// TYPE-SPECIFIC CONFIG
// ═══════════════════════════════════════════════════════════

function TypeConfig({ q, onUpdate, ic, allQuestions }: {
  q: Question; onUpdate: (u: Partial<Question>) => void; ic: string; allQuestions: Question[];
}) {
  const v = q.validation || {};
  const setV = (updates: Record<string, any>) => onUpdate({ validation: { ...v, ...updates } });

  switch (q.type) {
    case "text":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Max characters"><input type="number" value={v.maxLength ?? ""} onChange={e => setV({ maxLength: e.target.value ? Number(e.target.value) : undefined })} className={ic} placeholder="No limit" /></Field>
            <Field label="Placeholder text"><input value={v.placeholder ?? ""} onChange={e => setV({ placeholder: e.target.value || undefined })} className={ic} placeholder="Shown when empty" /></Field>
          </div>
          <Field label="Pattern (regex)" sub="Optional validation pattern">
            <input value={v.pattern ?? ""} onChange={e => setV({ pattern: e.target.value || undefined })} className={`${ic} font-mono text-xs`} placeholder="e.g., ^[A-Z].*Inc\\.?$" />
          </Field>
        </div>
      );

    case "rich_text":
      return (
        <Field label="Max characters"><input type="number" value={v.maxLength ?? ""} onChange={e => setV({ maxLength: e.target.value ? Number(e.target.value) : undefined })} className={ic} placeholder="No limit" /></Field>
      );

    case "number":
      return (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Min"><input type="number" value={v.min ?? ""} onChange={e => setV({ min: e.target.value ? Number(e.target.value) : undefined })} className={ic} /></Field>
          <Field label="Max"><input type="number" value={v.max ?? ""} onChange={e => setV({ max: e.target.value ? Number(e.target.value) : undefined })} className={ic} /></Field>
          <Field label="Decimals"><input type="number" min="0" max="10" value={v.decimals ?? ""} onChange={e => setV({ decimals: e.target.value ? Number(e.target.value) : undefined })} className={ic} placeholder="Any" /></Field>
        </div>
      );

    case "currency":
      return (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Currency"><select value={v.currency ?? "USD"} onChange={e => setV({ currency: e.target.value })} className={ic}><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="GBP">£ GBP</option></select></Field>
          <Field label="Min"><input type="number" value={v.min ?? ""} onChange={e => setV({ min: e.target.value ? Number(e.target.value) : undefined })} className={ic} placeholder="0.00" /></Field>
          <Field label="Max"><input type="number" value={v.max ?? ""} onChange={e => setV({ max: e.target.value ? Number(e.target.value) : undefined })} className={ic} /></Field>
        </div>
      );

    case "percent":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min %"><input type="number" value={v.min ?? ""} onChange={e => setV({ min: e.target.value ? Number(e.target.value) : undefined })} className={ic} placeholder="0" /></Field>
          <Field label="Max %"><input type="number" value={v.max ?? ""} onChange={e => setV({ max: e.target.value ? Number(e.target.value) : undefined })} className={ic} placeholder="100" /></Field>
        </div>
      );

    case "date":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Earliest date"><input type="date" value={v.minDate ?? ""} onChange={e => setV({ minDate: e.target.value || undefined })} className={ic} /></Field>
            <Field label="Latest date"><input type="date" value={v.maxDate ?? ""} onChange={e => setV({ maxDate: e.target.value || undefined })} className={ic} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={v.allowPast ?? true} onChange={e => setV({ allowPast: e.target.checked })} className="rounded border-gray-300" />
            Allow past dates
          </label>
        </div>
      );

    case "boolean":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field label="'Yes' label"><input value={v.trueLabel ?? "Yes"} onChange={e => setV({ trueLabel: e.target.value })} className={ic} /></Field>
          <Field label="'No' label"><input value={v.falseLabel ?? "No"} onChange={e => setV({ falseLabel: e.target.value })} className={ic} /></Field>
        </div>
      );

    case "dropdown":
    case "multi_select":
      return <OptionsEditor options={v.options || []} onChange={opts => setV({ options: opts })} allowOther={v.allowOther ?? false} onAllowOtherChange={val => setV({ allowOther: val })} isMulti={q.type === "multi_select"} minSelections={v.minSelections} maxSelections={v.maxSelections} onMinChange={val => setV({ minSelections: val })} onMaxChange={val => setV({ maxSelections: val })} />;

    case "email":
      return (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={v.allowMultiple ?? false} onChange={e => setV({ allowMultiple: e.target.checked })} className="rounded border-gray-300" />
          Allow multiple emails (comma-separated)
        </label>
      );

    case "phone":
      return (
        <Field label="Format hint"><select value={v.format ?? "us"} onChange={e => setV({ format: e.target.value })} className={ic}><option value="us">US: (555) 555-5555</option><option value="international">International: +1 555-555-5555</option><option value="any">Any format</option></select></Field>
      );

    case "address":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Address fields to collect:</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "street", label: "Street address" },
              { key: "street2", label: "Address line 2" },
              { key: "city", label: "City" },
              { key: "state", label: "State" },
              { key: "zip", label: "ZIP code" },
              { key: "country", label: "Country" },
              { key: "county", label: "County" },
            ].map(f => (
              <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={(v.fields || ["street", "city", "state", "zip"]).includes(f.key)} onChange={e => {
                  const cur = v.fields || ["street", "city", "state", "zip"];
                  setV({ fields: e.target.checked ? [...cur, f.key] : cur.filter((x: string) => x !== f.key) });
                }} className="rounded border-gray-300" />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      );

    case "state":
      return (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={v.includeTerritories ?? true} onChange={e => setV({ includeTerritories: e.target.checked })} className="rounded border-gray-300" />
          Include territories (DC, Puerto Rico, Guam, USVI)
        </label>
      );

    case "file_upload":
      return (
        <div className="space-y-3">
          <Field label="Accepted file types" sub="Comma-separated extensions">
            <input value={v.acceptedTypes ?? ".pdf,.docx,.jpg,.png"} onChange={e => setV({ acceptedTypes: e.target.value })} className={ic} placeholder=".pdf,.docx,.jpg,.png" />
          </Field>
          <Field label="Max file size (MB)"><input type="number" value={v.maxSizeMB ?? ""} onChange={e => setV({ maxSizeMB: e.target.value ? Number(e.target.value) : undefined })} className={ic} placeholder="10" /></Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={v.multiple ?? false} onChange={e => setV({ multiple: e.target.checked })} className="rounded border-gray-300" />
            Allow multiple files
          </label>
        </div>
      );

    case "info":
      return (
        <Field label="Display content" sub="Text shown to the user (no input collected). Use this for instructions, explanations, or warnings.">
          <textarea value={q.defaultValue || ""} onChange={e => onUpdate({ defaultValue: e.target.value })} className={`${ic} h-24 resize-y`} placeholder="Enter the information you want to display to the user..." />
        </Field>
      );

    case "repeating":
      return (
        <div className="space-y-3">
          <Field label="Item label" sub="What each item is called">
            <input value={v.itemLabel || ""} onChange={e => setV({ itemLabel: e.target.value })} className={ic} placeholder="e.g., Founder, Child, Asset" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min items"><input type="number" min="0" value={v.minItems ?? ""} onChange={e => setV({ minItems: e.target.value ? Number(e.target.value) : undefined })} className={ic} placeholder="0" /></Field>
            <Field label="Max items"><input type="number" min="1" value={v.maxItems ?? ""} onChange={e => setV({ maxItems: e.target.value ? Number(e.target.value) : undefined })} className={ic} placeholder="No limit" /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={v.collectOnSeparatePage ?? false} onChange={e => setV({ collectOnSeparatePage: e.target.checked })} className="rounded border-gray-300" />
            Collect each {v.itemLabel || "item"} on its own page
          </label>

          {/* ── Inline Sub-Question Builder ── */}
          <SubQuestionBuilder
            parentName={q.name}
            itemLabel={v.itemLabel || "item"}
            subQuestions={v.subQuestions || []}
            onChange={subs => setV({ subQuestions: subs })}
          />
        </div>
      );

    case "computed":
      return (
        <div className="space-y-3">
          <Field label="Calculation formula" sub="Reference other question variable names">
            <textarea value={q.expression || ""} onChange={e => onUpdate({ expression: e.target.value })} className={`${ic} h-20 font-mono text-xs resize-y`} placeholder="e.g., authorized_shares - esop_shares" />
          </Field>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
            <p className="text-xs text-purple-700 font-medium">Available operators and functions:</p>
            <p className="text-[10px] text-purple-600">Math: <code className="bg-purple-100 px-1 rounded">+</code> <code className="bg-purple-100 px-1 rounded">-</code> <code className="bg-purple-100 px-1 rounded">*</code> <code className="bg-purple-100 px-1 rounded">/</code> <code className="bg-purple-100 px-1 rounded">%</code> (modulo)</p>
            <p className="text-[10px] text-purple-600">Functions: <code className="bg-purple-100 px-1 rounded">round(x)</code> <code className="bg-purple-100 px-1 rounded">floor(x)</code> <code className="bg-purple-100 px-1 rounded">ceil(x)</code> <code className="bg-purple-100 px-1 rounded">min(a,b)</code> <code className="bg-purple-100 px-1 rounded">max(a,b)</code></p>
            <p className="text-[10px] text-purple-600">Date: <code className="bg-purple-100 px-1 rounded">days_between(date1, date2)</code> <code className="bg-purple-100 px-1 rounded">add_days(date, n)</code></p>
          </div>
          <Field label="Display format"><select value={v.displayFormat ?? "number"} onChange={e => setV({ displayFormat: e.target.value })} className={ic}><option value="number">Number</option><option value="currency">Currency ($)</option><option value="percent">Percentage (%)</option><option value="date">Date</option><option value="text">Text</option></select></Field>
          {allQuestions.filter(aq => aq.id !== q.id && !aq.isComputed).length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Available variables:</p>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {allQuestions.filter(aq => aq.id !== q.id && !aq.isComputed).map(aq => (
                  <button key={aq.id} type="button" onClick={() => {
                    const cur = q.expression || "";
                    onUpdate({ expression: cur + (cur ? " " : "") + aq.name });
                  }} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded hover:bg-brand-50 hover:text-brand-600 cursor-pointer">
                    {aq.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case "url":
      return (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={v.requireHttps ?? true} onChange={e => setV({ requireHttps: e.target.checked })} className="rounded border-gray-300" />
          Require https://
        </label>
      );

    default:
      return null;
  }
}

// ── Sub-Question Builder (for Repeating Items) ──

const SUB_TYPES = QUESTION_TYPES.filter(t => !["repeating", "info", "computed", "file_upload"].includes(t.value));

function SubQuestionBuilder({ parentName, itemLabel, subQuestions, onChange }: {
  parentName: string; itemLabel: string;
  subQuestions: { field: string; label: string; type: string; required: boolean; helpText?: string; validation?: any; condition?: string }[];
  onChange: (subs: any[]) => void;
}) {
  const [addingLabel, setAddingLabel] = useState("");
  const [addingType, setAddingType] = useState("text");
  const [expanded, setExpanded] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const label = addingLabel.trim();
    if (!label) return;
    const field = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!field) return;
    // Dedupe: append number if field already exists
    let finalField = field;
    let n = 2;
    while (subQuestions.some(s => s.field === finalField)) { finalField = `${field}_${n}`; n++; }
    onChange([...subQuestions, { field: finalField, label, type: addingType, required: false }]);
    setAddingLabel("");
    setAddingType("text");
    inputRef.current?.focus();
  };

  const remove = (idx: number) => { onChange(subQuestions.filter((_, i) => i !== idx)); if (expanded === idx) setExpanded(null); };

  const update = (idx: number, updates: Record<string, any>) => {
    onChange(subQuestions.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= subQuestions.length) return;
    const next = [...subQuestions];
    [next[idx], next[ni]] = [next[ni], next[idx]];
    onChange(next);
    if (expanded === idx) setExpanded(ni);
    else if (expanded === ni) setExpanded(idx);
  };

  // Build sibling questions for condition builder (other sub-questions in same repeating item)
  const siblingQuestions = (excludeIdx: number): Question[] =>
    subQuestions.filter((_, i) => i !== excludeIdx).map(sq => ({
      id: sq.field,
      name: sq.field,
      displayLabel: sq.label,
      type: sq.type,
      required: sq.required,
      defaultValue: null,
      validation: sq.validation || null,
      helpText: null,
      condition: null,
      groupName: null,
      displayOrder: 0,
      isComputed: false,
      expression: null,
    }));

  return (
    <div className="border border-brand-200 rounded-xl bg-brand-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-brand-700">Fields collected for each {itemLabel}</p>
          <p className="text-[10px] text-brand-500">Define what information you need per {itemLabel.toLowerCase()}. Add conditions to show fields based on other answers within the same {itemLabel.toLowerCase()}.</p>
        </div>
        <span className="text-xs text-brand-400">{subQuestions.length} field{subQuestions.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Existing sub-questions */}
      {subQuestions.length > 0 && (
        <div className="space-y-1.5">
          {subQuestions.map((sq, i) => {
            const ti = SUB_TYPES.find(t => t.value === sq.type);
            const isExp = expanded === i;
            const hasCondition = sq.condition && sq.condition !== "" && sq.condition !== "{}";

            return (
              <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Collapsed row */}
                <div
                  className={`flex items-center gap-2 px-3 py-2.5 group transition-colors cursor-pointer ${isExp ? "bg-brand-50/40 border-b border-brand-100" : "hover:bg-gray-50/50"}`}
                  onClick={() => setExpanded(isExp ? null : i)}
                >
                  <div className="flex flex-col gap-px opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => move(i, -1)} className="text-[9px] leading-none text-gray-400 hover:text-gray-600">▲</button>
                    <button type="button" onClick={() => move(i, 1)} className="text-[9px] leading-none text-gray-400 hover:text-gray-600">▼</button>
                  </div>
                  <span className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-[10px] shrink-0">{ti?.icon || "?"}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900 truncate block">{sq.label}</span>
                    <span className="text-[9px] text-gray-300 font-mono">{parentName}.$.{sq.field}</span>
                  </div>
                  {sq.required && <span className="text-[9px] text-red-400 bg-red-50 px-1 py-0.5 rounded">required</span>}
                  {hasCondition && <span className="text-[9px] bg-amber-50 text-amber-600 px-1 py-0.5 rounded">conditional</span>}
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{ti?.label || sq.type}</span>
                  <span className={`text-gray-400 text-xs transition-transform ${isExp ? "rotate-90" : ""}`}>▸</span>
                </div>

                {/* Expanded editor */}
                {isExp && (
                  <div className="px-3 py-3 bg-gray-50/50 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Field label</label>
                          <input value={sq.label} onChange={e => update(i, { label: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-brand-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Field name</label>
                          <input value={sq.field} onChange={e => update(i, { field: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-mono focus:ring-1 focus:ring-brand-500 outline-none" />
                          <p className="text-[9px] text-gray-300 mt-0.5">Template: {parentName}.$.{sq.field}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Type</label>
                          <select value={sq.type} onChange={e => update(i, { type: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none">
                            {SUB_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-3">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={sq.required} onChange={e => update(i, { required: e.target.checked })} className="rounded border-gray-300 w-3.5 h-3.5" />
                            Required
                          </label>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Help text</label>
                          <input value={sq.helpText || ""} onChange={e => update(i, { helpText: e.target.value || undefined })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                            placeholder="Guidance shown below this field" />
                        </div>
                      </div>

                      {/* Right: Condition */}
                      <div className="space-y-2">
                        <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold text-amber-700">Field Condition</span>
                          </div>
                          <p className="text-[9px] text-amber-600 mb-2">
                            Only show this field when another field <em>within the same {itemLabel.toLowerCase()}</em> meets a condition.
                            For example: show &ldquo;Vesting Period&rdquo; only when this {itemLabel.toLowerCase()}&apos;s &ldquo;Will shares vest?&rdquo; is Yes.
                          </p>
                          <ConditionBuilder
                            condition={sq.condition || ""}
                            questions={siblingQuestions(i)}
                            onChange={val => update(i, { condition: val || undefined })}
                          />
                        </div>

                        {/* Type-specific config for dropdowns */}
                        {(sq.type === "dropdown" || sq.type === "multi_select") && (
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Options</label>
                            <SubOptionsEditor
                              options={sq.validation?.options || []}
                              onChange={opts => update(i, { validation: { ...sq.validation, options: opts } })}
                            />
                          </div>
                        )}
                        {sq.type === "number" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-[10px] text-gray-500 mb-0.5">Min</label><input type="number" value={sq.validation?.min ?? ""} onChange={e => update(i, { validation: { ...sq.validation, min: e.target.value ? Number(e.target.value) : undefined } })} className="w-full px-2 py-1 border border-gray-200 rounded text-xs outline-none" /></div>
                            <div><label className="block text-[10px] text-gray-500 mb-0.5">Max</label><input type="number" value={sq.validation?.max ?? ""} onChange={e => update(i, { validation: { ...sq.validation, max: e.target.value ? Number(e.target.value) : undefined } })} className="w-full px-2 py-1 border border-gray-200 rounded text-xs outline-none" /></div>
                          </div>
                        )}
                        {sq.type === "boolean" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-[10px] text-gray-500 mb-0.5">&ldquo;Yes&rdquo; label</label><input value={sq.validation?.trueLabel ?? "Yes"} onChange={e => update(i, { validation: { ...sq.validation, trueLabel: e.target.value } })} className="w-full px-2 py-1 border border-gray-200 rounded text-xs outline-none" /></div>
                            <div><label className="block text-[10px] text-gray-500 mb-0.5">&ldquo;No&rdquo; label</label><input value={sq.validation?.falseLabel ?? "No"} onChange={e => update(i, { validation: { ...sq.validation, falseLabel: e.target.value } })} className="w-full px-2 py-1 border border-gray-200 rounded text-xs outline-none" /></div>
                          </div>
                        )}

                        <div className="flex justify-end pt-2">
                          <button type="button" onClick={() => remove(i)} className="text-[10px] text-red-400 hover:text-red-600">Delete field</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new sub-question */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-[10px] text-brand-600 mb-0.5">Field label</label>
          <input
            ref={inputRef}
            value={addingLabel}
            onChange={e => setAddingLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder={`e.g., ${itemLabel} Name, Email, Shares...`}
          />
        </div>
        <div className="w-28">
          <label className="block text-[10px] text-brand-600 mb-0.5">Type</label>
          <select value={addingType} onChange={e => setAddingType(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 outline-none">
            {SUB_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
        </div>
        <button type="button" onClick={add} disabled={!addingLabel.trim()} className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-30 shrink-0">
          + Add
        </button>
      </div>
      <p className="text-[10px] text-brand-400">Type a label and press Enter or click Add. <strong>Click any field to expand</strong> — set conditions, help text, and type-specific options.</p>
    </div>
  );
}

// ── Small options editor for sub-question dropdowns ──

function SubOptionsEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  const [val, setVal] = useState("");
  const add = () => { const t = val.trim(); if (t && !options.includes(t)) { onChange([...options, t]); setVal(""); } };
  return (
    <div className="space-y-1">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1 text-xs">
          <span className="text-gray-400 w-4">{i + 1}.</span>
          <span className="flex-1 text-gray-700">{opt}</span>
          <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))} className="text-red-300 hover:text-red-500 text-[10px]">✕</button>
        </div>
      ))}
      <div className="flex gap-1">
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs outline-none" placeholder="Type option, press Enter" />
        <button type="button" onClick={add} disabled={!val.trim()} className="text-[10px] text-brand-600 disabled:opacity-30">Add</button>
      </div>
    </div>
  );
}

// ── Options Editor (for Dropdown / Multiple Choice) ──

function OptionsEditor({ options, onChange, allowOther, onAllowOtherChange, isMulti, minSelections, maxSelections, onMinChange, onMaxChange }: {
  options: string[]; onChange: (opts: string[]) => void;
  allowOther: boolean; onAllowOtherChange: (v: boolean) => void;
  isMulti: boolean; minSelections?: number; maxSelections?: number;
  onMinChange: (v: number | undefined) => void; onMaxChange: (v: number | undefined) => void;
}) {
  const [newOption, setNewOption] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed || options.includes(trimmed)) return;
    onChange([...options, trimmed]);
    setNewOption("");
    inputRef.current?.focus();
  };

  const removeOption = (idx: number) => onChange(options.filter((_, i) => i !== idx));

  const moveOption = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= options.length) return;
    const next = [...options];
    [next[idx], next[ni]] = [next[ni], next[idx]];
    onChange(next);
  };

  const renameOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    onChange(next);
  };

  const ic = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

  return (
    <div className="space-y-3">
      <Field label="Options" sub={`${options.length} option${options.length !== 1 ? "s" : ""}`}>
        {/* Existing options */}
        {options.length > 0 && (
          <div className="space-y-1 mb-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-1.5 group">
                <div className="flex flex-col gap-px opacity-0 group-hover:opacity-100">
                  <button type="button" onClick={() => moveOption(i, -1)} className="text-[9px] leading-none text-gray-400 hover:text-gray-600">▲</button>
                  <button type="button" onClick={() => moveOption(i, 1)} className="text-[9px] leading-none text-gray-400 hover:text-gray-600">▼</button>
                </div>
                <span className="w-5 text-[10px] text-gray-300 text-center">{i + 1}.</span>
                <input
                  value={opt}
                  onChange={e => renameOption(i, e.target.value)}
                  className="flex-1 px-2 py-1 border border-transparent hover:border-gray-200 focus:border-brand-400 rounded text-sm outline-none focus:ring-1 focus:ring-brand-400"
                />
                <button type="button" onClick={() => removeOption(i)} className="text-red-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 px-1">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add new option */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={newOption}
            onChange={e => setNewOption(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
            className={ic}
            placeholder={options.length === 0 ? "Type first option and press Enter" : "Type another option and press Enter"}
          />
          <button type="button" onClick={addOption} disabled={!newOption.trim()} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-30 shrink-0">
            Add
          </button>
        </div>
      </Field>

      {/* Additional settings */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={allowOther} onChange={e => onAllowOtherChange(e.target.checked)} className="rounded border-gray-300" />
          Allow &ldquo;Other&rdquo; (free text)
        </label>
      </div>

      {isMulti && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min selections"><input type="number" min="0" value={minSelections ?? ""} onChange={e => onMinChange(e.target.value ? Number(e.target.value) : undefined)} className={ic} placeholder="0" /></Field>
          <Field label="Max selections"><input type="number" min="1" value={maxSelections ?? ""} onChange={e => onMaxChange(e.target.value ? Number(e.target.value) : undefined)} className={ic} placeholder="No limit" /></Field>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

function ConditionBuilder({ condition, questions, onChange }: { condition: string; questions: Question[]; onChange: (v: string) => void }) {
  const parsed = parseConditionData(condition);

  const save = (data: ConditionData) => {
    if (data.groups.length === 0 || (data.groups.length === 1 && data.groups[0].rules.length === 0)) { onChange(""); return; }
    onChange(JSON.stringify(data));
  };

  const addGroup = () => {
    save({ ...parsed, groups: [...parsed.groups, { logic: "all", negate: false, rules: [{ variable: "", operator: "eq", value: "", negate: false }] }] });
  };

  const updateGroup = (gi: number, updates: Partial<ConditionGroup>) => {
    const g = [...parsed.groups]; g[gi] = { ...g[gi], ...updates }; save({ ...parsed, groups: g });
  };

  const removeGroup = (gi: number) => {
    save({ ...parsed, groups: parsed.groups.filter((_, i) => i !== gi) });
  };

  const addRule = (gi: number) => {
    const g = [...parsed.groups];
    g[gi] = { ...g[gi], rules: [...g[gi].rules, { variable: "", operator: "eq", value: "", negate: false }] };
    save({ ...parsed, groups: g });
  };

  const updateRule = (gi: number, ri: number, updates: Partial<ConditionRule>) => {
    const g = [...parsed.groups];
    const rules = [...g[gi].rules]; rules[ri] = { ...rules[ri], ...updates };
    // Reset value when variable changes (new type might need different value)
    if (updates.variable && updates.variable !== g[gi].rules[ri].variable) rules[ri].value = "";
    g[gi] = { ...g[gi], rules };
    save({ ...parsed, groups: g });
  };

  const removeRule = (gi: number, ri: number) => {
    const g = [...parsed.groups];
    g[gi] = { ...g[gi], rules: g[gi].rules.filter((_, i) => i !== ri) };
    if (g[gi].rules.length === 0) g.splice(gi, 1);
    save({ ...parsed, groups: g });
  };

  const ic = "px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-brand-400";

  if (parsed.groups.length === 0) {
    return (
      <button type="button" onClick={() => save({ groupLogic: "all", groups: [{ logic: "all", negate: false, rules: [{ variable: "", operator: "eq", value: "", negate: false }] }] })}
        className="text-xs text-brand-600 hover:text-brand-700 font-medium">+ Add condition</button>
    );
  }

  return (
    <div className="space-y-2">
      {parsed.groups.map((group, gi) => (
        <div key={gi}>
          {/* Group connector */}
          {gi > 0 && (
            <div className="flex items-center gap-2 my-1.5">
              <div className="flex-1 h-px bg-gray-200" />
              <button type="button" onClick={() => save({ ...parsed, groupLogic: parsed.groupLogic === "all" ? "any" : "all" })}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${parsed.groupLogic === "all" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                {parsed.groupLogic === "all" ? "AND" : "OR"}
              </button>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

          {/* Group box */}
          <div className={`rounded-lg border ${group.negate ? "border-red-200 bg-red-50/30" : "border-gray-200 bg-white"} p-2 space-y-1.5`}>
            {/* Group header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => updateGroup(gi, { negate: !group.negate })}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${group.negate ? "bg-red-200 text-red-700" : "bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600"}`}>
                  {group.negate ? "NOT" : "not"}
                </button>
                {group.rules.length > 1 && (
                  <button type="button" onClick={() => updateGroup(gi, { logic: group.logic === "all" ? "any" : "all" })}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${group.logic === "all" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                    {group.logic === "all" ? "ALL match" : "ANY match"}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => removeGroup(gi)} className="text-[10px] text-red-300 hover:text-red-500">Remove group</button>
            </div>

            {/* Rules */}
            {group.rules.map((rule, ri) => {
              const srcQ = questions.find(q => q.name === rule.variable);
              const ops = getOperatorsForType(srcQ?.type);

              return (
                <div key={ri} className="flex gap-1.5 items-center flex-wrap">
                  {ri > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 ${group.logic === "all" ? "text-blue-500" : "text-orange-500"}`}>
                      {group.logic === "all" ? "AND" : "OR"}
                    </span>
                  )}
                  {/* Negate per rule */}
                  <button type="button" onClick={() => updateRule(gi, ri, { negate: !rule.negate })}
                    className={`px-1 py-0.5 rounded text-[9px] font-bold shrink-0 ${rule.negate ? "bg-red-200 text-red-700" : "bg-gray-50 text-gray-300 hover:bg-red-50 hover:text-red-400"}`}>
                    {rule.negate ? "NOT" : "not"}
                  </button>
                  {/* Variable */}
                  <select value={rule.variable} onChange={e => updateRule(gi, ri, { variable: e.target.value })} className={`${ic} flex-1 min-w-[120px]`}>
                    <option value="">Select question...</option>
                    {questions.map(q => <option key={q.name} value={q.name}>{q.displayLabel || q.name}</option>)}
                  </select>
                  {/* Operator */}
                  <select value={rule.operator} onChange={e => updateRule(gi, ri, { operator: e.target.value })} className={ic}>
                    {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {/* Value — type-aware */}
                  {!["truthy", "falsy"].includes(rule.operator) && (
                    <TypeAwareValuePicker
                      question={srcQ}
                      value={rule.value}
                      onChange={val => updateRule(gi, ri, { value: val })}
                      className={`${ic} flex-1 min-w-[80px]`}
                    />
                  )}
                  <button type="button" onClick={() => removeRule(gi, ri)} className="text-red-300 hover:text-red-500 text-xs px-0.5 shrink-0">✕</button>
                </div>
              );
            })}
            <button type="button" onClick={() => addRule(gi)} className="text-[10px] text-brand-500 hover:text-brand-700">+ Add rule</button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addGroup} className="text-[10px] text-gray-400 hover:text-brand-600">
        + Add condition group {parsed.groups.length > 0 ? "(ELSE IF)" : ""}
      </button>
    </div>
  );
}

// ── Type-aware value picker ──

function TypeAwareValuePicker({ question, value, onChange, className }: {
  question: Question | undefined; value: string; onChange: (v: string) => void; className: string;
}) {
  if (!question) return <input value={value} onChange={e => onChange(e.target.value)} className={className} placeholder="value" />;

  switch (question.type) {
    case "boolean":
      return (
        <div className="flex gap-1">
          <button type="button" onClick={() => onChange("true")}
            className={`px-2 py-1 rounded text-[10px] border ${value === "true" ? "bg-brand-50 border-brand-300 text-brand-700 font-medium" : "border-gray-200 text-gray-500"}`}>
            {question.validation?.trueLabel || "Yes"}
          </button>
          <button type="button" onClick={() => onChange("false")}
            className={`px-2 py-1 rounded text-[10px] border ${value === "false" ? "bg-brand-50 border-brand-300 text-brand-700 font-medium" : "border-gray-200 text-gray-500"}`}>
            {question.validation?.falseLabel || "No"}
          </button>
        </div>
      );

    case "dropdown":
    case "multi_select":
    case "state":
      const options = question.type === "state"
        ? ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","District of Columbia"]
        : question.validation?.options || [];
      return (
        <select value={value} onChange={e => onChange(e.target.value)} className={className}>
          <option value="">Select...</option>
          {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          {question.validation?.allowOther && <option value="__other__">Other</option>}
        </select>
      );

    case "number":
    case "currency":
    case "percent":
      return <input type="number" value={value} onChange={e => onChange(e.target.value)} className={className} placeholder="0" />;

    case "date":
      return <input type="date" value={value} onChange={e => onChange(e.target.value)} className={className} />;

    default:
      return <input value={value} onChange={e => onChange(e.target.value)} className={className} placeholder="value" />;
  }
}

// ── Operators filtered by question type ──

function getOperatorsForType(type?: string): { value: string; label: string }[] {
  const base = [
    { value: "truthy", label: "is answered" },
    { value: "falsy", label: "is not answered" },
  ];

  switch (type) {
    case "boolean":
      return [
        { value: "eq", label: "is" },
        ...base,
      ];

    case "dropdown":
    case "multi_select":
    case "state":
      return [
        { value: "eq", label: "is" },
        { value: "neq", label: "is not" },
        { value: "contains", label: "includes" },
        ...base,
      ];

    case "number":
    case "currency":
    case "percent":
      return [
        { value: "eq", label: "equals" },
        { value: "neq", label: "does not equal" },
        { value: "gt", label: "is greater than" },
        { value: "lt", label: "is less than" },
        { value: "gte", label: "is at least" },
        { value: "lte", label: "is at most" },
        ...base,
      ];

    case "date":
      return [
        { value: "eq", label: "is" },
        { value: "gt", label: "is after" },
        { value: "lt", label: "is before" },
        ...base,
      ];

    default:
      return [
        { value: "eq", label: "equals" },
        { value: "neq", label: "does not equal" },
        { value: "contains", label: "contains" },
        ...base,
      ];
  }
}

// ── Condition data types ──

interface ConditionRule { variable: string; operator: string; value: string; negate: boolean; }
interface ConditionGroup { logic: "all" | "any"; negate: boolean; rules: ConditionRule[]; }
interface ConditionData { groupLogic: "all" | "any"; groups: ConditionGroup[]; }

function parseConditionData(c: string): ConditionData {
  if (!c) return { groupLogic: "all", groups: [] };
  try {
    const parsed = JSON.parse(c);
    // New multi-group format
    if (parsed.groups && Array.isArray(parsed.groups)) return parsed;
    // Old multi-condition format — convert
    if (parsed.conditions && Array.isArray(parsed.conditions)) {
      return {
        groupLogic: "all",
        groups: [{ logic: parsed.logic || "all", negate: false, rules: parsed.conditions.map((r: any) => ({ ...r, negate: false })) }],
      };
    }
  } catch {}
  // Legacy string
  const legacy = parseCond(c);
  if (legacy.v) return { groupLogic: "all", groups: [{ logic: "all", negate: false, rules: [{ variable: legacy.v, operator: legacy.o, value: legacy.c, negate: false }] }] };
  return { groupLogic: "all", groups: [] };
}

function parseCond(c: string): { v: string; o: string; c: string } {
  if (!c) return { v: "", o: "eq", c: "" };
  const m = c.match(/^(\S+)\s*(==|!=|>|<)\s*["']?([^"']*)["']?$/);
  if (m) return { v: m[1], o: m[2] === "==" ? "eq" : m[2] === "!=" ? "neq" : m[2] === ">" ? "gt" : "lt", c: m[3] };
  if (c.startsWith("!")) return { v: c.slice(1), o: "falsy", c: "" };
  return { v: c, o: "truthy", c: "" };
}

function Modal({ onClose, title, subtitle, children }: { onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <div><h2 className="text-lg font-semibold text-gray-900">{title}</h2>{subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}</div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ title, desc, action, onAction }: { title: string; desc: string; action: string; onAction: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 border-dashed p-12 text-center">
      <p className="text-gray-500 font-medium">{title}</p>
      <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">{desc}</p>
      <button onClick={onAction} className="mt-4 px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-100">{action}</button>
    </div>
  );
}

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-500 mb-1">{label}{sub && <span className="text-gray-300 font-normal"> — {sub}</span>}</label>{children}</div>;
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 bg-brand-700 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-40">
      <span className="text-sm">Unsaved changes</span>
      <button onClick={onSave} className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30">Save now</button>
    </div>
  );
}

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  arr.forEach(item => { const k = fn(item); if (!result[k]) result[k] = []; result[k].push(item); });
  return result;
}
