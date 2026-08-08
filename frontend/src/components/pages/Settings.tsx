/** Settings page */

import { useState } from "react";
import { Loader2, Save, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export function Settings() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const settings = {
    llm: {
      provider: "nim",
      model: "qwen2.5-coder",
      nimApiKey: "",
      nimBaseUrl: "https://integrate.api.nvidia.com/v1",
      ollamaBaseUrl: "http://localhost:11434/v1",
      temperature: 0.2,
      timeout: 60,
    },
    datahub: {
      provider: "fixtures",
      mcpUrl: "",
      mcpToken: "",
      graphqlUrl: "",
      graphqlToken: "",
      timeout: 15,
      fixture: "sales_dashboard",
    },
    github: {
      token: "",
      repository: "",
      baseBranch: "main",
      draftPr: true,
    },
    ui: {
      theme: "dark",
      compactMode: false,
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // In a real app, this would save to localStorage or backend
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure Serein DataHub Agent</p>
      </div>

      {/* LLM Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>LLM Provider</CardTitle>
              <CardDescription>Configure the language model for AI agents</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {saved && <span className="flex items-center gap-1 text-green-400"><Check size={16} /> Saved</span>}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select defaultValue={settings.llm.provider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nim">NVIDIA NIM (Primary)</SelectItem>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  <SelectItem value="stub">Stub (Testing)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Input defaultValue={settings.llm.model} placeholder="qwen2.5-coder" />
            </div>
          </div>

          <Separator />

          <h4 className="font-medium">NVIDIA NIM Configuration</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                defaultValue={settings.llm.nimApiKey}
                placeholder="Enter NVIDIA API key"
              />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input defaultValue={settings.llm.nimBaseUrl} placeholder="https://integrate.api.nvidia.com/v1" />
            </div>
          </div>

          <Separator />

          <h4 className="font-medium">Ollama Configuration</h4>
          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input defaultValue={settings.llm.ollamaBaseUrl} placeholder="http://localhost:11434/v1" />
          </div>

          <Separator />

          <h4 className="font-medium">Generation Parameters</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input type="number" step="0.1" min="0" max="2" defaultValue={settings.llm.temperature} />
            </div>
            <div className="space-y-2">
              <Label>Timeout (seconds)</Label>
              <Input type="number" min="1" max="300" defaultValue={settings.llm.timeout} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DataHub Settings */}
      <Card>
        <CardHeader>
          <CardTitle>DataHub Integration</CardTitle>
          <CardDescription>Configure connection to DataHub metadata platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select defaultValue={settings.datahub.provider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcp">MCP Server</SelectItem>
                  <SelectItem value="fixtures">Fixtures (Offline/Demo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Fixture</Label>
              <Input defaultValue={settings.datahub.fixture} placeholder="sales_dashboard" />
            </div>
          </div>

          <Separator />

          <h4 className="font-medium">MCP Server</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>MCP URL</Label>
              <Input defaultValue={settings.datahub.mcpUrl} placeholder="http://localhost:8080" />
            </div>
            <div className="space-y-2">
              <Label>MCP Token</Label>
              <Input type="password" defaultValue={settings.datahub.mcpToken} placeholder="Bearer token" />
            </div>
          </div>

          <Separator />

          <h4 className="font-medium">GraphQL Fallback</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>GraphQL URL</Label>
              <Input defaultValue={settings.datahub.graphqlUrl} placeholder="https://datahub.example.com/api/graphql" />
            </div>
            <div className="space-y-2">
              <Label>GraphQL Token</Label>
              <Input type="password" defaultValue={settings.datahub.graphqlToken} placeholder="Bearer token" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Timeout (seconds)</Label>
            <Input type="number" min="1" max="120" defaultValue={settings.datahub.timeout} />
          </div>
        </CardContent>
      </Card>

      {/* GitHub Settings */}
      <Card>
        <CardHeader>
          <CardTitle>GitHub Integration</CardTitle>
          <CardDescription>Configure GitHub for pull request creation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Personal Access Token</Label>
              <Input type="password" defaultValue={settings.github.token} placeholder="ghp_..." />
            </div>
            <div className="space-y-2">
              <Label>Repository</Label>
              <Input defaultValue={settings.github.repository} placeholder="owner/repo" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Base Branch</Label>
              <Input defaultValue={settings.github.baseBranch} placeholder="main" />
            </div>
            <div className="space-y-2">
              <Label>Draft PR</Label>
              <div className="flex items-center gap-2">
                <Switch defaultChecked={settings.github.draftPr} />
                <span className="text-sm">Create PRs as draft</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UI Settings */}
      <Card>
        <CardHeader>
          <CardTitle>UI Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select defaultValue={settings.ui.theme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Compact Mode</Label>
              <div className="flex items-center gap-2">
                <Switch defaultChecked={settings.ui.compactMode} />
                <span className="text-sm">Reduced spacing</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}