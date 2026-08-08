/** New Investigation page - create investigation form */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, AlertCircle } from "lucide-react";
import { useCreateInvestigation } from "@/hooks/useInvestigations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function NewInvestigation() {
  const [problem, setProblem] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const createMutation = useCreateInvestigation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!problem.trim()) {
      setError("Please describe the data problem");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({ user_problem: problem });
      navigate(`/investigations/${result.investigation_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create investigation");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Investigation</h1>
        <p className="text-muted-foreground mt-1">
          Describe the data problem in natural language. Serein will investigate and generate a fix.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Problem Description</CardTitle>
          <CardDescription>
            Example: "The Sales Dashboard stopped updating after yesterday's deployment."
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="problem">What happened?</Label>
              <Textarea
                id="problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="The Sales Dashboard stopped updating after yesterday's deployment..."
                rows={6}
                disabled={createMutation.isPending}
                className="font-mono text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={createMutation.isPending || !problem.trim()} className="w-full">
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Investigation...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Start Investigation
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Example problems */}
      <Card>
        <CardHeader>
          <CardTitle>Example Problems</CardTitle>
          <CardDescription>Click to use an example</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "The Sales Dashboard stopped updating after yesterday's deployment.",
              "The customer revenue numbers don't match between the warehouse and the BI tool.",
              "A dbt model failed with a column not found error after a schema change.",
              "The ML feature store is serving stale features for the recommendation model.",
            ].map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setProblem(example)}
                className="p-3 text-left border border-border rounded-lg hover:bg-accent/50 transition-colors text-sm"
              >
                {example}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}