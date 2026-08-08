import { ArrowRight, Database, GitBranch, Brain, Search, Zap, Shield, CheckCircle, ArrowRight as ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Brain,
    title: "Autonomous Investigation",
    description: "Enter a natural language problem. Serein plans, investigates, finds root cause, generates fix, documents, and creates a PR — automatically."
  },
  {
    icon: Database,
    title: "DataHub Native",
    description: "Deep integration with DataHub MCP Server. Retrieves schemas, lineage, ownership, tags, domains, and glossary terms automatically."
  },
  {
    icon: Search,
    title: "Evidence-Based Root Cause",
    description: "Every finding cites specific DataHub metadata. Confidence scores. Rejected hypotheses documented. No hallucinations."
  },
  {
    icon: Zap,
    title: "Production-Ready Fixes",
    description: "Generates complete, runnable code — SQL, dbt models, Python, YAML, configs. Includes validation steps and risk assessment."
  },
  {
    icon: GitBranch,
    title: "GitHub Integration",
    description: "Creates branch, commits fix files, adds investigation report, opens draft PR with full context. Review, don't write."
  },
  {
    icon: Shield,
    title: "Resilient by Design",
    description: "Graceful degradation at every layer. Fixtures fallback for DataHub. Stub LLMs for offline. Stub GitHub for no-cred demos."
  }
];

const techStack = [
  { category: "Backend", items: ["FastAPI", "LangGraph", "Pydantic V2", "Uvicorn"] },
  { category: "Frontend", items: ["React 18", "TypeScript", "Vite", "Tailwind CSS v4", "shadcn/ui"] },
  { category: "AI / Orchestration", items: ["LangGraph", "NVIDIA NIM (qwen2.5-coder)", "Ollama fallback"] },
  { category: "Integrations", items: ["DataHub MCP", "GraphQL fallback", "PyGithub", "JSON Fixtures"] },
  { category: "Testing", items: ["pytest", "pytest-asyncio", "Stub providers"] },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <span className="text-xs font-medium text-[var(--accent-primary)]">Build with DataHub Agent Hackathon 2026</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <span className="text-gradient">Serein</span> DataHub Agent
          </h1>
          
          <p className="text-xl lg:text-2xl text-[var(--fg-secondary)] max-w-3xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '300ms' }}>
            An autonomous AI Data Engineer that investigates enterprise data problems using DataHub's metadata graph, lineage, ownership, and schemas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '400ms' }}>
            <Button size="lg" className="group" onClick={() => window.location.href = "/investigations/new"}>
              Start Investigation
              <ArrowRightIcon className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.location.href = "/dashboard"}>
              View Dashboard
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--fg-muted)] animate-fade-in" style={{ animationDelay: '500ms' }}>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[var(--success)]" /> Works offline</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[var(--success)]"/ > DataHub MCP native</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[var(--success)]"/ > GitHub PR ready</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[var(--success)]"/ > Apache 2.0</span>
          </div>
        </div>

        {/* Floating cards animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-primary rounded-2xl opacity-10 blur-3xl animate-float" style={{ animationDelay: '0s', animationDuration: '8s' }} />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-primary opacity-10 blur-3xl animate-float" style={{ animationDelay: '2s', animationDuration: '10s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[var(--accent-primary)] opacity-5 blur-3xl animate-pulse-glow" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">How It Works</h2>
            <p className="text-xl text-[var(--fg-secondary)] max-w-2xl mx-auto">Six specialized agents. One seamless investigation. Zero manual digging.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={feature.title} variant="glass" className="group hover:-translate-y-1 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${100 + index * 50}ms` }}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 glass rounded-xl text-gradient">
                      <feature.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--fg-secondary)]">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Flow */}
      <section className="py-20 lg:py-28 px-6 bg-gradient-subtle">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">Investigation Pipeline</h2>
            <p className="text-xl text-[var(--fg-secondary)] max-w-2xl mx-auto">Every investigation flows through six specialized agents. No chat. No shortcuts. Real engineering work.</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--border-light)]" style={{ top: '60px' }} />
            
            <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
              {[
                { step: 1, label: "Problem", desc: "Natural language", icon: Search, color: "bg-[var(--accent-primary)]" },
                { step: 2, label: "Planner", desc: "Plan & hypotheses", icon: Brain, color: "bg-[var(--accent-secondary)]" },
                { step: 3, label: "Investigator", desc: "DataHub context", icon: Database, color: "bg-[var(--accent-tertiary)]" },
                { step: 4, label: "Root Cause", desc: "Evidence + confidence", icon: Shield, color: "bg-[var(--accent-primary)]" },
                { step: 5, label: "Fix Generator", desc: "Code + validation", icon: Zap, color: "bg-[var(--accent-secondary)]" },
                { step: 6, label: "Documentation", desc: "8-section report", icon: GitBranch, color: "bg-[var(--accent-tertiary)]" },
                { step: 7, label: "GitHub PR", desc: "Ready to review", icon: GitBranch, color: "bg-[var(--success)]" },
              ].map((item, index) => (
                <div key={item.step} className="flex flex-col items-center relative z-10" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${item.color} shadow-lg group`}>
                      <item.icon className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  </div>
                  <div className="mt-4 text-center w-32">
                    <p className="font-semibold text-[var(--fg-primary)]">{item.label}</p>
                    <p className="text-xs text-[var(--fg-muted)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 lg:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">Tech Stack</h2>
            <p className="text-xl text-[var(--fg-secondary)] max-w-2xl mx-auto">Modern, typed, resilient. Every layer chosen for reliability and developer experience.</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {techStack.map((category, index) => (
              <Card key={category.category} variant="glass" className="animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[var(--fg-secondary)]">{category.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {category.items.map(item => (
                      <span key={item} className="px-3 py-1 text-xs font-medium rounded-full glass border-[var(--border-light)] text-[var(--fg-secondary)]">
                        {item}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-strong rounded-3xl p-10 lg:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-primary opacity-5" />
            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">Ready to Investigate?</h2>
              <p className="text-xl text-[var(--fg-secondary)] mb-10 max-w-2xl mx-auto">
                Stop manually digging through schemas and lineage. Let Serein do the engineering work.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="group w-full sm:w-auto" onClick={() => window.location.href = "/investigations/new"}>
                  Create Your First Investigation
                  <ArrowRightIcon className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => window.location.href = "/dashboard"}>
                  Explore Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t" style={{ borderColor: 'var(--border-light)' }}>
        <div className="max-w-6xl mx-auto text-center text-sm text-[var(--fg-muted)]">
          <p>Built for <strong>Build with DataHub: The Agent Hackathon 2026</strong></p>
          <p className="mt-2">Apache 2.0 License · <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">GitHub Repository</a></p>
        </div>
      </footer>
    </div>
  );
}