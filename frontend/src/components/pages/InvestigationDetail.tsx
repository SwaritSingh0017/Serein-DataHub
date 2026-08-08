/** Investigation Detail page */

import { useParams } from "react-router-dom";
import { useInvestigation, useInvestigationTimeline, useInvestigationFix, useInvestigationReport } from "@/hooks/useInvestigations";
import { Loader2, ChevronRight, FileCode, GitBranch, AlertCircle, CheckCircle, Database, Search, Users, Brain, Wrench, Clipboard, ArrowRight } from "lucide-react";
import { formatDate, getStatusColor, getSeverityColor, cn } from "@/lib/utils";
import type { InvestigationDetail } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const AGENT_ORDER = [
  { key: "PLANNER", label: "Planner", icon: Brain, description: "Creates investigation plan" },
  { key: "INVESTIGATOR", label: "Investigator", icon: Search, description: "Gathers DataHub context" },
  { key: "ROOT_CAUSE", label: "Root Cause", icon: AlertCircle, description: "Analyzes and finds cause" },
  { key: "FIX", label: "Fix Generator", icon: Wrench, description: "Generates production fix" },
  { key: "DOCS", label: "Documentation", icon: Clipboard, description: "Creates investigation report" },
  { key: "GITHUB", label: "GitHub", icon: GitBranch, description: "Creates pull request" },
];

