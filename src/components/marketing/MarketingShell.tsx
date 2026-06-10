import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function MarketingShell({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Building2 className="size-4" />
            </div>
            <span>kauf ma</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="/#features" className="text-muted-foreground hover:text-foreground">Features</a>
            <a href="/rechner" className="text-muted-foreground hover:text-foreground">Rechner</a>
            <a href="/ratgeber" className="text-muted-foreground hover:text-foreground">Ratgeber</a>
            <a href="/pricing" className="text-muted-foreground hover:text-foreground">Preise</a>
            <a href="/faq" className="text-muted-foreground hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <a href="/dashboard" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
                Zum Dashboard
              </a>
            ) : (
              <>
                <a href="/login" className="text-sm px-3 py-2 text-muted-foreground hover:text-foreground">Login</a>
                <a href="/signup" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
                  Kostenlos starten
                </a>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 text-sm text-muted-foreground flex flex-wrap gap-6 justify-between">
          <span>© {new Date().getFullYear()} kauf ma</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="/impressum" className="hover:text-foreground">Impressum</a>
            <a href="/datenschutz" className="hover:text-foreground">Datenschutz</a>
            <a href="/agb" className="hover:text-foreground">AGB</a>
          </nav>
          <span className="w-full md:w-auto md:text-right">Hinweis: kauf ma ersetzt keine Rechts-, Steuer- oder Finanzberatung.</span>
        </div>
      </footer>
    </div>
  );
}
