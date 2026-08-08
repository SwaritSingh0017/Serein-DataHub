import { useInvestigations } from "@/hooks/useInvestigations";
import { FileText, Download, Copy, ExternalLink, Filter, Search, ChevronDown, ChevronUp, Loader2, ChevronLeft } from "lucide-react";
import { formatDate, getStatusColor, getSeverityColor, cn } from "@/lib/utils";
import type { InvestigationSummary, InvestigationDetail } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo } from "react";
import { marked } from "marked";

interface InvestigationWithReport extends InvestigationSummary {
  report?: {
    markdown: string;
    summary: string;
    sections: string[];
  };
  pull_request?: {
    repository: string;
    branch: string;
    pr_number: number;
    pr_url: string;
    commit_sha: string;
    files_changed: string[];
  };
}

export function ReportsPage() {
  const { data: investigations, isLoading, error, refetch } = useInvestigations();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedInvestigation, setSelectedInvestigation] = useState<string | null>(null);
  const [reportView, setReportView] = useState<"list" | "detail">("list");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "created_at",
    direction: "desc",
  });

  const statuses = ["all", "COMPLETED", "FAILED", "PLANNING", "COLLECTING_CONTEXT", "INVESTIGATING", "ANALYZING", "GENERATING_FIX", "GENERATING_REPORT", "CREATING_PR", "CREATED", "ARCHIVED"];
  const severities = ["all", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

  const filteredInvestigations = useMemo(() => {
    if (!investigations) return [];
    return investigations
      .filter((inv) => {
        if (searchTerm && !inv.user_problem.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        if (statusFilter !== "all" && inv.status !== statusFilter) {
          return false;
        }
        if (severityFilter !== "all" && inv.severity !== severityFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aVal = a[sortConfig.key as keyof InvestigationSummary];
        const bVal = b[sortConfig.key as keyof InvestigationSummary];
        if (aVal === undefined || bVal === undefined) return 0;
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [investigations, searchTerm, statusFilter, severityFilter, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleExportMarkdown = (report: any) => {
    const lines = [
      "# Investigation Report",
      "",
      `**Investigation ID:** ${selectedInvestigation}`,
      `**Generated:** ${new Date().toISOString()}`,
      "",
      "---",
      "",
      report.markdown,
    ];
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investigation-report-${selectedInvestigation}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = (report: any) => {
    navigator.clipboard.writeText(report.markdown);
  };

  const getSelectedInvestigation = () => {
    return investigations?.find((inv) => inv.investigation_id === selectedInvestigation) as InvestigationWithReport | undefined;
  };

  const selectedInv = getSelectedInvestigation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 max-w-4xl mx-auto">
        <CardContent className="pt-6 text-center">
          <p className="text-destructive">Failed to load reports: {error.message}</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Investigations</h1>
          <p className="text-muted-foreground mt-1">
            View and export investigation reports. {filteredInvestigations.length} of {investigations?.length || 0} shown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="border-[var(--border-light)]">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
              <Input
                placeholder="Search investigations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={(value: string | null) => value && setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={(value: string | null) => value && setSeverityFilter(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  {severities.map((s) => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All Severities" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {reportView === "list" ? (
        // List View
        <>
          <Card className="border-[var(--border-light)]">
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_100px_100px_180px_100px] gap-4 px-6 py-4 text-xs font-semibold text-[var(--fg-muted)] border-b border-[var(--border-light)]">
                <div onClick={() => handleSort("user_problem")} className="cursor-pointer flex items-center gap-1 hover:text-[var(--accent-primary)]">
                  Problem {sortConfig.key === "user_problem" && (sortConfig.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
                <div onClick={() => handleSort("status")} className="cursor-pointer text-center hover:text-[var(--accent-primary)]">
                  Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
                <div onClick={() => handleSort("severity")} className="cursor-pointer text-center hover:text-[var(--accent-primary)]">
                  Severity {sortConfig.key === "severity" && (sortConfig.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
                <div onClick={() => handleSort("created_at")} className="cursor-pointer text-center hover:text-[var(--accent-primary)]">
                  Created {sortConfig.key === "created_at" && (sortConfig.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
                <div className="text-center">Actions</div>
              </div>
              {/* Table Rows */}
              <ScrollArea className="h-[calc(100vh-400px)]">
                {filteredInvestigations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-[var(--fg-muted)]">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No reports found</p>
                    <p className="text-sm">Try adjusting your filters or search term</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-light)]">
                    {filteredInvestigations.map((inv) => (
                      <div
                        key={inv.investigation_id}
                        className="grid grid-cols-[1fr_100px_100px_180px_100px] gap-4 px-6 py-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedInvestigation(inv.investigation_id);
                          setReportView("detail");
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-[var(--fg-muted)] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{inv.user_problem}</p>
                            <p className="text-xs text-[var(--fg-muted)]">{inv.investigation_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-center">
                          <Badge className={getStatusColor(inv.status)} variant="outline">
                            {inv.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-center">
                          {inv.severity && (
                            <Badge className={getSeverityColor(inv.severity)} variant="outline">
                              {inv.severity}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-center text-sm text-[var(--fg-muted)]">
                          {formatDate(inv.created_at)}
                        </div>
                        <div className="flex items-center justify-center">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedInvestigation(inv.investigation_id); setReportView("detail"); }}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      ) : (
        // Detail View
        <Card className="border-[var(--border-light)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setReportView("list"); setSelectedInvestigation(null); }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-semibold">Report Detail</h2>
                <p className="text-sm text-[var(--fg-muted)]">{selectedInv?.investigation_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => handleCopyMarkdown(selectedInv?.report)} disabled={!selectedInv?.report}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button variant="outline" onClick={() => handleExportMarkdown(selectedInv?.report)} disabled={!selectedInv?.report}>
                <Download className="mr-2 h-4 w-4" />
                Export .md
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedInv?.report ? (
              <div className="prose prose-dark max-w-none">
                <div className="mb-6 p-4 bg-[var(--bg-tertiary)] rounded-xl">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getStatusColor(selectedInv.status)} variant="outline">
                      {selectedInv.status.replace(/_/g, " ")}
                    </Badge>
                    {selectedInv.severity && (
                      <Badge className={getSeverityColor(selectedInv.severity)} variant="outline">
                        {selectedInv.severity}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {formatDate(selectedInv.created_at)}
                    </Badge>
                  </div>
                  <p className="text-[var(--fg-secondary)]">{selectedInv.user_problem}</p>
                </div>
                <Separator />
                <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(selectedInv.report.markdown || "") }} />
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-[var(--fg-muted)] mx-auto mb-4" />
                <p className="text-[var(--fg-muted)]">No report available for this investigation</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}