
/* ───────── Fix & Flip ───────── */

function FixFlipCalculator() {
  const meta = META.fixflip;
  const [kaufpreis, setKaufpreis] = useState(250000);
  const [nebenkosten, setNebenkosten] = useState(25000);
  const [renovierung, setRenovierung] = useState(40000);
  const [sonstigeKosten, setSonstigeKosten] = useState(5000);
  const [eigenkapital, setEigenkapital] = useState(80000);
  const [zinssatz, setZinssatz] = useState(4.5);
  const [haltedauerMonate, setHaltedauerMonate] = useState(12);
  const [mieteinnahmen, setMieteinnahmen] = useState(0);
  const [betriebskosten, setBetriebskosten] = useState(0);
  const [verkaufspreis, setVerkaufspreis] = useState(380000);
  const [maklerVerkaufPct, setMaklerVerkaufPct] = useState(3.6);
  const [immoEstSteuer, setImmoEstSteuer] = useState(30);

  const gesamtinvestition = kaufpreis + nebenkosten + renovierung + sonstigeKosten;
  const fremdkapital = Math.max(0, gesamtinvestition - eigenkapital);
  const zinsenGesamt = fremdkapital * (zinssatz / 100) * (haltedauerMonate / 12);
  const nettomieteinnahmen = (mieteinnahmen - betriebskosten) * haltedauerMonate;
  const maklerVerkauf = verkaufspreis * (maklerVerkaufPct / 100);
  const gewinnVorSteuer = verkaufspreis - gesamtinvestition - zinsenGesamt - maklerVerkauf + nettomieteinnahmen;
  const steuer = gewinnVorSteuer > 0 ? gewinnVorSteuer * (immoEstSteuer / 100) : 0;
  const gewinnNachSteuer = gewinnVorSteuer - steuer;
  const roiPct = eigenkapital > 0 ? gewinnNachSteuer / eigenkapital : 0;
  const annualisiertePct = haltedauerMonate > 0 ? roiPct * (12 / haltedauerMonate) : 0;
  const isPositive = gewinnNachSteuer >= 0;

  return (
    <PublicCalcLayout
      category={meta.category}
      h1={meta.h1}
      intro={meta.intro}
      breadcrumbSlug="fixflip"
      faq={meta.faq}
      snapshot={{
        type: "fixflip" as never,
        createdAt: new Date().toISOString(),
        inputs: { kaufpreis, nebenkosten, renovierung, sonstigeKosten, eigenkapital, zinssatz, haltedauerMonate, mieteinnahmen, betriebskosten, verkaufspreis, maklerVerkaufPct, immoEstSteuer },
        result: { gewinnNachSteuer, roiPct, annualisiertePct },
      } as never}
      inputs={
        <>
          <NumInput label="Kaufpreis" value={kaufpreis} onChange={setKaufpreis} suffix="€" />
          <NumInput label="Kaufnebenkosten" value={nebenkosten} onChange={setNebenkosten} suffix="€" />
          <NumInput label="Renovierungskosten" value={renovierung} onChange={setRenovierung} suffix="€" />
          <NumInput label="Sonstige Kosten" value={sonstigeKosten} onChange={setSonstigeKosten} suffix="€" />
          <NumInput label="Eigenkapital" value={eigenkapital} onChange={setEigenkapital} suffix="€" />
          <NumInput label="Zinssatz p.a." value={zinssatz} onChange={setZinssatz} suffix="%" step={0.1} />
          <NumInput label="Haltedauer (Monate)" value={haltedauerMonate} onChange={setHaltedauerMonate} suffix="Monate" />
          <NumInput label="Mieteinnahmen mtl. (optional)" value={mieteinnahmen} onChange={setMieteinnahmen} suffix="€/M" />
          <NumInput label="Betriebskosten mtl. (optional)" value={betriebskosten} onChange={setBetriebskosten} suffix="€/M" />
          <NumInput label="Ziel-Verkaufspreis" value={verkaufspreis} onChange={setVerkaufspreis} suffix="€" />
          <NumInput label="Maklerprovision Verkauf" value={maklerVerkaufPct} onChange={setMaklerVerkaufPct} suffix="%" step={0.1} />
          <NumInput label="Immo-ESt / Spekulationssteuer" value={immoEstSteuer} onChange={setImmoEstSteuer} suffix="%" step={1} />
        </>
      }
      result={
        <div className="space-y-5">
          <BigResult label="Gewinn nach Steuer" value={fmtEUR(gewinnNachSteuer)} tone={isPositive ? "good" : "bad"} />
          <div className="border-t pt-3">
            <ResultRow label="Gesamtinvestition" value={fmtEUR(gesamtinvestition)} />
            <ResultRow label="Fremdkapital" value={fmtEUR(fremdkapital)} />
            <ResultRow label="Zinsen gesamt" value={fmtEUR(zinsenGesamt)} />
            <ResultRow label="Netto-Mieteinnahmen" value={fmtEUR(nettomieteinnahmen)} />
            <ResultRow label="Makler Verkauf" value={fmtEUR(maklerVerkauf)} />
            <ResultRow label="Gewinn vor Steuer" value={fmtEUR(gewinnVorSteuer)} tone={gewinnVorSteuer >= 0 ? "good" : "bad"} />
            <ResultRow label={`Immo-ESt (${immoEstSteuer}%)`} value={fmtEUR(steuer)} />
          </div>
          <div className="border-t pt-3">
            <ResultRow label="ROI auf Eigenkapital" value={fmtPct(roiPct)} tone={roiPct >= 0 ? "good" : "bad"} />
            <ResultRow label="Annualisierte Rendite" value={fmtPct(annualisiertePct)} tone={annualisiertePct >= 0 ? "good" : "bad"} />
          </div>
        </div>
      }
      explanation={
        <p>
          Fix & Flip bedeutet: günstig kaufen, schnell renovieren, gewinnbringend verkaufen. Der Rechner berücksichtigt Kaufnebenkosten, Renovierungskosten, Zwischenfinanzierungszinsen, optionale Mieteinnahmen während der Renovierung sowie Maklerprovision und Immo-ESt beim Verkauf.
        </p>
      }
    />
  );
}
