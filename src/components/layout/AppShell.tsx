import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { DotsThreeOutline, X } from "@phosphor-icons/react";
import {
  IconDashboard, IconKaufkandidaten, IconVergleichen, IconRechner,
  IconPipeline, IconPortfolio, IconProjekte, IconGlossar, IconEinstellungen, IconAbmelden,
} from "@/components/icons/SidebarIcons";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";

type NavItem = { to: string; label: string; short?: string; icon: React.ComponentType<{ size?: number; color?: string }> };

// Navigations-Icons: aktiv Grün, inaktiv Stein
const ICON_ACTIVE = "#2D6A4F";
const ICON_INACTIVE = "#78716C";

const NAV_PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", short: "Start", icon: IconDashboard },
  { to: "/properties", label: "Kaufkandidaten", short: "Kandidaten", icon: IconKaufkandidaten },
  { to: "/vergleich", label: "Vergleich", icon: IconVergleichen },
  { to: "/rechner", label: "Rechner", icon: IconRechner },
];

const NAV_SECONDARY: NavItem[] = [
  { to: "/pipeline", label: "Pipeline", icon: IconPipeline },
  { to: "/portfolio", label: "Meine Objekte", icon: IconPortfolio },
  { to: "/projects", label: "Projekte", icon: IconProjekte },
  { to: "/glossar", label: "Glossar", icon: IconGlossar },
];

/** Fest unten in der Sidebar (scrollt nicht mit der Navigation). */
const NAV_FOOTER: NavItem[] = [
  { to: "/settings", label: "Einstellungen", icon: IconEinstellungen },
];

function isActive(pathname: string, to: string) {
  return to === "/dashboard" ? pathname === "/dashboard" : pathname === to || pathname.startsWith(`${to}/`) || pathname.startsWith(`${to}?`);
}

