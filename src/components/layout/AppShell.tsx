import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Bell, Building2, Calculator, ClipboardCheck, Database, FolderKanban, KanbanSquare, LogOut, Settings, Sparkles, UserCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { planLabel, useAuth } from "@/lib/auth";

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/properties", label: "Immobilien", icon: Database },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/projects", label: "Projekte", icon: FolderKanban },
  { to: "/rechner", label: "Rechner", icon: Calculator },
  { to: "/followups", label: "Follow-ups", icon: Bell },
  { to: "/viewing", label: "Besichtigung", icon: ClipboardCheck },
  { to: "/assumptions", label: "Einstellungen", icon: Settings },
];

function ProjectSwitcher({ compact = false }: { compact?: boolean }) {
  const { projects, activeProjectId, setActiveProject } = useStore();
  return (
    <div className={cn("flex items-center gap-2", compact ? "" : "w-full")}>
      {!compact && <span className="text-[10px] uppercase tracking-wide text-sidebar-foreground/60">Aktives Projekt</span>}
      <select
        value={activeProjectId}
        onChange={(e) => setActiveProject(e.target.value)}
        className="w-full rounded-md bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border px-2 py-1.5 text-sm"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}{p.status !== "Aktiv" ? ` (${p.status})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="size-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
            <Building2 className="size-5" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">Immo Invest CRM</div>
            <div className="text-xs text-sidebar-foreground/60">Bewertung & Kaufprozess</div>
          </div>
        </div>
        <div className="px-3 pt-3 pb-2 space-y-1.5">
          <ProjectSwitcher />
          <Link to="/projects" className="block text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground px-1">
            Projekte verwalten →
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const active = n.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={cn("flex items-center gap-3 px-3 py-2 rounded-md text-sm transition",
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <AccountBox />
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden sticky top-0 z-10 bg-sidebar text-sidebar-foreground px-3 py-2 space-y-2">
          <ProjectSwitcher compact />
          <div className="flex gap-2 overflow-x-auto">
            {NAV.map((n) => {
              const active = n.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to}
                  className={cn("text-xs whitespace-nowrap px-3 py-1.5 rounded-full",
                    active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent")}>
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm md:text-base">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
