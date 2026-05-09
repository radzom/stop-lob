import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/anleitung")({
  component: AnleitungPage,
});

function AnleitungPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          Zurück
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink-950 sm:text-3xl">
          Anleitung
        </h1>
        <p className="mt-2 text-ink-600">
          So funktioniert die Rangliste bei Stop &amp; Lob.
        </p>
      </div>

      {/* Pyramid */}
      <Section title="Die Pyramide">
        <p>
          Die Rangliste ist als Pyramide aufgebaut. Jede Reihe hat so viele
          Plätze wie ihre Reihennummer:
        </p>
        <div className="my-4 flex flex-col items-center gap-1 font-mono text-sm text-ink-700">
          <span>[ 1 ]</span>
          <span>[ 2 ] [ 3 ]</span>
          <span>[ 4 ] [ 5 ] [ 6 ]</span>
          <span>[ 7 ] [ 8 ] [ 9 ] [ 10 ]</span>
        </div>
        <p>
          Rang 1 steht ganz oben. Neue Spieler werden unten in der Pyramide
          eingereiht.
        </p>
      </Section>

      {/* Challenges */}
      <Section title="Herausforderungen">
        <p>
          Um in der Pyramide aufzusteigen, forderst du einen höher platzierten
          Spieler heraus. Du kannst herausfordern:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-ink-700">
          <li>
            Den Spieler <strong>direkt links</strong> neben dir in derselben
            Reihe
          </li>
          <li>
            Den Spieler <strong>in der Reihe darüber</strong> an derselben
            Spaltenposition (also schräg rechts oben)
          </li>
        </ul>
        <Example>
          <p>Beispiel: Spieler auf Platz 5 kann Platz 4 (links) und Platz 3 (darüber) herausfordern.</p>
        </Example>
      </Section>

      {/* Ablauf */}
      <Section title="Ablauf einer Herausforderung">
        <ol className="list-inside list-decimal space-y-2 text-ink-700">
          <li>
            Du erstellst eine <strong>Herausforderung</strong> gegen einen
            gültigen Gegner.
          </li>
          <li>
            Dein Gegner muss <strong>nicht annehmen</strong> — beide Spieler
            sind verpflichtet, innerhalb der Frist zu spielen.
          </li>
          <li>
            Nach dem Spiel <strong>meldet ein Spieler</strong> das Ergebnis. Der
            Gegner oder ein Admin/Moderator <strong>bestätigt</strong> es.
          </li>
          <li>
            Wird das Match nicht innerhalb von{" "}
            <strong>15 Tagen</strong> gespielt, verfällt die Herausforderung.
            Der höher platzierte Spieler wird <strong>bestraft</strong> (fällt
            einen Rang ab).
          </li>
        </ol>
      </Section>

      {/* Einschränkungen */}
      <Section title="Einschränkungen">
        <ul className="list-inside list-disc space-y-1 text-ink-700">
          <li>
            Jeder Spieler kann nur <strong>eine aktive Herausforderung</strong>{" "}
            gleichzeitig haben — entweder als Herausforderer oder als
            Herausgeforderter.
          </li>
        </ul>
      </Section>

      {/* Spielformat */}
      <Section title="Spielformat">
        <ul className="list-inside list-disc space-y-1 text-ink-700">
          <li>Einzel (kein Doppel)</li>
          <li>
            <strong>Best of 3 Sätze</strong>
          </li>
          <li>
            Der dritte Satz wird als{" "}
            <strong>Match-Tiebreak bis 10</strong> gespielt (2 Punkte
            Vorsprung nötig)
          </li>
          <li>Aufgaben/Walkovers zählen als Niederlage</li>
        </ul>
      </Section>

      {/* Rangänderungen */}
      <Section title="Was passiert nach dem Spiel?">
        <ul className="list-inside list-disc space-y-2 text-ink-700">
          <li>
            <strong>Herausforderer gewinnt:</strong> Er übernimmt den Platz des
            Verlierers. Der Verlierer und alle Spieler dazwischen rutschen einen
            Rang nach unten.
          </li>
          <li>
            <strong>Höher platzierter Spieler gewinnt:</strong> Nichts ändert
            sich.
          </li>
        </ul>
      </Section>

      {/* Mehrere Ranglisten */}
      <Section title="Mehrere Ranglisten">
        <p>
          Es können mehrere Ranglisten existieren (z.&nbsp;B. „Herren Open",
          „Damen 40+"). Jede Rangliste kann nach Geschlecht und Alter gefiltert
          sein. Du kannst an <strong>mehreren Ranglisten</strong> gleichzeitig
          teilnehmen.
        </p>
      </Section>

      {/* Profil */}
      <Section title="Dein Profil">
        <p>
          Nach der Registrierung musst du dein Profil vervollständigen:
          Vorname, Nachname, Telefonnummer, Geburtsjahr und Geschlecht. Danach
          kannst du an Ranglisten teilnehmen und Herausforderungen erstellen.
        </p>
      </Section>

      {/* Rollen */}
      <Section title="Zum Schluss">
        <p>
          Wir wünschen
          dir viel Erfolg und Spaß beim Spielen.
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-ink-900">
        {title}
      </h2>
      <div className="mt-2 space-y-2 text-ink-700">{children}</div>
    </section>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-ink-700">
      {children}
    </div>
  );
}