function ProjectSwitcher({ compact = false }: { compact?: boolean }) {
  const { projects, activeProjectId, setActiveProject } = useStore();
  const id = useId();
  return (
    <div className={cn("flex items-center gap-2", compact ? "min-w-0 flex-1" : "w-full flex-col items-stretch gap-1.5")}>
      <label htmlFor={id} className={cn("text-[11px] uppercase tracking-wider font-semibold text-ink-3", compact && "sr-only")}>
        Aktives Projekt
      </label>
      <select
        id={id}
        value={activeProjectId}
        onChange={(e) => setActiveProject(e.target.value)}
        className="w-full min-w-0 rounded-lg bg-white text-[#1C1917] border border-[#EAE6DF] px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
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

function NavSection({ items, pathname, label }: { items: NavItem[]; pathname: string; label?: string }) {
  return (
    <div className="space-y-0.5">
      {label && <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider font-semibold text-ink-3">{label}</div>}
      {items.map((n) => {
        const active = isActive(pathname, n.to);
        return (
          <Link key={n.to} to={n.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2 text-[13px] transition-colors",
              active
                ? "text-primary font-medium bg-[#E8F5EE] rounded-r-md before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-primary before:rounded-full"
                : "text-ink-2 hover:bg-[#EAE6DF] rounded-lg",
            )}>
            <span className="shrink-0 inline-flex"><n.icon size={18} color={active ? ICON_ACTIVE : ICON_INACTIVE} /></span>
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
      {/* Sidebar bleibt beim Scrollen stehen: Navigation scrollt in sich, Einstellungen/Abmelden immer unten sichtbar */}
      <aside className="hidden md:flex sticky top-0 h-[100dvh] w-64 shrink-0 flex-col bg-[#F5F3EE] text-ink-2 border-r border-[#EAE6DF]">
        <div className="px-5 py-5">
          <Logo size={32} textSize={16} />
        </div>
        <div className="px-3 pb-3 space-y-1.5">
          <ProjectSwitcher />
          <Link to="/projects" className="block text-[12px] text-ink-3 hover:text-ink-2 px-1">
            Projekte verwalten →
          </Link>
        </div>
        <nav className="flex-1 px-2 pb-3 space-y-1 overflow-y-auto" aria-label="Hauptnavigation">
          <NavSection items={NAV_PRIMARY} pathname={pathname} />
          <NavSection items={NAV_SECONDARY} pathname={pathname} label="Weitere" />
        </nav>
        {/* Immer sichtbar: Einstellungen und Abmelden */}
        <div className="px-2 py-3 border-t border-[#EAE6DF] space-y-0.5">
          <NavSection items={NAV_FOOTER} pathname={pathname} />
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        {/* Handy: oben nur Logo + Projekt, Navigation unten im Daumenbereich */}
        <div className="md:hidden sticky top-0 z-30 bg-[#F5F3EE] border-b border-[#EAE6DF] px-4 h-14 flex items-center gap-3">
          <Link to="/dashboard" aria-label="kaufma – Dashboard" className="shrink-0">
            <Logo size={28} textSize={15} />
          </Link>
          <ProjectSwitcher compact />
        </div>

        <div className="p-5 pb-28 md:p-10 md:pb-10 max-w-[1400px] mx-auto">{children}</div>
      </main>
      <MobileTabBar pathname={pathname} />
    </div>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const panelId = useId();
  const moreItems = [...NAV_SECONDARY, ...NAV_FOOTER];
  const moreActive = moreItems.some((n) => isActive(pathname, n.to));

  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const tabCls = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-medium",
      active ? "text-primary" : "text-ink-2",
    );

  return (
    <div className="md:hidden">
      {moreOpen && (
        <button
          type="button"
          aria-label="Menü schließen"
          tabIndex={-1}
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-40 bg-[#1C1917]/30 motion-safe:animate-in motion-safe:fade-in"
        />
      )}

      <div
        id={panelId}
        hidden={!moreOpen}
        className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-50 rounded-t-[16px] border-t border-[#EAE6DF] bg-white px-4 pt-3 pb-4 motion-safe:animate-in motion-safe:slide-in-from-bottom-4"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Weitere Bereiche</span>
          <button type="button" onClick={() => setMoreOpen(false)} aria-label="Schließen" className="-mr-2 inline-flex size-11 items-center justify-center text-ink-2">
            <X size={18} weight="bold" />
          </button>
        </div>
        <nav aria-label="Weitere Bereiche">
          <ul>
            {moreItems.map((n) => {
              const active = isActive(pathname, n.to);
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex min-h-[48px] items-center gap-3 border-b border-[#F5F3EE] text-[15px]", active ? "text-primary font-semibold" : "text-[#1C1917]")}
                  >
                    <n.icon size={20} color={active ? ICON_ACTIVE : ICON_INACTIVE} />
                    {n.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <SignOutButton mobile />
            </li>
          </ul>
        </nav>
      </div>

      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[#EAE6DF] bg-[#F5F3EE] pb-[env(safe-area-inset-bottom)]"
      >
        {NAV_PRIMARY.map((n) => {
          const active = isActive(pathname, n.to) && !moreOpen;
          return (
            <Link key={n.to} to={n.to} aria-current={active ? "page" : undefined} className={tabCls(active)}>
              <n.icon size={22} color={active ? ICON_ACTIVE : ICON_INACTIVE} />
              {n.short ?? n.label}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls={panelId}
          onClick={() => setMoreOpen((o) => !o)}
          className={tabCls(moreOpen || moreActive)}
        >
          <DotsThreeOutline size={22} weight={moreOpen || moreActive ? "fill" : "duotone"} aria-hidden />
          Mehr
        </button>
      </nav>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="heading-page-sm">{title}</h1>
        {description && <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

/**
 * Abmelden – ohne Rückfrage, danach zur Startseite.
 * Inaktiv Stein (#78716C), beim Hover Rot als Hinweis, dass man die App verlässt.
 */
function SignOutButton({ mobile = false }: { mobile?: boolean }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
    } finally {
      navigate({ to: "/" });
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "group w-full flex items-center gap-3 text-[#78716C] transition-colors hover:text-[#DC2626] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#DC2626]",
        mobile ? "min-h-[48px] text-[15px]" : "px-3 py-2 text-[13px] rounded-lg hover:bg-[#FEF2F2]",
      )}
    >
      <span className="shrink-0 inline-flex"><IconAbmelden size={mobile ? 20 : 18} /></span>
      <span className="truncate">{busy ? "Abmelden …" : "Abmelden"}</span>
    </button>
  );
}
