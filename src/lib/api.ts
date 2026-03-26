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
  updateVariables(workflowId: string, variables: any[]) {
    return this.request<any>(`/api/workflows/${workflowId}/variables`, { method: "PUT", body: JSON.stringify({ variables }) });
  }

  // ── Matters ──
  getMatters(params?: { workflowId?: string; status?: string; search?: string }) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<any>(`/api/matters${qs ? `?${qs}` : ""}`);
  }
  getMatter(id: string) { return this.request<any>(`/api/matters/${id}`); }
  createMatter(data: any) { return this.request<any>("/api/matters", { method: "POST", body: JSON.stringify(data) }); }
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
