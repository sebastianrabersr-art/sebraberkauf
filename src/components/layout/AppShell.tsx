import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Bell, Briefcase, Building2, Calculator, ClipboardCheck, Database, FolderKanban, GitCompareArrows, KanbanSquare, LogOut, Settings, Sparkles, UserCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { planLabel, useAuth } from "@/lib/auth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const NAV_PRIMARY: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/properties", label: "Kaufkandidaten", icon: Database },
  { to: "/vergleich", label: "Vergleich", icon: GitCompareArrows },
  { to: "/rechner", label: "Rechner", icon: Calculator },
];

const NAV_SECONDARY: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/projects", label: "Projekte", icon: FolderKanban },
  { to: "/followups", label: "Follow-ups", icon: Bell },
  { to: "/viewing", label: "Besichtigungen", icon: ClipboardCheck },
  { to: "/assumptions", label: "Einstellungen", icon: Settings },
];

const ALL_NAV = [...NAV_PRIMARY, ...NAV_SECONDARY];

function ProjectSwitcher({ compact = false }: { compact?: boolean }) {
  const { projects, activeProjectId, setActiveProject } = useStore();
  return (
    <div className={cn("flex items-center gap-2", compact ? "" : "w-full")}>
      {!compact && <span className="text-[10px] uppercase tracking-wider font-medium text-sidebar-foreground/55">Aktives Projekt</span>}
      <select
        value={activeProjectId}
        onChange={(e) => setActiveProject(e.target.value)}
        className="w-full rounded-lg bg-card text-foreground border border-sidebar-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
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

function NavSection({ items, pathname, label }: { items: typeof NAV_PRIMARY; pathname: string; label?: string }) {
  return (
    <div className="space-y-0.5">
      {label && <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider font-medium text-sidebar-foreground/45">{label}</div>}
      {items.map((n) => {
        const active = n.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(n.to);
        return (
          <Link key={n.to} to={n.to}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
              active
                ? "text-white font-medium before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-primary before:rounded-full"
                : "text-sidebar-foreground hover:text-white",
            )}>
            <n.icon className={cn("size-4 shrink-0", active ? "text-primary" : "")} />
            <span className="truncate">{n.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold tracking-tight truncate">Immo Invest</div>
            <div className="text-xs text-sidebar-foreground/55 truncate">Bewertung & Portfolio</div>
          </div>
        </div>
        <div className="px-3 pb-3 space-y-1.5">
          <ProjectSwitcher />
          <Link to="/projects" className="block text-[11px] text-sidebar-foreground/55 hover:text-sidebar-foreground px-1">
            Projekte verwalten →
          </Link>
        </div>
        <nav className="flex-1 px-2 pb-3 space-y-1 overflow-y-auto">
          <NavSection items={NAV_PRIMARY} pathname={pathname} />
          <NavSection items={NAV_SECONDARY} pathname={pathname} label="Weitere" />
        </nav>
        <AccountBox />
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden sticky top-0 z-10 bg-sidebar/95 backdrop-blur text-sidebar-foreground border-b border-sidebar-border px-3 py-2 space-y-2">
          <ProjectSwitcher compact />
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
            {ALL_NAV.map((n) => {
              const active = n.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to}
                  className={cn(
                    "text-xs whitespace-nowrap px-3 py-1.5 rounded-full border",
                    active
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-card border-sidebar-border text-sidebar-foreground/80",
                  )}>
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
        <PaymentTestModeBanner />
        <div className="p-6 md:p-10 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

function AccountBox() {
  const { profile, subscription, signOut } = useAuth();
  return (
    <div className="p-3 border-t border-sidebar-border space-y-1">
      <Link to="/settings" className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent text-sm">
        <div className="size-8 rounded-full bg-accent text-accent-foreground grid place-items-center">
          <UserCircle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sm">{profile?.name || profile?.email || "Account"}</div>
          <div className="text-[10px] text-sidebar-foreground/55 flex items-center gap-1">
            <Sparkles className="size-3" /> {planLabel(subscription?.plan)}
          </div>
        </div>
      </Link>
      <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent text-xs text-sidebar-foreground/70">
        <LogOut className="size-3.5" /> Abmelden
      </button>
    </div>
  );
}
