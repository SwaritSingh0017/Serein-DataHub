/** API service for communicating with the backend */

import type {
  CreateInvestigationRequest,
  CreateInvestigationResponse,
  InvestigationSummary,
  InvestigationDetail,
  TimelineEvent,
  GeneratedFix,
  GeneratedReport,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  investigations: {
    create: (data: CreateInvestigationRequest) =>
      fetchJson<CreateInvestigationResponse>("/investigations/", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    list: (limit = 50, offset = 0) =>
      fetchJson<InvestigationSummary[]>(`/investigations/?limit=${limit}&offset=${offset}`),

    get: (id: string) =>
      fetchJson<InvestigationDetail>(`/investigations/${id}`),

    getTimeline: (id: string) =>
      fetchJson<TimelineEvent[]>(`/investigations/${id}/timeline`),

    getFix: (id: string) =>
      fetchJson<GeneratedFix>(`/investigations/${id}/fix`),

    getReport: (id: string) =>
      fetchJson<GeneratedReport>(`/investigations/${id}/report`),
  },

  health: () => fetchJson<{ status: string; service: string }>("/health"),
};