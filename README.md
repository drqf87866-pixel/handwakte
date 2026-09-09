# Digitale Bauakte

B2B-Plattform fuer einen Heizungsbau- und Sanitaerbetrieb: Anlagenverwaltung
("Digitale Bauakte") mit automatisiertem Wartungs- und Serviceplaner.

- **Buero (Desktop):** Dashboard mit offenen Wartungen, Kunden- und
  Anlagen-CRUD, QR-Aufkleber als Druckansicht.
- **Monteur (Mobile/PWA):** QR-Scan an der Anlage (Kamera oder
  Token-Eingabe), Fotos, Serviceprotokoll mit Messwerten, Unterschrift.
  Installierbar via `public/manifest.webmanifest` (`standalone`).

Bedienung steht in `docs/BENUTZERHANDBUCH.md`, Entwicklung und Deployment
hier in `README.md`.

## Stack

| Baustein | Technik |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Runtime | Cloudflare Workers via `@opennextjs/cloudflare` (`nodejs_compat`) |
| Datenbank | Neon Postgres ueber `@neondatabase/serverless` + Drizzle ORM |
| Auth | Better Auth (E-Mail/Passwort) auf derselben Neon-DB, ohne Selbstregistrierung |
| Dateien | Cloudflare R2 ueber das Worker-Binding `MY_BUCKET` |
| E-Mail | Resend |
| Cron | Cloudflare Scheduled Worker, taeglich 06:00 UTC |
| UI | Tailwind CSS v4 + shadcn/ui |
| Validierung | Zod (Server Actions) |
| QR Druck | `qrcode` (Druckansicht `/anlagen/[id]/qr`) |
| QR Scan | `BarcodeDetector` nativ (Chrome/Edge/Android) + `jsqr`-Fallback (Safari/iPhone) + manuelle Token-Eingabe |
| PWA | `public/manifest.webmanifest` (`standalone`, `start_url: /`) |

## Architektur

```
[ Browser / Handy ]
        |
        v  HTTPS
[ Cloudflare Worker (Next.js via OpenNext) ] --(Resend SDK)--> [ E-Mail ]
        |                    |
        |  env.MY_BUCKET     |  @neondatabase/serverless (HTTP)
        v                    v
[ R2: Fotos, PDFs ]   [ Neon Postgres: App-Daten + Better Auth ]
        ^
        |  scheduled() "0 6 * * *"
[ Cloudflare Cron Trigger ]
```

Ein einziger Worker bedient beides: `src/worker.ts` reicht `fetch` an den von
OpenNext gebauten Next.js-Handler durch und ergaenzt `scheduled` fuer den
Wartungs-Scan.

## Setup

```bash
pnpm install
cp .env.example .env
cp .env.example .dev.vars     # danach beide mit denselben Werten fuellen
pnpm cf-typegen               # Typen fuer die Cloudflare-Bindings
```

`.env` und `.dev.vars` muessen **identisch** befuellt sein: `.env` versorgt
`next dev` und die `db:*`-Skripte, `.dev.vars` versorgt `pnpm preview` (die
OpenNext-Workers-Runtime, `localhost:8787`). Laufen sie auseinander, arbeiten
Dev-Server und Worker gegen verschiedene Datenbanken, ohne dass es auffaellt.

`.env` ausfuellen (Details siehe `.env.example`):

