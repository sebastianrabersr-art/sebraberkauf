import { Logo } from "@/components/Logo";

/** Seite nicht gefunden – öffentliches Layout ohne App-Shell (Root-notFoundComponent). */
export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3EE]">
      <header className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center">
        <a href="/" className="flex items-center" aria-label="kaufma – Startseite">
          <Logo size={32} textSize={16} />
        </a>
      </header>

      <main className="flex-1 flex items-center">
        <div className="relative max-w-6xl w-full mx-auto px-4 sm:px-6 py-16">
          {/* Große 404 im Hintergrund, nur Dekoration */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-6 left-2 sm:left-4 select-none leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 120, color: "#EAE6DF", letterSpacing: "-0.04em" }}
          >
            404
          </span>

          <div className="relative max-w-[34rem] pt-14">
            <h1
              className="text-balance leading-[1.15] text-[#1C1917]"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: "-0.02em" }}
            >
              Diese Seite gibt es nicht.
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#78716C]" style={{ fontFamily: "Inter, sans-serif" }}>
              Vielleicht wurde die Seite verschoben oder der Link ist veraltet.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/"
                className="inline-flex h-11 items-center rounded-[10px] bg-[#2D6A4F] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#235740]"
              >
                Zur Startseite
              </a>
              <a
                href="/rechner"
                className="inline-flex h-11 items-center rounded-[10px] border border-[#EAE6DF] bg-white px-5 text-[14px] font-semibold text-[#1C1917] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
              >
                Rechner öffnen
              </a>
            </div>

            <p className="mt-6 text-[13px] text-[#78716C]">
              Oder such im Ratgeber:{" "}
              <a href="/ratgeber" className="font-medium text-[#2D6A4F] underline-offset-4 hover:underline">
                alle Artikel zu Kauf, Finanzierung und Rendite
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
