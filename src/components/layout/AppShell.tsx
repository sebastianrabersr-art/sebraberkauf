import { Link, useRouterState } from "@tanstack/react-router";
import { ChartPieSlice, Buildings, GitDiff, Calculator, Kanban, Vault, FolderSimple, GearSix, UserCircle, Sparkle, SignOut } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { planLabel, useAuth } from "@/lib/auth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const NAV_PRIMARY: { to: string; label: string; icon: React.ComponentType<any> }[] = [
  { to: "/dashboard", label: "Dashboard", icon: ChartPieSlice },
  { to: "/properties", label: "Kaufkandidaten", icon: Buildings },
  { to: "/vergleich", label: "Vergleichen", icon: GitDiff },
  { to: "/rechner", label: "Rechner", icon: Calculator },
];

const NAV_SECONDARY: { to: string; label: string; icon: React.ComponentType<any> }[] = [
  { to: "/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/portfolio", label: "Portfolio", icon: Vault },
  { to: "/projects", label: "Projekte", icon: FolderSimple },
  { to: "/assumptions", label: "Einstellungen", icon: GearSix },
];

const ALL_NAV = [...NAV_PRIMARY, ...NAV_SECONDARY];

function ProjectSwitcher({ compact = false }: { compact?: boolean }) {
  const { projects, activeProjectId, setActiveProject } = useStore();
  return (
    <div className={cn("flex items-center gap-2", compact ? "" : "w-full")}>
      {!compact && <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A8A29E]">Aktives Projekt</span>}
      <select
        value={activeProjectId}
        onChange={(e) => setActiveProject(e.target.value)}
        className="w-full rounded-lg bg-white text-[#1C1917] border border-[#EAE6DF] px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/40"
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
      {label && <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-[#A8A29E]">{label}</div>}
      {items.map((n) => {
        const active = n.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(n.to);
        return (
          <Link key={n.to} to={n.to}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2 text-[13px] transition-colors",
              active
                ? "text-[#2D6A4F] font-medium bg-[#E8F5EE] rounded-r-md before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-[#2D6A4F] before:rounded-full"
                : "text-[#78716C] hover:bg-[#EAE6DF] rounded-lg",
            )}>
            <n.icon weight="duotone" size={18} color={active ? "#2D6A4F" : "#A8A29E"} className="shrink-0" />
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
    <div className="min-h-screen flex bg-[#F5F3EE]">
      <aside className="hidden md:flex w-64 flex-col bg-[#F5F3EE] text-[#78716C] border-r border-[#EAE6DF]">
        <div className="px-5 py-5 flex items-center gap-2">
          <span className="font-display text-2xl font-bold tracking-tight text-[#1C1917] leading-none">kaufma</span>
          <span className="inline-block size-[7px] rounded-full bg-[#2D6A4F]" />
        </div>
        <div className="px-3 pb-3 space-y-1.5">
          <ProjectSwitcher />
          <Link to="/projects" className="block text-[11px] text-[#A8A29E] hover:text-[#78716C] px-1">
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
        <div className="md:hidden sticky top-0 z-10 bg-[#F5F3EE]/95 backdrop-blur text-[#78716C] border-b border-[#EAE6DF] px-3 py-2 space-y-2">
          <ProjectSwitcher compact />
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
            {ALL_NAV.map((n) => {
              const active = n.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to}
                  className={cn(
                    "text-xs whitespace-nowrap px-3 py-1.5 rounded-full border",
                    active
                      ? "bg-[#2D6A4F] text-white border-transparent"
                      : "bg-white border-[#EAE6DF] text-[#78716C]",
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
    <div className="p-3 border-t border-[#EAE6DF] space-y-1">
      <Link to="/settings" className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#EAE6DF] text-sm text-[#1C1917]">
        <div className="size-8 rounded-full bg-[#E8F5EE] text-[#2D6A4F] grid place-items-center">
          <UserCircle weight="duotone" size={18} color="#2D6A4F" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sm text-[#1C1917]">{profile?.name || profile?.email || "Account"}</div>
          <div className="text-[10px] text-[#A8A29E] flex items-center gap-1">
            <Sparkle weight="duotone" size={14} color="#A8A29E" /> {planLabel(subscription?.plan)}
          </div>
        </div>
      </Link>
      <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#EAE6DF] text-xs text-[#78716C]">
        <SignOut weight="duotone" size={16} color="#78716C" /> Abmelden
      </button>
    </div>
  );
}
