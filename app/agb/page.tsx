import Link from 'next/link';

export const metadata = {
  title: 'AGB – Sushi Banana',
  description: 'Allgemeine Geschäftsbedingungen von Sushi Banana',
};

export default function AgbPage() {
  return (
    <div className="pt-[100px] md:pt-[130px] px-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-10 inline-flex items-center gap-2">
          ← Zurück
        </Link>

        <h1 className="text-4xl font-black uppercase tracking-tighter mt-6 mb-2">AGB</h1>
        <p className="text-gray-400 text-sm font-bold mb-12">Allgemeine Geschäftsbedingungen</p>

        <div className="prose prose-sm max-w-none space-y-8 text-gray-700 font-bold leading-relaxed">

          <section>
            <h2 className="text-base font-black uppercase tracking-tight text-black mb-3">§ 1 Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen gelten für alle Bestellungen, die über die Website
              oder die App von Sushi Banana (sushibanana.de) aufgegeben werden.
              Betreiber ist Sushi Banana, Unter den Eichen 84a, 12205 Berlin.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black uppercase tracking-tight text-black mb-3">§ 2 Vertragsschluss</h2>
            <p>
              Mit der Absendung einer Bestellung über unsere Website gibt der Kunde ein verbindliches
              Angebot zum Abschluss eines Kaufvertrags ab. Der Vertrag kommt mit der Annahme der
              Bestellung durch Sushi Banana zustande, die per E-Mail-Bestätigung erfolgt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black uppercase tracking-tight text-black mb-3">§ 3 Preise und Zahlung</h2>
            <p>
              Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer. Die Zahlung
              erfolgt wahlweise per Online-Zahlung (Stripe) oder Barzahlung bei Lieferung.
              Bei Online-Zahlung wird der Betrag zum Zeitpunkt der Bestellung belastet.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black uppercase tracking-tight text-black mb-3">§ 4 Lieferung</h2>
            <p>
              Wir liefern innerhalb unseres Liefergebiets (max. 7 km vom Restaurant). Der Mindestbestellwert
              sowie die Liefergebühr sind auf der Website angegeben und können sich ändern.
              Lieferzeiten sind Schätzwerte und können variieren.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black uppercase tracking-tight text-black mb-3">§ 5 Widerrufsrecht</h2>
            <p>
              Da es sich um Lebensmittel handelt, ist ein Widerrufsrecht nach § 312g Abs. 2 Nr. 2 BGB
              ausgeschlossen. Bestellungen können daher nach Bestätigung nicht storniert werden.
              Bei Mängeln wenden Sie sich bitte umgehend an uns.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black uppercase tracking-tight text-black mb-3">§ 6 Datenschutz</h2>
            <p>
              Personenbezogene Daten werden ausschließlich zur Auftragsabwicklung verwendet.
              Weitere Informationen finden Sie in unserer Datenschutzerklärung.
              Mit der Registrierung stimmen Sie der Verarbeitung Ihrer Daten für Bestellzwecke zu.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black uppercase tracking-tight text-black mb-3">§ 7 Haftung</h2>
            <p>
              Sushi Banana haftet nicht für Schäden, die durch höhere Gewalt, Lieferverzögerungen
              durch Dritte oder unrichtige Angaben des Kunden entstehen.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black uppercase tracking-tight text-black mb-3">§ 8 Kundenkonto</h2>
            <p>
              Kunden können ein kostenloses Konto erstellen. Der Kunde ist verpflichtet,
              seine Zugangsdaten sicher aufzubewahren und keine Dritten Zugang zu gewähren.
              Sushi Banana behält sich das Recht vor, Konten bei Missbrauch zu sperren.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black uppercase tracking-tight text-black mb-3">§ 9 Marketingkommunikation</h2>
            <p>
              Mit Ihrer Zustimmung bei der Registrierung erklären Sie sich einverstanden, dass
              Sushi Banana Ihre E-Mail-Adresse für Marketingzwecke, Angebote und Neuigkeiten
              verwenden darf. Diese Einwilligung kann jederzeit widerrufen werden.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black uppercase tracking-tight text-black mb-3">§ 10 Schlussbestimmungen</h2>
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Berlin.
              Sollten einzelne Bestimmungen unwirksam sein, bleiben die übrigen Bestimmungen
              hiervon unberührt.
            </p>
          </section>

          <div className="pt-6 border-t border-gray-100 text-xs text-gray-400">
            Stand: Juni 2026 · Sushi Banana, Unter den Eichen 84a, 12205 Berlin
          </div>
        </div>
      </div>
    </div>
  );
}
