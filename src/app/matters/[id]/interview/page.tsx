"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";

interface InterviewSection {
  id: string;
  name: string;
  description: string | null;
  condition: string | null;
  variables: Variable[];
}

interface Variable {
  id: string;
  name: string;
  displayLabel: string;
  type: string;
  required: boolean;
  defaultValue: string | null;
  validation: any;
  helpText: string | null;
  condition: string | null;
  isComputed: boolean;
  expression: string | null;
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const matterId = params.id as string;

  const [matter, setMatter] = useState<any>(null);
  const [interview, setInterview] = useState<{ sections: InterviewSection[] } | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Load matter and interview structure
  useEffect(() => {
    Promise.all([
      api.getMatter(matterId),
    ]).then(([m]) => {
      setMatter(m);
      setValues((m.variableValues as Record<string, any>) || {});

      // Load interview state if exists
      if (m.interviewState?.currentSection) {
        setCurrentSection(m.interviewState.currentSection);
      }

      // Load interview structure from workflow
      return api.getInterview(m.workflowId);
    }).then((interview) => {
      setInterview(interview);
      setLoading(false);
    }).catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, [matterId]);

  // Update a variable value
  const setValue = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  // Evaluate a condition (supports both legacy string and new JSON multi-condition format)
  const isVisible = (condition: string | null): boolean => {
    if (!condition) return true;
    try {
      // Try JSON format first (multi-condition)
      const parsed = JSON.parse(condition);
      if (parsed.conditions && Array.isArray(parsed.conditions)) {
        const results = parsed.conditions.map((rule: any) => evalRule(rule, values));
        return parsed.logic === "any" ? results.some(Boolean) : results.every(Boolean);
      }
    } catch {
      // Legacy single-condition format
      return evalLegacyCondition(condition, values);
    }
    return true;
  };

  // Save current progress
  const saveProgress = async () => {
    try {
      await api.updateVariableValues(matterId, values, "interview");
      await api.saveInterviewState(matterId, {
        currentSection,
        completedSections: currentSection,
        savedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Save error:", err);
    }
  };

  // Navigate sections (skip pages whose conditions aren't met)
  const goNext = async () => {
    if (!interview) return;
    await saveProgress();
    let next = currentSection + 1;
    while (next < interview.sections.length) {
      const sec = interview.sections[next];
      if (!sec.condition || isVisible(sec.condition)) break;
      next++;
    }
    if (next < interview.sections.length) setCurrentSection(next);
  };

  const goBack = () => {
    if (!interview) return;
    let prev = currentSection - 1;
    while (prev >= 0) {
      const sec = interview.sections[prev];
      if (!sec.condition || isVisible(sec.condition)) break;
      prev--;
    }
    if (prev >= 0) setCurrentSection(prev);
  };

  // Find if we're on the last visible section
  const isLastVisible = (() => {
    if (!interview) return true;
    for (let i = currentSection + 1; i < interview.sections.length; i++) {
      const sec = interview.sections[i];
      if (!sec.condition || isVisible(sec.condition)) return false;
    }
    return true;
  })();

  // Generate documents
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await saveProgress();
      await api.generateDocuments(matterId, "live");
      router.push(`/matters/${matterId}`);
    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
    }
  };

  if (loading) return <AppShell><p className="text-gray-400">Loading interview...</p></AppShell>;
  if (error) return <AppShell><p className="text-red-600">{error}</p></AppShell>;
  if (!interview || !matter) return <AppShell><p className="text-gray-400">Not found</p></AppShell>;

  const section = interview.sections[currentSection];
  const isLastSection = isLastVisible;
  const visibleVars = section?.variables.filter((v) => !v.isComputed && isVisible(v.condition)) || [];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{matter.name}</p>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">Interview</h1>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {interview.sections.map((s, i) => {
            const sectionVisible = !s.condition || isVisible(s.condition);
            return (
              <div key={s.id} className={`flex-1 ${!sectionVisible ? "opacity-30" : ""}`}>
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    !sectionVisible ? "bg-gray-200 border border-dashed border-gray-300" :
                    i < currentSection ? "bg-brand-500" :
                    i === currentSection ? "bg-brand-500" :
                    "bg-gray-200"
                  }`}
                />
                <p className={`text-xs mt-1.5 ${!sectionVisible ? "text-gray-300 line-through" : i === currentSection ? "text-brand-700 font-medium" : "text-gray-400"}`}>
                  {s.name}
                </p>
              </div>
            );
          })}
        </div>

        {/* Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">{section.name}</h2>
          {section.description && <p className="text-sm text-gray-500 mt-1">{section.description}</p>}

          <div className="mt-6 space-y-5">
            {visibleVars.map((v) => (
              <VariableField
                key={v.id}
                variable={v}
                value={values[v.name]}
                onChange={(val) => setValue(v.name, val)}
              />
            ))}

            {visibleVars.length === 0 && (
              <p className="text-sm text-gray-400 py-4">No fields in this section for the current configuration.</p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={goBack}
            disabled={currentSection === 0}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={saveProgress}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
            >
              Save progress
            </button>

            {isLastSection ? (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-6 py-2.5 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                {generating ? "Generating documents..." : "Generate documents"}
              </button>
            ) : (
              <button
                onClick={goNext}
                className="px-6 py-2.5 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Variable Field Component ──

function VariableField({ variable, value, onChange }: { variable: Variable; value: any; onChange: (val: any) => void }) {
  const { displayLabel, type, required, helpText, validation, defaultValue } = variable;
  const currentValue = value ?? defaultValue ?? "";

  const label = (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {displayLabel}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );

  const help = helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>;
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none";

  switch (type) {
    case "boolean":
      return (
        <div>
          {label}
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => onChange(true)}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                currentValue === true || currentValue === "true"
                  ? "bg-brand-50 border-brand-300 text-brand-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >Yes</button>
            <button
              onClick={() => onChange(false)}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                currentValue === false || currentValue === "false"
                  ? "bg-brand-50 border-brand-300 text-brand-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >No</button>
          </div>
          {help}
        </div>
      );

    case "dropdown":
      const options = validation?.options || [];
      return (
        <div>
          {label}
          <select value={currentValue} onChange={(e) => onChange(e.target.value)} className={inputClass}>
            <option value="">Select...</option>
            {options.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {help}
        </div>
      );

    case "date":
      return (
        <div>
          {label}
          <input type="date" value={currentValue} onChange={(e) => onChange(e.target.value)} className={inputClass} />
          {help}
        </div>
      );

    case "number":
    case "currency":
      return (
        <div>
          {label}
          <input
            type="number"
            value={currentValue}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
            className={inputClass}
            min={validation?.min}
            max={validation?.max}
          />
          {help}
        </div>
      );

    case "email":
      return (
        <div>
          {label}
          <input type="email" value={currentValue} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="email@example.com" />
          {help}
        </div>
      );

    case "phone":
      return (
        <div>
          {label}
          <input type="tel" value={currentValue} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="(555) 555-5555" />
          {help}
        </div>
      );

    case "rich_text":
      return (
        <div>
          {label}
          <textarea value={currentValue} onChange={(e) => onChange(e.target.value)} className={`${inputClass} h-24 resize-y`} />
          {help}
        </div>
      );

    default: // text
      return (
        <div>
          {label}
          <input
            type="text"
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            maxLength={validation?.maxLength}
          />
          {help}
          {validation?.maxLength && (
            <p className="text-xs text-gray-300 mt-0.5 text-right">
              {String(currentValue).length}/{validation.maxLength}
            </p>
          )}
        </div>
      );
  }
}

// ── Condition evaluation helpers ──

function evalRule(rule: { variable: string; operator: string; value: string }, values: Record<string, any>): boolean {
  const actual = values[rule.variable];
  const actualStr = String(actual ?? "");

  switch (rule.operator) {
    case "eq": return actualStr === rule.value;
    case "neq": return actualStr !== rule.value;
    case "gt": return Number(actual) > Number(rule.value);
    case "lt": return Number(actual) < Number(rule.value);
    case "truthy": return Boolean(actual) && actual !== "false" && actual !== "0" && actualStr !== "";
    case "falsy": return !actual || actual === "false" || actual === "0" || actualStr === "";
    default: return true;
  }
}

function evalLegacyCondition(condition: string, values: Record<string, any>): boolean {
  const match = condition.match(/^(\S+)\s*(==|!=|>|<)\s*["']?([^"']*)["']?$/);
  if (match) {
    const [, varName, op, compareVal] = match;
    const actual = String(values[varName] || "");
    if (op === "==") return actual === compareVal;
    if (op === "!=") return actual !== compareVal;
    if (op === ">") return Number(values[varName]) > Number(compareVal);
    if (op === "<") return Number(values[varName]) < Number(compareVal);
  }
  if (condition.startsWith("!")) {
    const v = values[condition.slice(1)];
    return !v || v === "false" || v === "0" || String(v) === "";
  }
  const v = values[condition.trim()];
  return Boolean(v) && v !== "false" && v !== "0" && String(v) !== "";
}