| Variable | Woher |
| --- | --- |
| `DATABASE_URL` | Neon Dashboard, "Pooled connection" zum **`dev`-Branch** |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` bzw. Produktions-URL |
| `RESEND_API_KEY` / `RESEND_FROM` | Resend Dashboard, verifizierte Domain |
| `MAINTENANCE_NOTIFY_EMAIL` | Postfach des Bueros |
| `CRON_SECRET` | frei gewaehlt, schuetzt `/api/cron/maintenance` |

Ohne verifizierte Domain gilt: `RESEND_FROM="Wartung <onboarding@resend.dev>"`
und zugestellt wird nur an die eigene Resend-Account-Adresse (reicht fuer die
Entwicklung, Details siehe `.env.example`).

### Datenbank-Branches

Neon-Branches sind Copy-on-Write und in Sekunden angelegt. Konvention:

| Zweck | Neon-Branch | Wo die URL liegt |
| --- | --- | --- |
| lokal entwickeln | `dev` | `.env` und `.dev.vars` (beide gitignored) |
| Deployment | Produktions-Branch (default) | nur als Worker-Secret |

Die Produktions-URL gehoert in keine Datei im Repo:

```bash
pnpm exec wrangler secret put DATABASE_URL
```

Schema in die Datenbank bringen:

```bash
pnpm db:push       # nur gegen den dev-Branch: vergleicht direkt gegen die Live-DB
pnpm db:migrate    # gegen Produktion: fuehrt die Migrationen aus drizzle/ aus
pnpm db:studio     # DB-Browser fuer Kontrolle und Demo-Daten
```

`db:push` kann bestehende Spalten umtypisieren und dabei an Fremdschluesseln
scheitern - in Produktion deshalb immer den Migrationsweg nehmen:

```bash
pnpm db:generate   # Migration aus dem geaenderten Schema erzeugen, committen
pnpm db:migrate    # anwenden
```

Nach Aenderungen an `src/lib/auth.ts` das Better-Auth-Schema abgleichen
(Kommentar in `src/lib/db/schema.ts`):

```bash
pnpm auth:generate  # schreibt src/lib/db/schema.generated.ts, bei Bedarf uebernehmen
```

Eine frisch migrierte Datenbank hat noch kein Konto, und ohne Konto kommt man
am Login nicht vorbei - Registrieren geht in der App nicht. Erstes Konto siehe
[Benutzer anlegen](#benutzer-anlegen).

R2-Bucket anlegen (einmalig, mit angemeldeter Wrangler-CLI):

```bash
pnpm exec wrangler r2 bucket create handwakte-media
pnpm exec wrangler r2 bucket create handwakte-media-dev
```

## Entwickeln

```bash
pnpm dev        # Next.js Dev-Server, Bindings inklusive (localhost:3000)
pnpm preview    # OpenNext-Build + echte Workers-Runtime (localhost:8787)
pnpm typecheck
pnpm lint
pnpm user:create -- --email=... --name="..."   # Konto anlegen, siehe Benutzer anlegen
```

Mailversand ohne Dev-Server und DB testen:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file=.env scripts/send-test-email.mts -- --to=...
```

`/api/health` prueft Neon, R2, Resend und Better Auth einzeln und antwortet
immer mit 200 plus Detail-Objekt - so ist ablesbar, welcher Baustein klemmt.

Cron lokal ausloesen (gegen `pnpm preview` auf Port 8787):

```bash
# echter scheduled()-Handler
curl "http://localhost:8787/__scheduled?cron=0+6+*+*+*"

# HTTP-Endpunkt (GET oder POST, Bearer CRON_SECRET)
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/maintenance
```

## Funktionen

- **Anmeldung (`/login`):** E-Mail und Passwort, Session 30 Tage (Monteure
  sollen nicht taeglich neu ran). Der Guard sitzt als `requireSession()` in den
  Layouts von `(dashboard)` und `(mobile)` und zusaetzlich in jeder Server
  Action. Konten legt das Buero per CLI an, siehe Benutzer anlegen; `role`
  (`admin`, `buero`, `monteur`) wird gespeichert, aber noch nirgends
  ausgewertet.
- **Dashboard (`/dashboard`, `/dashboard/[jobId]`):** offene
  Wartungsauftraege (`geplant`, `terminiert`, `ueberfaellig`), sortiert nach
  Faelligkeit, maximal 50 Zeilen, mit Statusfilter (Alle/Geplant/Terminiert/
  Ueberfaellig). Kennzahlen oben: Ueberfaellig, Faellig in 30 Tagen, Offen
  gesamt. Relative Angaben wie "heute", "morgen", "in 10 Tagen", "seit 3 Tagen".
  Auftraege legt der taegliche Scan in `src/lib/jobs/maintenance.ts` an
  (30 Tage Vorlauf, idempotent). Die Detailseite zeigt Termin, Monteur, Notiz
  und Protokolle zum Auftrag und bietet zwei Server Actions in
  `src/app/(dashboard)/dashboard/actions.ts`: `terminAuftrag` (Termin ist
  Pflicht, Monteur optional, Status wird `terminiert`, auch Umbuchen aus
  `terminiert` heraus) und `storniereAuftrag` (mit Rueckfrage; `erledigt` und
  `storniert` sind Endzustaende). Ein Button fuehrt direkt zum
  Serviceprotokoll (`/protokoll/[jobId]`).
