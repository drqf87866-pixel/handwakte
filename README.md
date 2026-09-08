# Digitale Bauakte

B2B-Plattform fuer einen Heizungsbau- und Sanitaerbetrieb: Anlagenverwaltung
("Digitale Bauakte") mit automatisiertem Wartungs- und Serviceplaner.

- **Buero (Desktop):** Kunden, Anlagen, faellige Wartungen.
- **Monteur (Mobile/PWA):** QR-Scan an der Anlage, Fotos, Serviceprotokoll,
  Unterschrift.

Aktueller Stand, Demo-Daten und die naechsten Schritte stehen in
[HANDOFF.md](HANDOFF.md).

## Stack

| Baustein | Technik |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Runtime | Cloudflare Workers via `@opennextjs/cloudflare` (`nodejs_compat`) |
| Datenbank | Neon Postgres ueber `@neondatabase/serverless` + Drizzle ORM |
| Auth | Better Auth auf derselben Neon-DB |
| Dateien | Cloudflare R2 ueber das Worker-Binding `MY_BUCKET` |
| E-Mail | Resend |
| Cron | Cloudflare Scheduled Worker, taeglich 06:00 UTC |
| UI | Tailwind CSS v4 + shadcn/ui |

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
cp .env.example .env          # und .dev.vars fuer `wrangler dev`
pnpm cf-typegen               # Typen fuer die Cloudflare-Bindings
```

`.env` ausfuellen:

| Variable | Woher |
| --- | --- |
| `DATABASE_URL` | Neon Dashboard, "Pooled connection" |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` bzw. Produktions-URL |
| `RESEND_API_KEY` / `RESEND_FROM` | Resend Dashboard, verifizierte Domain |
| `MAINTENANCE_NOTIFY_EMAIL` | Postfach des Bueros |
| `CRON_SECRET` | frei gewaehlt, schuetzt `/api/cron/maintenance` |

`.dev.vars` enthaelt dieselben Werte fuer `wrangler dev` / `pnpm preview`.

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
```

`db:push` kann bestehende Spalten umtypisieren und dabei an Fremdschluesseln
scheitern - in Produktion deshalb immer den Migrationsweg nehmen:

```bash
pnpm db:generate   # Migration aus dem geaenderten Schema erzeugen, committen
pnpm db:migrate    # anwenden
```

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
```

`/api/health` prueft Neon, R2, Resend und Better Auth einzeln und antwortet
immer mit 200 plus Detail-Objekt - so ist ablesbar, welcher Baustein klemmt.

Cron lokal ausloesen:

```bash
# echter scheduled()-Handler (wrangler dev --test-scheduled)
curl "http://localhost:8787/__scheduled?cron=0+6+*+*+*"

# HTTP-Endpunkt
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/maintenance
```

## Deployment

```bash
pnpm exec wrangler secret put DATABASE_URL     # analog fuer die uebrigen Secrets
pnpm deploy
```

## Struktur

```
src/
  app/
    (auth)/login          Login
    (dashboard)/          Buero-Ansichten (Session-Guard im Layout)
    (mobile)/             Monteur-Ansichten: scan, anlage/[qrToken], protokoll/[jobId]
    api/
      auth/[...all]       Better Auth Catch-All
      cron/maintenance    Wartungs-Scan als HTTP-Endpunkt (Bearer CRON_SECRET)
      upload              Proxy-Upload nach R2 + Metadaten in Postgres
      files/[...key]      geschuetzte Auslieferung aus R2
      health              Verbindungstest aller Dienste
  components/
    ui/                   shadcn/ui
    mobile/               QR-Scanner, Kamera, Signatur-Canvas, Protokollformular
    shared/               Header, Navigation, Login-Formular
  lib/
    auth.ts               Better-Auth-Instanz (lazy)
    auth-client.ts        Client-Hooks
    db/                   Neon + Drizzle, schema.ts
    email.ts              Resend-Client und Mail-Templates
    r2.ts                 Bucket-Helper ueber env.MY_BUCKET
    session.ts            requireSession() fuer Server-Komponenten
    jobs/maintenance.ts   taeglicher Wartungs-Scan
  worker.ts               Worker-Entrypoint: fetch + scheduled
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
- **Lazy Clients.** `getDb()`, `getAuth()` und `getResend()` bauen ihre Instanz
  erst beim ersten Zugriff auf, damit fehlende Env-Variablen als sauberer
  Fehler in `/api/health` landen statt beim Modul-Import.
