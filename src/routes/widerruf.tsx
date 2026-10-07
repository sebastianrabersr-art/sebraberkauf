import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/marketing/LegalLayout";

export const Route = createFileRoute("/widerruf")({
  head: () => ({
    meta: [
      { title: "Widerrufsbelehrung – kauf ma" },
      { name: "description", content: "Widerrufsbelehrung und Muster-Widerrufsformular für kauf ma." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: Widerruf,
});

const linkCls = "text-primary underline";

function Widerruf() {
  return (
    <LegalLayout title="Widerrufsbelehrung">
      <h2>1. Widerrufsrecht</h2>
      <p>Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt 14 Tage ab dem Tag des Vertragsschlusses.</p>
      <p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (ayoka GmbH, Börsegasse 7, 1010 Wien, <a href="mailto:hallo@kaufma.eu" className={linkCls}>hallo@kaufma.eu</a>) mittels einer eindeutigen Erklärung über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren (z.B. per E-Mail).</p>
      <p>Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>

      <h2>2. Erlöschen des Widerrufsrechts bei digitalen Inhalten</h2>
      <p>Gemäß § 18 Abs. 1 Z 11 FAGG erlischt das Widerrufsrecht bei digitalen Inhalten, wenn der Anbieter mit der Ausführung des Vertrags begonnen hat, nachdem der Verbraucher:</p>
      <ul>
        <li>ausdrücklich zugestimmt hat, dass der Anbieter mit der Ausführung vor Ablauf der Widerrufsfrist beginnt, UND</li>
        <li>seine Kenntnis davon bestätigt hat, dass er durch seine Zustimmung sein Widerrufsrecht verliert.</li>
      </ul>

      <h2>3. Folgen des Widerrufs</h2>
      <p>Wenn Sie diesen Vertrag widerrufen, erstatten wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen 14 Tagen ab dem Tag, an dem die Mitteilung über Ihren Widerruf eingegangen ist. Für die Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben.</p>

      <h2>4. Muster-Widerrufsformular</h2>
      <p>An: ayoka GmbH, Börsegasse 7, 1010 Wien, hallo@kaufma.eu</p>
      <p>Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über den Kauf der folgenden Dienstleistung:</p>
      <p>
        Bestellt am: _______________<br />
        Name: _______________<br />
        Anschrift: _______________<br />
        Datum: _______________
      </p>

      <p>Stand: Oktober 2026</p>
    </LegalLayout>
  );
}