- **Kunden (`/kunden`, `/neu`, `/[id]`, `/[id]/bearbeiten`):** CRUD ueber
  Server Actions in `src/app/(dashboard)/kunden/actions.ts`. Loeschen nur ohne
  Anlagen: die Action blockiert, solange Anlagen am Kunden haengen - sonst
  wuerden Auftraege, Protokolle und Attachment-Metadaten per
  `onDelete: cascade` mitgeloescht und R2-Objekte verwaist zurueckbleiben.
- **Anlagen (`/anlagen`, analog + `/[id]/qr`):** CRUD ueber
  `src/app/(dashboard)/anlagen/actions.ts`. `qrToken` wird per
  `generateQrToken()` erzeugt und bleibt nach dem Anlegen unveraenderlich (der
  Aufkleber klebt bereits). `/anlagen/[id]/qr` ist die Druckansicht fuer den
  Aufkleber. Es gibt keinen Loesch-Endpunkt - stattdessen Deaktivieren via
  `aktiv`-Flag: inaktive Anlagen fallen aus dem Wartungs-Scan, Historie bleibt
  erhalten.
- **Folgetermin (Anlage-Formular):** bleibt `naechste_wartung_am` beim
  Speichern leer, wird es aus `letzte_wartung_am` + `wartungsintervall_monate`
  berechnet - sonst faende der Scan die Anlage nie. Ein eingetragener Wert
  gewinnt. Nach einem Protokoll gilt zusaetzlich die Max-Regel unter
  Entscheidungen (manuell weiter nach hinten gelegte Termine bleiben).
- **Mobil (`/scan`, `/anlage/[qrToken]`, `/protokoll/[jobId]`,
  `/protokoll/neu?installation=...`):** QR-Scan per Kamera (`QrScanner`:
  nativ per BarcodeDetector, jsQR-Fallback fuer Safari/iPhone, manuelle
  Token-Eingabe als Ausweg; fremde QR-Codes werden ignoriert), Anlagendetail
  mit direktem Foto-Upload, Protokollformular mit Messwerten (Abgastemp.,
  CO2, Druck - Komma-Eingabe wird normalisiert), Arbeitszeit, Taetigkeiten,
  Maengeln, Fotos und Unterschrift. Das Absenden laeuft ueber die Server
  Action `protokollAbschliessen` in `src/app/(mobile)/protokoll/actions.ts`:
  Sie schreibt `service_report`, verknuepft nur die Attachments dieser Sitzung
  (gleiche Anlage, noch ohne Report; Signatur-Key wird serverseitig aus der
  juengsten Signatur-Datei abgeleitet), setzt den Auftrag auf `erledigt`,
  schreibt letzte und naechste Wartung fort (siehe Folgetermin-Regel oben)
  und stoesst die Kundenbestaetigung (`sendServiceReportEmail`, best effort)
  an. `jobId === "neu"` ist ein Spontanprotokoll ohne vorherigen Auftrag -
  ein gleichzeitig offener Auftrag derselben Anlage wird dabei automatisch mit
  abgeschlossen (fruehester zuerst).
- **Dateien:** Upload als Proxy ueber `/api/upload` nach R2 plus Metadaten in
  `attachment`, Auslieferung geschuetzt ueber `/api/files/*` (Session-Pflicht,
  `..`-Keys abgewiesen). Limits: max. 15 MB, Typen JPEG/PNG/WebP/HEIC/PDF.
  Ordner im Bucket: `fotos/`, `signaturen/`, `dokumente/` je Anlage.

## Deployment

```bash
pnpm exec wrangler secret put DATABASE_URL
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put RESEND_API_KEY
pnpm exec wrangler secret put RESEND_FROM
pnpm exec wrangler secret put MAINTENANCE_NOTIFY_EMAIL
pnpm exec wrangler secret put CRON_SECRET
pnpm run deploy
```

