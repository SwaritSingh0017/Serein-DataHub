/** Main layout with sidebar navigation */

import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoSmall } from "@/components/ui/logo";

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });
  const location = useLocation();

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/reports", label: "Reports", icon: FileText },
    { path: "/investigations/new", label: "New Investigation", icon: PlusCircle },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen glass-card border-r transition-all duration-300 ease-out",
          "border-[var(--border-light)]",
          collapsed ? "w-16" : "w-64",
          "bg-[var(--sidebar-bg)]"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div
            className={cn(
              "flex items-center justify-between h-16 px-4 border-b transition-all duration-300",
              collapsed && "justify-center"
            )}
            style={{ borderColor: "var(--border-light)" }}
          >
            {!collapsed && (
              <Logo size="lg" className="animate-fade-in" />
            )}
            {collapsed && (
              <LogoSmall className="animate-fade-in" />
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg glass transition-all duration-200 hover:scale-105 hover:bg-[var(--accent-primary)/0.1] active:scale-95"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      "relative overflow-hidden",
                      collapsed ? "justify-center" : "",
                      isActive
                        ? "bg-gradient-primary text-white shadow-[0_4px_16px_-4px_rgba(140,90,230,0.4)]"
                        : "text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-tertiary)]",
                      "animate-slide-in-right"
                    )
                  }
                  title={collapsed ? item.label : undefined}
                  style={{ animationDelay: `${navItems.indexOf(item) * 40}ms` }}
                >
                  <item.icon size={20} aria-hidden="true" 
                    className={cn(
                      "transition-all duration-200",
                      isActive ? "text-white" : "text-[var(--fg-secondary)]"
                    )} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* Theme toggle & Brand */}
          <div className="p-4 border-t transition-all duration-300" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg glass transition-all duration-200 hover:scale-102 hover:bg-[var(--accent-primary)/0.08] active:scale-98"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <>
                    <Sun size={18} className="text-gradient animate-spin-slow" />
                    {!collapsed && <span className="text-sm font-medium">Light</span>}
                  </>
                ) : (
                  <>
                    <Moon size={18} className="text-gradient" />
                    {!collapsed && <span className="text-sm font-medium">Dark</span>}
                  </>
                )}
              </button>
              {!collapsed && (
                <div className="flex items-center gap-2 px-2 py-1 rounded-full glass text-xs font-medium text-[var(--fg-muted)] animate-float">
                  <Sparkles size={12} className="text-gradient" />
                  <span>Serein</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 min-h-screen transition-all duration-300 ease-out",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        {/* Header with logo */}
        <header className="h-16 px-6 border-b glass sticky top-0 z-30" style={{ borderColor: "var(--border-light)" }}>
          <div className="h-full flex items-center justify-between px-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Logo size="md" className="flex-shrink-0" />
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-[var(--fg-primary)]">Serein DataHub Agent</h1>
                <p className="text-xs text-[var(--fg-muted)]">Autonomous AI Data Engineer</p>
              </div>
            </div>

            {/* Top navigation */}
            <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-gradient-primary text-white"
                      : "text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-tertiary)]"
                  )
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/investigations/new"
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-gradient-primary text-white"
                      : "text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-tertiary)]"
                  )
                }
              >
                Investigate
              </NavLink>
              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-gradient-primary text-white"
                      : "text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-tertiary)]"
                  )
                }
              >
                Reports
              </NavLink>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <div className="p-6 animate-page-enter">
          <Outlet />
        </div>
      </main>
      
      {/* Theme transition overlay */}
      <div 
        className={cn(
          "fixed inset-0 pointer-events-none z-50 transition-opacity duration-300",
          darkMode ? "opacity-0" : "opacity-0"
        )}
        style={{ 
          background: darkMode 
            ? "radial-gradient(ellipse at center, oklch(0.18 0.06 280 / 0.15), transparent)" 
            : "radial-gradient(ellipse at center, oklch(0.95 0.05 280 / 0.08), transparent)"
        }}
        aria-hidden="true"
      />
    </div>
  );
}