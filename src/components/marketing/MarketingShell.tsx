import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function MarketingShell({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Building2 className="size-4" />
            </div>
            <span>kauf ma</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="/#features" className="text-muted-foreground hover:text-foreground">Features</a>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground">Preise</Link>
            <Link to="/faq" className="text-muted-foreground hover:text-foreground">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Link to="/dashboard" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
                Zum Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm px-3 py-2 text-muted-foreground hover:text-foreground">Login</Link>
                <Link to="/signup" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
                  Kostenlos starten
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 font-semibold mb-2">
            <div className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <Building2 className="size-4" />
            </div>
            kauf ma
          </div>
          <p className="text-muted-foreground">Privates Immobilien-CRM mit Investment-Rechner.</p>
        </div>
        <div>
          <div className="font-medium mb-2">Produkt</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><a href="/#features" className="hover:text-foreground">Features</a></li>
            <li><Link to="/pricing" className="hover:text-foreground">Preise</Link></li>
            <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Account</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link to="/login" className="hover:text-foreground">Login</Link></li>
            <li><Link to="/signup" className="hover:text-foreground">Registrieren</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Rechtliches</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link to="/impressum" className="hover:text-foreground">Impressum</Link></li>
            <li><Link to="/datenschutz" className="hover:text-foreground">Datenschutz</Link></li>
            <li><Link to="/agb" className="hover:text-foreground">AGB</Link></li>
            <li><Link to="/kontakt" className="hover:text-foreground">Kontakt</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} kauf ma</span>
          <span>Hinweis: kauf ma ersetzt keine Rechts-, Steuer- oder Finanzberatung.</span>
        </div>
      </div>
    </footer>
  );
}
