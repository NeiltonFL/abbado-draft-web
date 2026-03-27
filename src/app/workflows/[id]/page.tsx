"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";

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

const OPERATORS = [
  { value: "eq", label: "equals", symbol: "==" },
  { value: "neq", label: "does not equal", symbol: "!=" },
  { value: "gt", label: "greater than", symbol: ">" },
  { value: "lt", label: "less than", symbol: "<" },
  { value: "truthy", label: "is answered", symbol: "" },
  { value: "falsy", label: "is not answered", symbol: "!" },
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

  const TABS = [
    { key: "questions", label: "Questions", count: questions.length },
    { key: "pages", label: "Pages", count: pages.length },
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
          <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5">{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
          <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5">{pages.length} page{pages.length !== 1 ? "s" : ""}</span>
          <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5">{templates.length} document{templates.length !== 1 ? "s" : ""}</span>
          <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5">{questions.filter(q => q.condition).length} with logic</span>
          <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5">{questions.filter(q => q.isComputed).length} calculations</span>
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
        subMap[parentName].push({ field, label: q.displayLabel, type: q.type, required: q.required, helpText: q.helpText, validation: q.validation });
      } else {
        parents.push(q);
      }
    }

    // Attach sub-questions to their parent's validation
    for (const p of parents) {
      if (subMap[p.name]) {
        p.validation = { ...(p.validation || {}), subQuestions: subMap[p.name] };
        // Mark as repeating type if it has sub-questions
        if (p.type === "text" && subMap[p.name].length > 0) p.type = "repeating";
      }
    }

    setItems(parents);
    setDirty(false);
  }, [questions]);

  const pageNames = pages.map(p => p.name);
  const groups = groupBy(items, q => q.groupName || "Unassigned");

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
          type: q.type === "repeating" || q.type === "info" || q.type === "file_upload" || q.type === "computed" ? "text" : q.type,
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
              condition: null,
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
        <div className="space-y-6">
          {Object.entries(groups).map(([pageName, qs]) => (
            <div key={pageName}>
              <div className="flex items-center gap-2 mb-2">
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
                    allQuestions={items} pageNames={pageNames} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {dirty && <SaveBar onSave={save} />}
      {adding && <AddQuestionModal onAdd={add} onClose={() => setAdding(false)} pageNames={pageNames} allQuestions={items} />}
    </div>
  );
}

// ── Question Row ──

function QuestionRow({ q, ti, isEditing, onToggle, onUpdate, onRemove, onMove, onDuplicate, allQuestions, pageNames }: {
  q: Question; ti: (t: string) => any; isEditing: boolean;
  onToggle: () => void; onUpdate: (u: Partial<Question>) => void; onRemove: () => void;
  onMove: (d: -1 | 1) => void; onDuplicate: () => void;
  allQuestions: Question[]; pageNames: string[];
}) {
  const typeInfo = ti(q.type);
  const ic = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

  return (
    <div>
      {/* Collapsed */}
      <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors ${isEditing ? "bg-brand-50/30" : ""}`} onClick={onToggle}>
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
  const [items, setItems] = useState(pages);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setItems(pages); setDirty(false); }, [pages]);

  const questionGroups = Array.from(new Set(questions.map(q => q.groupName).filter(Boolean))) as string[];
  const uncovered = questionGroups.filter(g => !items.some(p => p.name === g));

  const add = (name: string) => { setItems(p => [...p, { id: `new_${Date.now()}`, name, description: null, displayOrder: p.length, condition: null }]); setDirty(true); };
  const update = (i: number, u: Partial<Page>) => { setItems(p => { const n = [...p]; n[i] = { ...n[i], ...u }; return n; }); setDirty(true); };
  const remove = (i: number) => { setItems(p => p.filter((_, j) => j !== i)); setDirty(true); };
  const move = (i: number, d: -1 | 1) => { const ni = i + d; if (ni < 0 || ni >= items.length) return; setItems(p => { const n = [...p]; [n[i], n[ni]] = [n[ni], n[i]]; return n; }); setDirty(true); };

  const autoGen = () => { setItems(questionGroups.map((g, i) => ({ id: `auto_${Date.now()}_${i}`, name: g, description: null, displayOrder: i, condition: null }))); setDirty(true); };

  const save = async () => {
    try {
      const token = (await (await import("@/lib/supabase")).supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://abbado-draft-production.up.railway.app"}/api/workflows/${workflowId}/interview`, {
        method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ sections: items.map((s, i) => ({ name: s.name, description: s.description, displayOrder: i, condition: s.condition })) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await onUpdate(); setDirty(false); flash("Pages saved");
    } catch (err: any) { flash("Error: " + err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Pages</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Pages are the steps in the interview wizard. Each page shows the questions assigned to it (via the question&apos;s <strong>Page</strong> field).
            You can add <strong>page logic</strong> to show or hide entire pages based on earlier answers.
          </p>
        </div>
        <div className="flex gap-2">
          {questionGroups.length > 0 && items.length === 0 && (
            <button onClick={autoGen} className="px-3 py-1.5 border border-brand-200 text-brand-700 rounded-lg text-sm hover:bg-brand-50">Auto-generate from questions</button>
          )}
          <button onClick={() => add("New Page")} className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">+ Add page</button>
          {dirty && <button onClick={save} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Save pages</button>}
        </div>
      </div>

      {items.length === 0 ? (
        <Empty title="No pages configured" desc="Pages organize your questions into steps. Each page becomes one screen in the interview wizard." action={questionGroups.length > 0 ? `Auto-generate ${questionGroups.length} pages from question groups` : "Add a page"} onAction={() => questionGroups.length > 0 ? autoGen() : add("New Page")} />
      ) : (
        <div className="space-y-2">
          {items.map((p, i) => {
            const pQuestions = questions.filter(q => q.groupName === p.name);
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 group hover:border-brand-200 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-px pt-1 opacity-30 group-hover:opacity-100">
                    <button onClick={() => move(i, -1)} className="text-[10px] leading-none hover:text-brand-600">▲</button>
                    <button onClick={() => move(i, 1)} className="text-[10px] leading-none hover:text-brand-600">▼</button>
                  </div>
                  <div className="w-9 h-9 bg-brand-50 text-brand-700 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <input value={p.name} onChange={e => update(i, { name: e.target.value })} className="text-sm font-medium text-gray-900 bg-transparent border-none outline-none w-full p-0" />
                    <input value={p.description || ""} onChange={e => update(i, { description: e.target.value || null })} className="text-xs text-gray-400 bg-transparent border-none outline-none w-full p-0 mt-0.5" placeholder="Description shown to the user (optional)" />

                    {/* Page Logic */}
                    {p.condition !== null && (
                      <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-amber-700">PAGE LOGIC — Only show this page when:</span>
                          <button onClick={() => update(i, { condition: null })} className="text-[10px] text-amber-400 hover:text-amber-600">Remove</button>
                        </div>
                        <ConditionBuilder condition={p.condition || ""} questions={questions} onChange={val => update(i, { condition: val })} />
                      </div>
                    )}

                    {/* Questions preview */}
                    {pQuestions.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pQuestions.map(q => (
                          <span key={q.id} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {QUESTION_TYPES.find(t => t.value === q.type)?.icon} {q.displayLabel}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-300 mt-2">No questions assigned to this page yet. Set a question&apos;s &ldquo;Page&rdquo; field to &ldquo;{p.name}&rdquo;.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{pQuestions.length} Q</span>
                    {p.condition === null && (
                      <button onClick={() => update(i, { condition: "" })} className="text-[10px] text-gray-300 hover:text-amber-500 opacity-0 group-hover:opacity-100">+ logic</button>
                    )}
                    <button onClick={() => remove(i)} className="text-xs text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100">✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {uncovered.length > 0 && items.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700 font-medium">Questions assigned to pages that don&apos;t exist yet:</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {uncovered.map(g => <button key={g} onClick={() => add(g)} className="text-[11px] bg-white border border-amber-300 text-amber-700 px-2 py-0.5 rounded-lg hover:bg-amber-50">+ Create &ldquo;{g}&rdquo; page</button>)}
          </div>
        </div>
      )}

      {dirty && <SaveBar onSave={save} />}
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
        <div className="space-y-2">
          {templates.map((wt: any, i: number) => {
            const vars = (wt.template?.parsedSchema as any)?.variables || [];
            return (
              <div key={wt.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 group hover:border-brand-200 transition-colors">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">📄</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{wt.template?.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="uppercase font-medium">{wt.template?.format}</span>
                    {vars.length > 0 && <span>{vars.length} variables detected</span>}
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

  if (pages.length === 0) {
    return <Empty title="Nothing to preview" desc="Add pages and questions first, then preview the interview experience here." action="Go to Questions tab" onAction={() => {}} />;
  }

  const page = pages[currentPage];
  const pageQs = questions.filter(q => q.groupName === page?.name && !q.isComputed && q.type !== "info");
  const infoBlocks = questions.filter(q => q.groupName === page?.name && q.type === "info");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Interview Preview</h2>
          <p className="text-xs text-gray-400">This is what the user will see when running this workflow.</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {pages.map((p, i) => (
          <button key={p.id} onClick={() => setCurrentPage(i)} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= currentPage ? "bg-brand-500" : "bg-gray-200"}`} />
            <p className={`text-[10px] mt-1 ${i === currentPage ? "text-brand-700 font-medium" : "text-gray-400"}`}>{p.name}</p>
          </button>
        ))}
      </div>

      {/* Page content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-medium text-gray-900">{page?.name}</h3>
        {page?.description && <p className="text-sm text-gray-500 mt-1">{page.description}</p>}
        {page?.condition && <p className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded inline-block">Conditional: {page.condition}</p>}

        <div className="mt-6 space-y-5">
          {infoBlocks.map(q => (
            <div key={q.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">{q.defaultValue || "Info block"}</div>
          ))}
          {pageQs.map(q => {
            const t = QUESTION_TYPES.find(qt => qt.value === q.type);
            return (
              <div key={q.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {q.displayLabel} {q.required && <span className="text-red-400">*</span>}
                  {q.condition && <span className="text-[10px] text-amber-500 ml-1">(conditional)</span>}
                </label>
                {q.helpText && <p className="text-xs text-gray-400 mb-1.5">{q.helpText}</p>}
                <PreviewInput type={q.type} validation={q.validation} />
              </div>
            );
          })}
        </div>

        <div className="flex justify-between mt-8">
          <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="px-4 py-2 text-sm text-gray-500 disabled:opacity-30">← Back</button>
          {currentPage < pages.length - 1 ? (
            <button onClick={() => setCurrentPage(p => p + 1)} className="px-6 py-2 bg-brand-700 text-white rounded-lg text-sm">Next →</button>
          ) : (
            <button className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm">Generate documents</button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewInput({ type, validation }: { type: string; validation: any }) {
  const ic = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50";
  switch (type) {
    case "boolean": return <div className="flex gap-3"><button className="px-4 py-1.5 rounded-lg text-sm border border-gray-200">Yes</button><button className="px-4 py-1.5 rounded-lg text-sm border border-gray-200">No</button></div>;
    case "dropdown": case "state": return <select className={ic}><option>Select...</option>{(validation?.options || []).map((o: string) => <option key={o}>{o}</option>)}</select>;
    case "multi_select": return <div className="flex flex-wrap gap-2">{(validation?.options || ["Option A", "Option B"]).map((o: string) => <label key={o} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="rounded" />{o}</label>)}</div>;
    case "date": return <input type="date" className={ic} />;
    case "rich_text": return <textarea className={`${ic} h-20`} />;
    case "repeating": return <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-xs text-gray-400"><button className="px-3 py-1 bg-gray-100 rounded text-sm">+ Add {validation?.itemLabel || "item"}</button></div>;
    case "file_upload": return <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-xs text-gray-400">Click or drag to upload</div>;
    default: return <input type={type === "email" ? "email" : type === "number" || type === "currency" || type === "percent" ? "number" : type === "phone" ? "tel" : "text"} className={ic} />;
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
  subQuestions: { field: string; label: string; type: string; required: boolean; helpText?: string; validation?: any }[];
  onChange: (subs: any[]) => void;
}) {
  const [addingField, setAddingField] = useState("");
  const [addingLabel, setAddingLabel] = useState("");
  const [addingType, setAddingType] = useState("text");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const field = addingField.trim() || addingLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const label = addingLabel.trim();
    if (!field || !label) return;
    if (subQuestions.some(s => s.field === field)) return;
    onChange([...subQuestions, { field, label, type: addingType, required: false }]);
    setAddingField("");
    setAddingLabel("");
    setAddingType("text");
    inputRef.current?.focus();
  };

  const remove = (idx: number) => onChange(subQuestions.filter((_, i) => i !== idx));

  const update = (idx: number, updates: Record<string, any>) => {
    onChange(subQuestions.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= subQuestions.length) return;
    const next = [...subQuestions];
    [next[idx], next[ni]] = [next[ni], next[idx]];
    onChange(next);
  };

  return (
    <div className="border border-brand-200 rounded-xl bg-brand-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-brand-700">Fields collected for each {itemLabel}</p>
          <p className="text-[10px] text-brand-500">Define what information you need per {itemLabel.toLowerCase()}</p>
        </div>
        <span className="text-xs text-brand-400">{subQuestions.length} field{subQuestions.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Existing sub-questions */}
      {subQuestions.length > 0 && (
        <div className="space-y-1.5">
          {subQuestions.map((sq, i) => {
            const ti = SUB_TYPES.find(t => t.value === sq.type);
            return (
              <div key={i} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 group">
                <div className="flex flex-col gap-px opacity-0 group-hover:opacity-100">
                  <button type="button" onClick={() => move(i, -1)} className="text-[9px] leading-none text-gray-400">▲</button>
                  <button type="button" onClick={() => move(i, 1)} className="text-[9px] leading-none text-gray-400">▼</button>
                </div>
                <span className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-[10px] shrink-0">{ti?.icon || "?"}</span>
                <input
                  value={sq.label}
                  onChange={e => update(i, { label: e.target.value })}
                  className="flex-1 text-sm bg-transparent border-none outline-none p-0 min-w-0"
                  placeholder="Field label"
                />
                <select
                  value={sq.type}
                  onChange={e => update(i, { type: e.target.value })}
                  className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 outline-none"
                >
                  {SUB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer shrink-0">
                  <input type="checkbox" checked={sq.required} onChange={e => update(i, { required: e.target.checked })} className="rounded border-gray-300 w-3 h-3" />
                  Req
                </label>
                <span className="text-[9px] text-gray-300 font-mono shrink-0" title={`Template variable: ${parentName}.$.${sq.field}`}>{parentName}.$.{sq.field}</span>
                <button type="button" onClick={() => remove(i)} className="text-red-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 shrink-0">✕</button>
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
            onChange={e => { setAddingLabel(e.target.value); if (!addingField) setAddingField(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")); }}
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
      <p className="text-[10px] text-brand-400">Type a label and press Enter or click Add. Each field becomes a question the user answers for every {itemLabel.toLowerCase()}.</p>
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
  const p = parseCond(condition);
  const set = (varName: string, op: string, val: string) => {
    if (!varName) { onChange(""); return; }
    if (op === "truthy") { onChange(varName); return; }
    if (op === "falsy") { onChange(`!${varName}`); return; }
    onChange(`${varName} ${op === "eq" ? "==" : op === "neq" ? "!=" : op === "gt" ? ">" : "<"} "${val}"`);
  };
  return (
    <div className="flex gap-2 items-center flex-wrap">
      <select value={p.v} onChange={e => set(e.target.value, p.o || "eq", p.c)} className="px-2 py-1.5 border border-gray-200 rounded text-xs outline-none flex-1 min-w-[140px]">
        <option value="">Always show</option>
        {questions.map(q => <option key={q.name} value={q.name}>{q.displayLabel}</option>)}
      </select>
      {p.v && (
        <>
          <select value={p.o} onChange={e => set(p.v, e.target.value, p.c)} className="px-2 py-1.5 border border-gray-200 rounded text-xs outline-none">
            {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {!["truthy", "falsy"].includes(p.o) && (
            <input value={p.c} onChange={e => set(p.v, p.o, e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs outline-none flex-1 min-w-[100px]" placeholder="value" />
          )}
        </>
      )}
    </div>
  );
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
