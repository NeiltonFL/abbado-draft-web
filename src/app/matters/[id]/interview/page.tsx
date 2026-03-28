"use client";

import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { AddressInput } from "@/components/AddressInput";
import { PhoneInput } from "@/components/PhoneInput";

interface InterviewSection { id: string; name: string; description: string | null; condition: string | null; variables: Variable[]; }
interface Variable { id: string; name: string; displayLabel: string; type: string; required: boolean; defaultValue: string | null; validation: any; helpText: string | null; condition: string | null; isComputed: boolean; expression: string | null; }

function parseDesc(desc: string | null): string {
  if (!desc) return "";
  if (desc.startsWith("{")) { try { return JSON.parse(desc).text || ""; } catch {} }
  return desc;
}

function displayValue(val: any, type: string): string {
  if (val === undefined || val === null || val === "") return "\u2014";
  if (type === "boolean") return val === true || val === "true" || val === "Yes" ? "Yes" : "No";
  if (type === "address" && typeof val === "object") { return [val.street, val.city, val.state, val.zip].filter(Boolean).join(", ") || "\u2014"; }
  if (type === "phone" && typeof val === "object") return val.formatted || val.number || "\u2014";
  if (Array.isArray(val)) return `${val.length} item${val.length !== 1 ? "s" : ""}`;
  return String(val);
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const matterId = params.id as string;
  const { session, loading: authLoading } = useAuth();

  const [matter, setMatter] = useState<any>(null);
  const [interview, setInterview] = useState<{ workflowName?: string; sections: InterviewSection[] } | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const valuesRef = useRef(values);
  valuesRef.current = values; // Always points to latest values
  const [currentSection, setCurrentSection] = useState(0);
  const currentSectionRef = useRef(currentSection);
  currentSectionRef.current = currentSection;
  const [mode, setMode] = useState<"interview" | "review">("interview");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingSection, setEditingSection] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading || !session) return;
    api.getMatter(matterId).then((m) => {
      setMatter(m);
      setValues((m.variableValues as Record<string, any>) || {});
      if (m.interviewState?.currentSection) setCurrentSection(m.interviewState.currentSection);
      return api.getInterview(m.workflowId);
    }).then((iv) => { setInterview(iv); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [matterId, authLoading, session]);

  const setValue = (name: string, value: any) => setValues((prev) => ({ ...prev, [name]: value }));
  const isVisible = (condition: string | null): boolean => { if (!condition) return true; return evalConditionData(condition, values); };

  const saveProgress = async () => {
    try {
      await api.updateVariableValues(matterId, valuesRef.current, "interview");
      await api.saveInterviewState(matterId, { currentSection: currentSectionRef.current, savedAt: new Date().toISOString() });
    } catch (err: any) { console.error("Save error:", err); }
  };

  const visibleSectionIndices = interview?.sections.map((s, i) => ({ ...s, idx: i })).filter(s => !s.condition || isVisible(s.condition)) || [];

  const goToSection = async (idx: number) => { await saveProgress(); setCurrentSection(idx); setMode("interview"); setEditingSection(null); };

  const goNext = async () => {
    if (!interview) return;
    await saveProgress();
    const curVisIdx = visibleSectionIndices.findIndex(s => s.idx === currentSection);
    if (curVisIdx < visibleSectionIndices.length - 1) setCurrentSection(visibleSectionIndices[curVisIdx + 1].idx);
    else setMode("review");
  };

  const goBack = () => {
    if (!interview) return;
    if (mode === "review") { setMode("interview"); if (visibleSectionIndices.length > 0) setCurrentSection(visibleSectionIndices[visibleSectionIndices.length - 1].idx); return; }
    const curVisIdx = visibleSectionIndices.findIndex(s => s.idx === currentSection);
    if (curVisIdx > 0) setCurrentSection(visibleSectionIndices[curVisIdx - 1].idx);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try { await saveProgress(); await api.generateDocuments(matterId, "live"); router.push(`/matters/${matterId}`); }
    catch (err: any) { setError(err.message); setGenerating(false); }
  };

  if (loading) return <AppShell><p className="text-gray-400">Loading interview...</p></AppShell>;
  if (error) return <AppShell><p className="text-red-600">{error}</p></AppShell>;
  if (!interview || !matter) return <AppShell><p className="text-gray-400">Not found</p></AppShell>;

  const section = interview.sections[currentSection];
  const isOnLastVisible = visibleSectionIndices.length > 0 && visibleSectionIndices[visibleSectionIndices.length - 1].idx === currentSection;

  // Sub-questions across all sections
  const allSubsByParent: Record<string, Variable[]> = {};
  for (const sec of interview.sections) for (const v of sec.variables) {
    const m = v.name.match(/^(.+)\.\$\.(.+)$/);
    if (m) { if (!allSubsByParent[m[1]]) allSubsByParent[m[1]] = []; allSubsByParent[m[1]].push(v); }
  }

  const sectionVars = section?.variables.filter(v => !v.isComputed && isVisible(v.condition) && !v.name.includes(".$.")) || [];
  const sectionSubs: Record<string, Variable[]> = {};
  for (const v of section?.variables || []) { const m = v.name.match(/^(.+)\.\$\.(.+)$/); if (m) { if (!sectionSubs[m[1]]) sectionSubs[m[1]] = []; sectionSubs[m[1]].push(v); } }

  return (
    <AppShell>
      <div className="flex gap-0 -mx-8 -mt-4">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? "w-64" : "w-0"} shrink-0 transition-all overflow-hidden`}>
          <div className="w-64 h-[calc(100vh-64px)] overflow-y-auto border-r border-gray-200 bg-gray-50/80 p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{matter.name}</p>
            <p className="text-xs font-medium text-gray-600 mb-4">{interview.workflowName || "Interview"}</p>
            <div className="space-y-0.5">
              {interview.sections.map((s, i) => {
                const vis = !s.condition || isVisible(s.condition);
                const isCurrent = mode === "interview" && i === currentSection;
                const vars = s.variables.filter(v => !v.isComputed && !v.name.includes(".$.") && v.type !== "info");
                const filledCount = vars.filter(v => { const val = values[v.name]; return val !== undefined && val !== null && val !== "" && (v.type !== "repeating" || (Array.isArray(val) && val.length > 0)); }).length;

                return (
                  <div key={s.id}>
                    <button onClick={() => { if (vis) goToSection(i); }} disabled={!vis}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${!vis ? "text-gray-300 line-through cursor-not-allowed" : isCurrent ? "bg-brand-100 text-brand-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                      <div className="flex items-center justify-between">
                        <span className="truncate">{s.name}</span>
                        {vis && vars.length > 0 && (
                          <span className={`text-[9px] shrink-0 ml-1 px-1.5 py-0.5 rounded-full ${filledCount === vars.length ? "bg-green-100 text-green-600" : filledCount > 0 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400"}`}>{filledCount}/{vars.length}</span>
                        )}
                      </div>
                    </button>
                    {isCurrent && vis && (
                      <div className="ml-3 mt-0.5 mb-1 space-y-px">
                        {vars.filter(v => isVisible(v.condition)).map(v => {
                          const hasVal = values[v.name] !== undefined && values[v.name] !== null && values[v.name] !== "";
                          return (<div key={v.id} className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-400"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasVal ? "bg-green-400" : "bg-gray-200"}`} /><span className="truncate">{v.displayLabel}</span></div>);
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={async () => { await saveProgress(); setMode("review"); setEditingSection(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors mt-2 border-t border-gray-200 pt-3 ${mode === "review" ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-gray-100"}`}>
                Review & Generate
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 px-8 py-4">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-gray-600 text-sm" title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
              {sidebarOpen ? "\u25C0" : "\u25B6"}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                {visibleSectionIndices.map((s, vi) => {
                  const isCurrent = mode === "interview" && s.idx === currentSection;
                  const isPast = mode === "review" || (mode === "interview" && visibleSectionIndices.findIndex(x => x.idx === currentSection) > vi);
                  return (<button key={s.id} onClick={() => goToSection(s.idx)} className="flex-1 group" title={s.name}><div className={`h-1.5 rounded-full transition-colors ${isPast ? "bg-brand-500" : isCurrent ? "bg-brand-400" : "bg-gray-200 group-hover:bg-gray-300"}`} /></button>);
                })}
                <button onClick={async () => { await saveProgress(); setMode("review"); }} className="flex-1 group" title="Review"><div className={`h-1.5 rounded-full transition-colors ${mode === "review" ? "bg-green-500" : "bg-gray-200 group-hover:bg-gray-300"}`} /></button>
              </div>
            </div>
          </div>

          {mode === "interview" ? (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl">
                <h2 className="text-lg font-medium text-gray-900">{section?.name}</h2>
                {section && (() => { const text = parseDesc(section.description); return text ? <p className="text-sm text-gray-500 mt-1">{text}</p> : null; })()}
                <div className="mt-6 space-y-5">
                  {sectionVars.map(v => (<InterviewField key={v.id} variable={v} subs={sectionSubs[v.name] || []} values={values} setValue={setValue} />))}
                  {sectionVars.length === 0 && <p className="text-sm text-gray-400 py-4">No fields on this page.</p>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-6 max-w-3xl">
                <button onClick={goBack} disabled={visibleSectionIndices[0]?.idx === currentSection} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">&larr; Back</button>
                <div className="flex items-center gap-3">
                  <button onClick={saveProgress} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">Save</button>
                  <button onClick={goNext} className="px-6 py-2.5 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600">{isOnLastVisible ? "Review \u2192" : "Next \u2192"}</button>
                </div>
              </div>
            </>
          ) : (
            <ReviewScreen interview={interview} values={values} setValue={setValue} isVisible={isVisible} allSubsByParent={allSubsByParent}
              editingSection={editingSection} setEditingSection={setEditingSection} goToSection={goToSection} handleGenerate={handleGenerate}
              generating={generating} goBack={goBack} saveProgress={saveProgress} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ── Review Screen ──

function ReviewScreen({ interview, values, setValue, isVisible, allSubsByParent, editingSection, setEditingSection, goToSection, handleGenerate, generating, goBack, saveProgress }: {
  interview: { sections: InterviewSection[] }; values: Record<string, any>; setValue: (name: string, val: any) => void;
  isVisible: (c: string | null) => boolean; allSubsByParent: Record<string, Variable[]>; editingSection: number | null;
  setEditingSection: (n: number | null) => void; goToSection: (idx: number) => Promise<void>;
  handleGenerate: () => Promise<void>; generating: boolean; goBack: () => void; saveProgress: () => Promise<void>;
}) {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Review your answers</h2>
        <p className="text-sm text-gray-500 mt-1">Check everything before generating. Click <strong>Edit</strong> to change answers inline, or click a section name to return to that page.</p>
      </div>

      <div className="space-y-4">
        {interview.sections.map((sec, i) => {
          if (sec.condition && !isVisible(sec.condition)) return null;
          const vars = sec.variables.filter(v => !v.isComputed && !v.name.includes(".$.") && v.type !== "info" && isVisible(v.condition));
          if (vars.length === 0) return null;
          const isEditing = editingSection === i;
          const subs: Record<string, Variable[]> = {};
          for (const v of sec.variables) { const m = v.name.match(/^(.+)\.\$\.(.+)$/); if (m) { if (!subs[m[1]]) subs[m[1]] = []; subs[m[1]].push(v); } }

          return (
            <div key={sec.id} className={`bg-white rounded-xl border transition-colors ${isEditing ? "border-brand-300 shadow-sm" : "border-gray-200"}`}>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">{sec.name}</h3>
                  <span className="text-[10px] text-gray-400">{vars.length} field{vars.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => goToSection(i)} className="text-[10px] text-gray-400 hover:text-brand-600">Go to page &rarr;</button>
                  <button onClick={async () => { if (isEditing) await saveProgress(); setEditingSection(isEditing ? null : i); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isEditing ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-600"}`}>
                    {isEditing ? "Done" : "Edit"}
                  </button>
                </div>
              </div>
              <div className="px-5 py-3">
                {isEditing ? (
                  <div className="space-y-4">{vars.map(v => (<InterviewField key={v.id} variable={v} subs={subs[v.name] || allSubsByParent[v.name] || []} values={values} setValue={setValue} />))}</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {vars.map(v => {
                      const val = values[v.name];
                      if (v.type === "repeating" && Array.isArray(val) && val.length > 0) {
                        const subList = allSubsByParent[v.name] || [];
                        const itemLabel = (v.validation as any)?.itemLabel || "Item";
                        return (
                          <div key={v.id} className="py-2">
                            <p className="text-xs font-medium text-gray-500 mb-1.5">{v.displayLabel}</p>
                            <div className="space-y-1.5">{val.map((item: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 rounded-lg px-3 py-2">
                                <p className="text-[10px] text-gray-400 mb-0.5">{itemLabel} {idx + 1}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                  {subList.filter(sq => !sq.condition || evalConditionData(sq.condition, item)).map(sq => { const field = sq.name.split(".$.")[1]; const fv = item[field]; return fv !== undefined && fv !== null && fv !== "" ? (<span key={sq.id} className="text-xs text-gray-700"><span className="text-gray-400">{sq.displayLabel}:</span> {displayValue(fv, sq.type)}</span>) : null; })}
                                </div>
                              </div>
                            ))}</div>
                          </div>
                        );
                      }
                      const empty = val === undefined || val === null || val === "";
                      return (
                        <div key={v.id} className="flex items-center justify-between py-2">
                          <span className="text-xs text-gray-500">{v.displayLabel}</span>
                          <span className={`text-xs font-medium max-w-[60%] text-right truncate ${empty ? "text-red-400" : "text-gray-800"}`}>
                            {empty ? (v.required ? "Required \u2014 empty" : "\u2014") : displayValue(val, v.type)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-8 pb-4">
        <button onClick={goBack} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">&larr; Back to interview</button>
        <button onClick={handleGenerate} disabled={generating}
          className="px-8 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 shadow-sm transition-all">
          {generating ? "Generating..." : "Generate documents"}
        </button>
      </div>
    </div>
  );
}

// ── Interview Field ──

function InterviewField({ variable, subs, values, setValue }: { variable: Variable; subs: Variable[]; values: Record<string, any>; setValue: (name: string, val: any) => void; }) {
  const v = variable;
  if (v.type === "repeating") {
    const itemLabel = (v.validation as any)?.itemLabel || "Item";
    const items: Record<string, any>[] = Array.isArray(values[v.name]) ? values[v.name] : [{}];
    return (
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-2">{v.displayLabel}{v.required && <span className="text-red-400 ml-0.5">*</span>}</label>
        {v.helpText && <p className="text-xs text-gray-400 mb-2">{v.helpText}</p>}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">{itemLabel} {idx + 1}</span>
                {items.length > 1 && (<button type="button" onClick={() => { const next = items.filter((_, i) => i !== idx); setValue(v.name, next.length > 0 ? next : [{}]); }} className="text-[10px] text-red-400 hover:text-red-600">Remove</button>)}
              </div>
              <div className="p-4 space-y-4">
                {subs.filter(sq => {
                  // Evaluate sub-question condition against THIS item's values
                  if (!sq.condition) return true;
                  return evalConditionData(sq.condition, item);
                }).map(sq => { const field = sq.name.split(".$.")[1]; return (
                  <VariableField key={`${idx}-${sq.id}`} variable={sq} value={item[field] ?? ""} onChange={(val) => { const next = [...items]; next[idx] = { ...next[idx], [field]: val }; setValue(v.name, next); }} />
                ); })}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setValue(v.name, [...items, {}])}
            className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 font-medium hover:border-brand-400 hover:text-brand-600 transition-all">+ Add {itemLabel} {items.length + 1}</button>
        </div>
      </div>
    );
  }
  return <VariableField variable={v} value={values[v.name]} onChange={(val) => setValue(v.name, val)} />;
}

// ── Variable Field ──

function VariableField({ variable, value, onChange }: { variable: Variable; value: any; onChange: (val: any) => void }) {
  const { displayLabel, type, required, helpText, validation, defaultValue } = variable;
  const currentValue = value ?? defaultValue ?? "";
  const label = (<label className="block text-sm font-medium text-gray-700 mb-1">{displayLabel}{required && <span className="text-red-400 ml-0.5">*</span>}</label>);
  const help = helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>;
  const ic = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

  switch (type) {
    case "boolean": return (<div>{label}<div className="flex items-center gap-3 mt-1">
      <button type="button" onClick={() => onChange(true)} className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${currentValue === true || currentValue === "true" ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>Yes</button>
      <button type="button" onClick={() => onChange(false)} className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${currentValue === false || currentValue === "false" ? "bg-brand-50 border-brand-300 text-brand-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>No</button>
    </div>{help}</div>);
    case "dropdown": return (<div>{label}<select value={currentValue} onChange={(e) => onChange(e.target.value)} className={ic}><option value="">Select...</option>{(validation?.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}</select>{help}</div>);
    case "date": return (<div>{label}<input type="date" value={currentValue} onChange={(e) => onChange(e.target.value)} className={ic} />{help}</div>);
    case "number": case "currency": return (<div>{label}<input type="number" value={currentValue} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")} className={ic} min={validation?.min} max={validation?.max} />{help}</div>);
    case "email": return (<div>{label}<input type="email" value={currentValue} onChange={(e) => onChange(e.target.value)} className={ic} placeholder="email@example.com" />{help}</div>);
    case "phone": return (<div>{label}<PhoneInput value={currentValue} onChange={onChange} helpText={helpText || undefined} /></div>);
    case "address": return (<div>{label}<AddressInput value={currentValue} onChange={onChange} fields={validation?.fields} helpText={helpText || undefined} /></div>);
    case "rich_text": return (<div>{label}<textarea value={currentValue} onChange={(e) => onChange(e.target.value)} className={`${ic} h-24 resize-y`} />{help}</div>);
    case "state": return (<div>{label}<select value={currentValue} onChange={(e) => onChange(e.target.value)} className={ic}><option value="">Select state...</option>{US_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>{help}</div>);
    default: return (<div>{label}<input type="text" value={currentValue} onChange={(e) => onChange(e.target.value)} className={ic} maxLength={validation?.maxLength} />{help}{validation?.maxLength && <p className="text-xs text-gray-300 mt-0.5 text-right">{String(currentValue).length}/{validation.maxLength}</p>}</div>);
  }
}

const US_STATES = [
  {value:"AL",label:"Alabama"},{value:"AK",label:"Alaska"},{value:"AZ",label:"Arizona"},{value:"AR",label:"Arkansas"},
  {value:"CA",label:"California"},{value:"CO",label:"Colorado"},{value:"CT",label:"Connecticut"},{value:"DE",label:"Delaware"},
  {value:"FL",label:"Florida"},{value:"GA",label:"Georgia"},{value:"HI",label:"Hawaii"},{value:"ID",label:"Idaho"},
  {value:"IL",label:"Illinois"},{value:"IN",label:"Indiana"},{value:"IA",label:"Iowa"},{value:"KS",label:"Kansas"},
  {value:"KY",label:"Kentucky"},{value:"LA",label:"Louisiana"},{value:"ME",label:"Maine"},{value:"MD",label:"Maryland"},
  {value:"MA",label:"Massachusetts"},{value:"MI",label:"Michigan"},{value:"MN",label:"Minnesota"},{value:"MS",label:"Mississippi"},
  {value:"MO",label:"Missouri"},{value:"MT",label:"Montana"},{value:"NE",label:"Nebraska"},{value:"NV",label:"Nevada"},
  {value:"NH",label:"New Hampshire"},{value:"NJ",label:"New Jersey"},{value:"NM",label:"New Mexico"},{value:"NY",label:"New York"},
  {value:"NC",label:"North Carolina"},{value:"ND",label:"North Dakota"},{value:"OH",label:"Ohio"},{value:"OK",label:"Oklahoma"},
  {value:"OR",label:"Oregon"},{value:"PA",label:"Pennsylvania"},{value:"RI",label:"Rhode Island"},{value:"SC",label:"South Carolina"},
  {value:"SD",label:"South Dakota"},{value:"TN",label:"Tennessee"},{value:"TX",label:"Texas"},{value:"UT",label:"Utah"},
  {value:"VT",label:"Vermont"},{value:"VA",label:"Virginia"},{value:"WA",label:"Washington"},{value:"WV",label:"West Virginia"},
  {value:"WI",label:"Wisconsin"},{value:"WY",label:"Wyoming"},{value:"DC",label:"District of Columbia"},
];

function evalRule(rule: { variable: string; operator: string; value: string; negate?: boolean }, values: Record<string, any>): boolean {
  const actual = values[rule.variable]; const actualStr = String(actual ?? ""); let result: boolean;
  switch (rule.operator) {
    case "eq": result = actualStr === rule.value; break; case "neq": result = actualStr !== rule.value; break;
    case "gt": result = Number(actual) > Number(rule.value); break; case "lt": result = Number(actual) < Number(rule.value); break;
    case "gte": result = Number(actual) >= Number(rule.value); break; case "lte": result = Number(actual) <= Number(rule.value); break;
    case "contains": result = actualStr.toLowerCase().includes(rule.value.toLowerCase()); break;
    case "truthy": result = Boolean(actual) && actual !== "false" && actual !== "0" && actualStr !== ""; break;
    case "falsy": result = !actual || actual === "false" || actual === "0" || actualStr === ""; break;
    default: result = true;
  }
  return rule.negate ? !result : result;
}

function evalConditionData(condition: string, values: Record<string, any>): boolean {
  if (!condition) return true;
  try {
    const parsed = JSON.parse(condition);
    if (parsed.groups && Array.isArray(parsed.groups)) {
      const gr = parsed.groups.map((g: any) => { const rr = g.rules.map((r: any) => evalRule(r, values)); const res = g.logic === "any" ? rr.some(Boolean) : rr.every(Boolean); return g.negate ? !res : res; });
      return parsed.groupLogic === "any" ? gr.some(Boolean) : gr.every(Boolean);
    }
    if (parsed.conditions && Array.isArray(parsed.conditions)) { const rr = parsed.conditions.map((r: any) => evalRule(r, values)); return parsed.logic === "any" ? rr.some(Boolean) : rr.every(Boolean); }
  } catch {}
  const match = condition.match(/^(\S+)\s*(==|!=|>|<)\s*["']?([^"']*)["']?$/);
  if (match) { const [,vn,op,cv] = match; const a = String(values[vn]||""); if (op==="==") return a===cv; if (op==="!=") return a!==cv; if (op===">") return Number(values[vn])>Number(cv); if (op==="<") return Number(values[vn])<Number(cv); }
  if (condition.startsWith("!")) { const v = values[condition.slice(1)]; return !v||v==="false"||v==="0"||String(v)===""; }
  const v = values[condition.trim()]; return Boolean(v) && v !== "false" && v !== "0" && String(v) !== "";
}