export function InvestigationDetailPage() {
  const { investigation_id } = useParams();
  const { data: investigation, isLoading, error } = useInvestigation(investigation_id || null);
  const { data: timeline } = useInvestigationTimeline(investigation_id || null);
  const { data: fix } = useInvestigationFix(investigation_id || null);
  const { data: report } = useInvestigationReport(investigation_id || null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <Card className="border-destructive/30 max-w-2xl mx-auto">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Investigation Not Found</h2>
          <p className="text-muted-foreground mb-4">{error?.message || "Unknown error"}</p>
        </CardContent>
      </Card>
    );
  }

  const inv = investigation as InvestigationDetail;
  const completedAgents = timeline?.filter(t => t.status === "COMPLETED").map(t => t.agent) || [];
  const runningAgent = timeline?.find(t => t.status === "RUNNING")?.agent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Investigation {inv.investigation_id}</h1>
            <Badge className={getStatusColor(inv.status)} variant="outline">
              {inv.status.replace(/_/g, " ")}
            </Badge>
            {inv.severity && (
              <Badge className={getSeverityColor(inv.severity)} variant="outline">
                {inv.severity}
              </Badge>
            )}
            {inv.degraded && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                Degraded Mode
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg">{inv.user_problem}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Created {formatDate(inv.created_at)}
          </span>
        </div>
      </div>

      {/* Agent Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {AGENT_ORDER.map((agent, index) => {
              const completed = completedAgents.includes(agent.key);
              const running = runningAgent === agent.key;
              const isLast = index === AGENT_ORDER.length - 1;

              return (
                <div key={agent.key} className="flex items-center gap-4 relative">
                  {/* Connector line */}
                  {!isLast && (
                    <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-border" style={{ zIndex: 0 }} />
                  )}

                  {/* Status indicator */}
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 z-10",
                    completed ? "bg-green-500 border-green-500 text-white" :
                    running ? "bg-blue-500 border-blue-500 text-white animate-pulse" :
                    "bg-muted border-muted text-muted-foreground"
                  )}>
                    {completed && <CheckCircle size={16} />}
                    {running && <Loader2 size={16} className="animate-spin" />}
                    {!completed && !running && <span className="text-sm font-medium">{index + 1}</span>}
                  </div>

                  {/* Agent info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <agent.icon size={18} className={cn(
                        completed ? "text-green-400" :
                        running ? "text-blue-400" :
                        "text-muted-foreground"
                      )} />
                      <div>
                        <p className={cn("font-medium", completed || running ? "" : "text-muted-foreground")}>
                          {agent.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{agent.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <Badge
                    variant={completed ? "default" : running ? "secondary" : "outline"}
                    className={cn(
                      completed ? "bg-green-500/20 text-green-400" :
                      running ? "bg-blue-500/20 text-blue-400" : ""
                    )}
                  >
                    {completed ? "Done" : running ? "Running" : "Pending"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {timeline?.map((event) => (
                <div key={event.id} className="flex items-start gap-3 text-sm">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      {event.agent.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{event.event}</p>
                    <p className="text-muted-foreground">
                      {formatDate(event.timestamp)} · {event.agent}
                    </p>
                  </div>
                  <Badge
                    variant={event.status === "COMPLETED" ? "default" :
                            event.status === "FAILED" ? "destructive" :
                            event.status === "RUNNING" ? "secondary" : "outline"}
                    className={cn(
                      event.status === "COMPLETED" && "bg-green-500/20 text-green-400",
                      event.status === "FAILED" && "bg-red-500/20 text-red-400",
                      event.status === "RUNNING" && "bg-blue-500/20 text-blue-400"
                    )}
                  >
                    {event.status}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Tabs for detailed content */}
      <Tabs defaultValue="context" className="space-y-4">
        <TabsList>
          <TabsTrigger value="context">DataHub Context</TabsTrigger>
          <TabsTrigger value="root-cause">Root Cause</TabsTrigger>
          <TabsTrigger value="fix">Generated Fix</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          {inv.pull_request?.pr_url && (
            <TabsTrigger value="pr">Pull Request</TabsTrigger>
          )}
        </TabsList>

        {/* DataHub Context */}
        <TabsContent value="context" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Assets ({inv.context?.assets?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              {inv.context?.assets?.map((asset) => (
                <div key={asset.urn} className="p-3 border border-border rounded-lg mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database size={18} className="text-primary" />
                      <span className="font-mono text-sm">{asset.name}</span>
                    </div>
                    <Badge variant="outline">{asset.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{asset.urn}</p>
                  {asset.description && (
                    <p className="text-sm mt-1">{asset.description}</p>
                  )}
                </div>
              ))}
              {!inv.context?.assets?.length && (
                <p className="text-muted-foreground text-center py-8">No assets retrieved</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Lineage ({inv.context?.lineage?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              {inv.context?.lineage?.map((edge, i) => (
                <div key={i} className="p-3 border border-border rounded-lg mb-2 flex items-center gap-2 text-sm">
                  <Search size={16} className="text-muted-foreground" />
                  <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{edge.source_urn}</code>
                  <ChevronRight size={14} className="text-muted-foreground" />
                  <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{edge.target_urn}</code>
                  <Badge variant="outline" className="ml-auto text-xs">{edge.relationship}</Badge>
                </div>
              ))}
              {!inv.context?.lineage?.length && (
                <p className="text-muted-foreground text-center py-8">No lineage data</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ownership ({inv.context?.ownership?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              {inv.context?.ownership?.map((own, i) => (
                <div key={i} className="p-3 border border-border rounded-lg mb-2 flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  <div>
                    <p className="font-medium">{own.owner_name}</p>
                    <p className="text-sm text-muted-foreground">{own.role || "Owner"}</p>
                  </div>
                </div>
              ))}
              {!inv.context?.ownership?.length && (
                <p className="text-muted-foreground text-center py-8">No ownership data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Root Cause */}
        <TabsContent value="root-cause" className="space-y-4">
          {inv.root_cause ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Root Cause Analysis</CardTitle>
                    <Badge variant="outline" className={cn(
                      inv.root_cause.confidence >= 0.7 ? "bg-green-500/20 text-green-400" :
                      inv.root_cause.confidence >= 0.4 ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    )}>
                      Confidence: {(inv.root_cause.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="whitespace-pre-wrap">{inv.root_cause.root_cause}</p>
                  </div>

                  {inv.root_cause.evidence?.length && (
                    <div>
                      <h4 className="font-medium mb-2">Evidence</h4>
                      <div className="space-y-2">
                        {inv.root_cause.evidence.map((e, i) => (
                          <div key={i} className="p-3 border border-border rounded-lg">
                            <p className="text-sm font-mono text-primary mb-1">{e.asset_urn}</p>
                            <p className="text-sm">{e.fact}</p>
                            <p className="text-xs text-muted-foreground">Source: {e.source}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {inv.root_cause.rejected_hypotheses?.length && (
                    <div>
                      <h4 className="font-medium mb-2">Rejected Hypotheses</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {inv.root_cause.rejected_hypotheses.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Wrench size={18} className="text-primary" />
                    <span className="font-medium">Recommended Fix Type: </span>
                    <Badge variant="outline">{inv.root_cause.recommended_fix_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Root cause analysis not yet generated</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Generated Fix */}
        <TabsContent value="fix" className="space-y-4">
          {inv.fix && inv.fix.files.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{inv.fix.title}</CardTitle>
                    <Badge variant={inv.fix.risk === "HIGH" ? "destructive" :
                                 inv.fix.risk === "MEDIUM" ? "secondary" : "outline"}>
                      Risk: {inv.fix.risk}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{inv.fix.description}</p>

                  <div>
                    <h4 className="font-medium mb-2">Files ({inv.fix.files.length})</h4>
                    <div className="space-y-2">
                      {inv.fix.files.map((file, i) => (
                        <div key={i} className="border border-border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 bg-muted">
                            <div className="flex items-center gap-2">
                              <FileCode size={16} />
                              <span className="font-mono text-sm">{file.path}</span>
                              {file.is_new && <Badge variant="secondary" className="text-xs">New</Badge>}
                            </div>
                            <Badge variant="outline" className="text-xs capitalize">{file.language}</Badge>
                          </div>
                          <pre className="p-3 bg-muted/50 overflow-x-auto max-h-96">
                            <code className="font-mono text-sm">{file.content}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>

                  {inv.fix.validation_steps?.length && (
                    <div>
                      <h4 className="font-medium mb-2">Validation Steps</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {inv.fix.validation_steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No fix generated yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Report */}
        <TabsContent value="report" className="space-y-4">
          {inv.report ? (
            <Card>
              <CardHeader><CardTitle>Investigation Report</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-dark max-w-none whitespace-pre-wrap">
                  {inv.report.markdown}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Clipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Report not yet generated</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pull Request */}
        <TabsContent value="pr" className="space-y-4">
          {inv.pull_request?.pr_url ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pull Request Created</CardTitle>
                  <a
                    href={inv.pull_request.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <GitBranch size={16} />
                    View on GitHub
                    <ArrowRight size={14} />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="p-3 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground">Repository</p>
                    <p className="font-mono text-sm">{inv.pull_request.repository}</p>
                  </div>
                  <div className="p-3 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground">Branch</p>
                    <p className="font-mono text-sm">{inv.pull_request.branch}</p>
                  </div>
                  <div className="p-3 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground">PR Number</p>
                    <p className="font-mono text-sm">#{inv.pull_request.pr_number}</p>
                  </div>
                  <div className="p-3 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground">Commit</p>
                    <p className="font-mono text-sm">{inv.pull_request.commit_sha.slice(0, 8)}</p>
                  </div>
                </div>
                {inv.pull_request.files_changed?.length && (
                  <div>
                    <h4 className="font-medium mb-2">Files Changed</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm font-mono">
                      {inv.pull_request.files_changed.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pull request created</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}