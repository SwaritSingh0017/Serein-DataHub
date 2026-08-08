/** React Query hooks for investigations */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { InvestigationSummary, InvestigationDetail, TimelineEvent, GeneratedFix, GeneratedReport } from "../types";

export function useInvestigations() {
  return useQuery({
    queryKey: ["investigations"],
    queryFn: () => api.investigations.list(),
  });
}

export function useInvestigation(id: string | null) {
  return useQuery({
    queryKey: ["investigations", id],
    queryFn: () => api.investigations.get(id!),
    enabled: !!id,
  });
}

export function useInvestigationTimeline(id: string | null) {
  return useQuery({
    queryKey: ["investigations", id, "timeline"],
    queryFn: () => api.investigations.getTimeline(id!),
    enabled: !!id,
  });
}

export function useInvestigationFix(id: string | null) {
  return useQuery({
    queryKey: ["investigations", id, "fix"],
    queryFn: () => api.investigations.getFix(id!),
    enabled: !!id,
  });
}

export function useInvestigationReport(id: string | null) {
  return useQuery({
    queryKey: ["investigations", id, "report"],
    queryFn: () => api.investigations.getReport(id!),
    enabled: !!id,
  });
}

export function useCreateInvestigation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.investigations.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
    },
  });
}