Vor dem ersten Deploy: beide R2-Buckets anlegen (siehe Setup) und als
`DATABASE_URL`-Secret die **Produktions**-URL setzen, nicht die des
`dev`-Branchs.

### Benutzer anlegen

Die App kennt keine Selbstregistrierung - `/api/auth/sign-up/email` ist ueber
`disableSignUp: true` geschlossen. Konten legt das Buero mit dem CLI-Skript an:

```bash
pnpm user:create -- --email=chef@example.de --name="Anna Chef" --role=admin
```

Rollen: `admin`, `buero`, `monteur` (Default). Steht keine `DATABASE_URL` in der
Umgebung, fragt das Skript sie ab - fuer Produktion also die URL aus dem
Passwortmanager einfuegen, fuer den dev-Branch die aus `.env`. Der Ziel-Host
wird vor dem Schreiben angezeigt und muss mit `ja` bestaetigt werden
(`--yes` ueberspringt die Abfrage fuer Skripte).

Das erzeugte Passwort erscheint genau einmal in der Ausgabe; einen Dialog zum
Aendern gibt es in der App noch nicht. Ein eigenes Passwort geht ueber
`NEW_USER_PASSWORD` (mindestens 10 Zeichen).

## Struktur

```
src/
  app/
    page.tsx                Landing: Wahl zwischen Scan und Dashboard
    (auth)/login            Login
    (dashboard)/            Buero-Ansichten (Session-Guard im Layout)
      dashboard/            Offene Wartungen (Liste + Filter), [jobId] (Detail,
                            Termin, Storno) + actions.ts
      kunden/               Liste, neu, [id], [id]/bearbeiten + actions.ts
      anlagen/              Liste, neu, [id], [id]/bearbeiten, [id]/qr + actions.ts
    (mobile)/               Monteur-Ansichten (eigenes Layout + Bottom-Nav)
      scan                  QR-Scan (Kamera + Texteingabe-Fallback)
      anlage/[qrToken]      Anlagendetail per QR-Token
      protokoll/[jobId]     Serviceprotokoll zum Auftrag ("neu" = Spontanprotokoll)
    api/
      auth/[...all]         Better Auth Catch-All
      cron/maintenance      Wartungs-Scan als HTTP-Endpunkt (GET/POST, Bearer CRON_SECRET)
      upload                Proxy-Upload nach R2 + Metadaten in Postgres
      files/[...key]        geschuetzte Auslieferung aus R2
      health                Verbindungstest aller Dienste
  components/
    ui/                     shadcn/ui (button, card, input, label, textarea, table,
                            badge, separator, sonner, ...)
    dashboard/              kunde-form, anlage-form, auftrag-termin-form,
                            form-field, action-button
    mobile/                 qr-scanner, camera-capture, signature-pad, protokoll-form
    shared/                 Header, Sidebar, Mobile-Nav, Login-Formular, Sign-out
  lib/
    actions.ts              ActionState, Feldfehler, Unique-Erkennung (Server Actions)
    auth.ts                 Better-Auth-Instanz (lazy)
    auth-client.ts          Client-Hooks
    dates.ts                addMonths() fuer Folgetermine
    db/                     Neon + Drizzle (index.ts, schema.ts mit 9 Tabellen)
    email.ts                Resend-Client und Mail-Templates
    r2.ts                   Bucket-Helper ueber env.MY_BUCKET
    session.ts              requireSession() fuer Server-Komponenten
    tokens.ts               generateQrToken()
    utils.ts                cn() (Tailwind-Klassen)
    jobs/maintenance.ts     taeglicher Wartungs-Scan (VORLAUF_TAGE = 30)
  types/index.ts            UploadResult, HealthResponse, AuftragMitKontext, ...
  worker.ts                 Worker-Entrypoint: fetch + scheduled
public/manifest.webmanifest PWA-Manifest (standalone)
drizzle/                    Migrationen (per db:generate erzeugt) + meta/
scripts/create-user.mts     Benutzer anlegen (CLI, siehe Deployment)
scripts/send-test-email.mts Resend-Test ohne DB/Dev-Server
```

