const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://abbado-draft-production.up.railway.app";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `API error: ${res.status}`);
    }

    return res.json();
  }

  // ── Auth ──
  syncUser() { return this.request<any>("/api/auth/sync", { method: "POST" }); }
  getMe() { return this.request<any>("/api/auth/me"); }

  // ── Templates ──
  getTemplates(params?: { format?: string; search?: string }) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/api/templates${qs ? `?${qs}` : ""}`);
  }
  getTemplate(id: string) { return this.request<any>(`/api/templates/${id}`); }
  createTemplate(data: any) { return this.request<any>("/api/templates", { method: "POST", body: JSON.stringify(data) }); }
  updateTemplate(id: string, data: any) { return this.request<any>(`/api/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }); }

  // ── Workflows ──
  getWorkflows(params?: { category?: string; search?: string }) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/api/workflows${qs ? `?${qs}` : ""}`);
  }
  getWorkflow(id: string) { return this.request<any>(`/api/workflows/${id}`); }
  createWorkflow(data: any) { return this.request<any>("/api/workflows", { method: "POST", body: JSON.stringify(data) }); }
  updateWorkflow(id: string, data: any) { return this.request<any>(`/api/workflows/${id}`, { method: "PUT", body: JSON.stringify(data) }); }
  getInterview(workflowId: string) { return this.request<any>(`/api/workflows/${workflowId}/interview`); }
  addTemplateToWorkflow(workflowId: string, templateId: string, displayOrder: number) {
    return this.request<any>(`/api/workflows/${workflowId}/templates`, { method: "POST", body: JSON.stringify({ templateId, displayOrder }) });
  }
  removeTemplateFromWorkflow(workflowId: string, wtId: string) {
    return this.request<any>(`/api/workflows/${workflowId}/templates/${wtId}`, { method: "DELETE" });
  }
  updateVariables(workflowId: string, variables: any[]) {
    return this.request<any>(`/api/workflows/${workflowId}/variables`, { method: "PUT", body: JSON.stringify({ variables }) });
  }
  seedDemoWorkflow() {
    return this.request<any>("/api/workflows/seed-demo", { method: "POST" });
  }
  duplicateWorkflow(id: string, name?: string) {
    return this.request<any>(`/api/workflows/${id}/duplicate`, { method: "POST", body: JSON.stringify({ name }) });
  }
  deleteWorkflow(id: string) {
    return this.request<any>(`/api/workflows/${id}`, { method: "DELETE" });
  }

  // ── Matters ──
  getMatters(params?: { workflowId?: string; status?: string; search?: string }) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<any>(`/api/matters${qs ? `?${qs}` : ""}`);
  }
  getMatter(id: string) { return this.request<any>(`/api/matters/${id}`); }
  createMatter(data: any) { return this.request<any>("/api/matters", { method: "POST", body: JSON.stringify(data) }); }
  deleteMatter(id: string) { return this.request<any>(`/api/matters/${id}`, { method: "DELETE" }); }
  updateVariableValues(matterId: string, variables: any, source: string = "web") {
    return this.request<any>(`/api/matters/${matterId}/variables`, { method: "PATCH", body: JSON.stringify({ variables, source }) });
  }
  saveInterviewState(matterId: string, state: any) {
    return this.request<any>(`/api/matters/${matterId}/interview-state`, { method: "PATCH", body: JSON.stringify({ interviewState: state }) });
  }
  generateDocuments(matterId: string, mode: "live" | "final" = "live") {
    return this.request<any>(`/api/matters/${matterId}/generate`, { method: "POST", body: JSON.stringify({ mode }) });
  }
  regenerateDocuments(matterId: string) {
    return this.request<any>(`/api/matters/${matterId}/regenerate`, { method: "POST" });
  }
  getMatterDocuments(matterId: string) { return this.request<any[]>(`/api/matters/${matterId}/documents`); }
  getEditJournal(matterId: string, docId: string) { return this.request<any[]>(`/api/matters/${matterId}/documents/${docId}/journal`); }
  uploadEditedDocument(matterId: string, docId: string, fileBase64: string) {
    return this.request<any>(`/api/matters/${matterId}/documents/${docId}/upload-edited`, {
      method: "POST", body: JSON.stringify({ fileBase64 }),
    });
  }

  // ── Engine ──
  parseTemplate(fileBase64: string, fileName: string, templateId?: string) {
    return this.request<any>("/api/engine/parse-template", {
      method: "POST",
      body: JSON.stringify({ fileBase64, fileName, templateId }),
    });
  }
  detectChanges(fileBase64: string, generatedDocumentId: string) {
    return this.request<any>("/api/engine/detect-changes", {
      method: "POST",
      body: JSON.stringify({ fileBase64, generatedDocumentId }),
    });
  }
  getDownloadUrl(docId: string) { return this.request<any>(`/api/engine/download/${docId}`); }

  async downloadSampleTemplate(workflowId: string) {
    const { supabase } = await import("./supabase");
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch(`${API_URL}/api/engine/sample-template/${workflowId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to generate sample template");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowId}_sample_template.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Activity ──
  getActivity(params?: { matterId?: string; limit?: number }) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/api/activity${qs ? `?${qs}` : ""}`);
  }

  // ── Admin ──
  getUsers() { return this.request<any[]>("/api/admin/users"); }
  inviteUser(data: any) { return this.request<any>("/api/admin/users/invite", { method: "POST", body: JSON.stringify(data) }); }
  getAdapters() { return this.request<any[]>("/api/admin/adapters"); }
  getAuditLog(params?: any) {
    const qs = new URLSearchParams(params).toString();
    return this.request<any>(`/api/admin/audit${qs ? `?${qs}` : ""}`);
  }
}

export const api = new ApiClient();
