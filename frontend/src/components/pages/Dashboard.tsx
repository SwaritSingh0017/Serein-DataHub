/** Dashboard page - overview of investigations */

import { useInvestigations } from "@/hooks/useInvestigations";
import { Eye, Clock, AlertCircle, CheckCircle, XCircle, Loader2, FileText, PlusCircle, ArrowRight } from "lucide-react";
import { formatDate, getStatusColor, getSeverityColor } from "@/lib/utils";
import type { InvestigationSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function Dashboard() {
  const { data: investigations, isLoading, error } = useInvestigations();

  const stats = investigations ? {
    total: investigations.length,
    active: investigations.filter(i => 
      ["PLANNING", "COLLECTING_CONTEXT", "INVESTIGATING", "ANALYZING", "GENERATING_FIX", "GENERATING_REPORT", "CREATING_PR"]
      .includes(i.status)
    ).length,
    completed: investigations.filter(i => i.status === "COMPLETED").length,
    failed: investigations.filter(i => i.status === "FAILED").length,
  } : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load investigations: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your data investigations</p>
        </div>
        <Link to="/investigations/new">
          <Button>
            <PlusCircle size={18} className="mr-2" />
            New Investigation
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All investigations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.active}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">Successfully done</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Investigations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Investigations</CardTitle>
        </CardHeader>
        <CardContent>
          {investigations && investigations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No investigations yet</h3>
              <p className="text-muted-foreground mb-4">Start your first investigation to see it here</p>
              <Link to="/investigations/new">
                <Button>
                  <PlusCircle size={18} className="mr-2" />
                  Create Investigation
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {investigations?.slice(0, 10).map((inv: InvestigationSummary) => (
                <Link
                  key={inv.investigation_id}
                  to={`/investigations/${inv.investigation_id}`}
                  className="block p-4 hover:bg-accent/50 rounded-lg border border-border transition-colors flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(inv.status)} variant="outline">
                        {inv.status.replace(/_/g, " ")}
                      </Badge>
                      {inv.severity && (
                        <Badge className={getSeverityColor(inv.severity)} variant="outline">
                          {inv.severity}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-lg font-medium truncate">{inv.user_problem}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {formatDate(inv.created_at)}
                      {inv.degraded && " · Degraded mode"}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}