## Entscheidungen, die beim Weiterbauen wichtig sind

- **Kein `proxy.ts` / `middleware.ts`.** Der Session-Guard sitzt in den Layouts
  (`requireSession`). Node-Runtime-Middleware ist unter OpenNext/Cloudflare
  experimentell und ihr Bundling scheitert auf Windows ohne Entwicklermodus an
  Symlink-Rechten.
- **`nodeLinker: hoisted`** in `pnpm-workspace.yaml`, aus demselben Grund:
  OpenNext legt beim Bundling Symlinks nach, die pnpm sonst erzeugt.
- **Keine Presigned URLs.** R2-Bindings koennen keine signierten URLs erzeugen.
  Uploads laufen als Proxy ueber `/api/upload`, Auslieferung ueber
  `/api/files/*`. Direkte Browser-Uploads brauechten die S3-kompatible R2-API
  mit Access Keys.
- **Keine Selbstregistrierung.** `disableSignUp: true` in `src/lib/auth.ts`;
  sonst waere der Better-Auth-Endpunkt `/api/auth/sign-up/email` oeffentlich
  und jeder koennte sich ein `monteur`-Konto und damit Zugriff auf alle
  Kundendaten anlegen. Konten kommen aus `scripts/create-user.mts`, das dafuer
  eine eigene Auth-Instanz mit offenem Sign-up baut.
- **Lazy Clients.** `getDb()`, `getAuth()` und `getResend()` bauen ihre Instanz
  erst beim ersten Zugriff auf, damit fehlende Env-Variablen als sauberer
  Fehler in `/api/health` landen statt beim Modul-Import.
- **Trusted Origins fuer beide Dev-Ports.** `src/lib/auth.ts` vertraut
  `localhost:3000` (next dev) und `localhost:8787` (Worker-Preview) - sonst
  scheitert der Login am jeweils anderen Port mit `INVALID_ORIGIN`.
- **Jede Server Action ruft selbst `requireSession()`.** Actions sind eigene
  POST-Endpunkte; der Guard im Layout schuetzt nur das Rendern der Seite.
- **Server Actions nicht im Render einer Client-Komponente binden.**
  `updateKunde.bind(null, id)` gehoert in die Server-Komponente und wird als
  Prop uebergeben. Beim Binden im Client-Render entsteht pro Durchlauf eine
  neue Action-Referenz; gibt die Action dann einen Fehlerzustand zurueck statt
  zu redirecten, antwortet der Server nicht mehr.
- **Protokoll-Abschluss ist best effort bei der Mail, strikt bei den Daten.**
  `protokollAbschliessen` arbeitet in fester Reihenfolge (Report, dann
  Attachment-Verknuepfung, Job-Status, Folgetermin); fruehe Fehler brechen mit
  Feldmeldung ab, damit nichts halb Fertiges redirectet. Die
  Kundenbestaetigung per Resend wird nur geloggt, wenn sie scheitert - ohne
  verifizierte Domain waere die Funktion in dev sonst unbenutzbar.
- **Folgetermin: Handarbeit schlaegt Automatik.** Nach einem Protokoll wird
  `naechsteWartungAm` auf `max(durchgefuehrtAm + Intervall, bestehender
  manueller Termin)` gesetzt - ein vom Buero bewusst weiter nach hinten gelegter
  Termin bleibt also bestehen.
- **Spontanprotokoll uebernimmt offenen Auftrag.** Wird `/protokoll/neu` ohne
  Job aufgerufen, obwohl ein offener Auftrag an der Anlage haengt, wird der
  frueheste uebernommen und mit abgeschlossen statt als Karteileiche zu bleiben.
- **Auftrags-Status sind ein Einbahnstrang mit zwei Ausgaengen.**
  `geplant`/`ueberfaellig`/`terminiert` lassen sich terminieren (erneut) und
  stornieren; `erledigt` (nur via Protokoll) und `storniert` sind
  Endzustaende. Ein stornierter Auftrag bleibt in der Anlagen-Historie, zaehlt
  aber nicht mehr als offen - der naechste Scan legt bei Bedarf einen neuen an.
