# Übergabestand

Stand: 08.09.2026, Ende der Gerüst-Phase.
Ergänzt das [README](README.md) um das, was beim Weiterarbeiten oder auf einem
neuen Rechner sonst fehlt. Für Architektur und Setup dort nachschlagen.

> Dieses Repo ist öffentlich. Hier stehen deshalb keine Zugangsdaten,
> Connection Strings oder Endpoint-Namen — die liegen im Passwortmanager
> und in den Dashboards von Neon, Resend und Cloudflare.

---

## Was fertig ist

Das komplette Architektur-Gerüst steht und ist end-to-end verifiziert, sowohl
in `next dev` als auch in der echten Workers-Runtime (`wrangler dev`):

| Bereich | Stand |
| --- | --- |
| `/api/health` | alle vier Dienste grün (Neon, R2, Resend, Better Auth) |
| Auth | Sign-up, Login, Session, Rollenfeld `role` mit Default `monteur` |
| Zugriffsschutz | `requireSession()` in den Layouts, 307 auf `/login`; `/api/files/*` und `/api/upload` geben 401 ohne Session |
| R2 | Upload → Bucket → Download bytegleich, Metadaten landen in `attachment` |
| Cron | `scheduled()` über Cron-Trigger und HTTP-Endpunkt mit `CRON_SECRET`; zweiter Lauf ist idempotent |
| E-Mail | Wartungs-Benachrichtigung wird real zugestellt |
| DB | Schema per `db:push` ausgerollt, 9 Tabellen, Migration liegt in `drizzle/` |

---

## Auf einem neuen Rechner

**`.env` und `.dev.vars` sind gitignored und fehlen nach dem Clone.** Beide
müssen angelegt und *identisch* befüllt werden — `.env` versorgt `next dev`
und die `db:*`-Skripte, `.dev.vars` versorgt `wrangler dev` und `pnpm preview`.
Laufen sie auseinander, arbeiten Dev-Server und Worker gegen verschiedene
Datenbanken, ohne dass es auffällt.

```bash
git clone <repo> && cd handwakte
cp .env.example .env
cp .env.example .dev.vars     # danach beide mit denselben Werten füllen
pnpm install
pnpm cf-typegen               # erzeugt worker-configuration.d.ts
pnpm dev
```

Woher die Werte kommen, steht in `.env.example` und im README. Kurz:

| Variable | Quelle |
| --- | --- |
| `DATABASE_URL` | Neon → Branch **`dev`** → Pooled connection. Nie der Produktions-Branch. |
| `BETTER_AUTH_SECRET` | frei neu erzeugen (`openssl rand -base64 32`); invalidiert nur bestehende Dev-Sessions |
| `BETTER_AUTH_URL` | `http://localhost:3000` |
| `RESEND_API_KEY` | Resend Dashboard |
| `RESEND_FROM` | `Wartung <onboarding@resend.dev>`, solange keine Domain verifiziert ist |
| `MAINTENANCE_NOTIFY_EMAIL` | die Adresse, mit der der Resend-Account registriert ist |
| `CRON_SECRET` | frei neu erzeugen |

Die Datenbank ist bereits migriert — `db:push` ist auf dem neuen Rechner nicht
nötig.

Unter Windows ohne aktivierten Entwicklermodus ist das Symlink-Problem des
OpenNext-Builds bereits abgefangen: `nodeLinker: hoisted` steht in der
committeten `pnpm-workspace.yaml`.

---

## Demo-Daten im `dev`-Branch

Im Neon-`dev`-Branch liegen ein Testkonto und drei Anlagen zum Durchklicken
(nicht im Repo, nur in der Datenbank). Zugangsdaten stehen im Passwortmanager.

| QR-Token | Anlage | Fällig | Zweck |
| --- | --- | --- | --- |
| `demo1234` | Gas-Brennwertkessel Haus A | in ~10 Tagen | Normalfall, Job wird angelegt |
| `demo5678` | Gas-Brennwertkessel Haus B | in ~120 Tagen | liegt außerhalb des 30-Tage-Vorlaufs, bewusst kein Job |
| `demo9012` | Warmwasserbereiter Backstube | überfällig | Status `ueberfaellig` |

Aufruf über `/anlage/<qr-token>` oder `/scan` (dort den Token eintippen, der
Scanner ist noch ein Stub).

Falls die Demo-Daten fehlen: sie wurden per Ad-hoc-Skript eingespielt, es gibt
kein Seed-Skript im Repo. Bei Bedarf neu anlegen oder eins schreiben.

---

## Bekannte Einschränkungen

- **Resend ohne verifizierte Domain.** Absender kann nur
  `onboarding@resend.dev` sein, und zugestellt wird ausschließlich an die
  eigene Resend-Account-Adresse. `sendMaintenanceDueEmail` (ans Büro)
  funktioniert damit, `sendServiceReportEmail` (an den Kunden) erst nach
  Domain-Verifizierung — dann ändert sich nur `RESEND_FROM`, kein Code.
  Achtung bei der Zuordnung: `RESEND_FROM` ist der **Absender**,
  `MAINTENANCE_NOTIFY_EMAIL` der **Empfänger**. Von einer Freemail-Adresse zu
  senden schlägt fehl, weil einem die Domain nicht gehört.
- **R2-Buckets existieren noch nicht real.** Bisher lief alles gegen den
  lokalen Miniflare-Store unter `.wrangler/`. Vor dem ersten Deploy:
  `pnpm exec wrangler r2 bucket create handwakte-media` und
  `… handwakte-media-dev`.
- **Produktions-Branch ist leer** (Schema vorhanden, keine Zeilen). Gegen
  Produktion nie `db:push`, sondern `db:generate` + `db:migrate` — `push`
  vergleicht direkt gegen die Live-DB und kann bestehende Spalten umtypisieren.

---

## Nächste Schritte

1. **QR-Scanner echt machen** — `src/components/mobile/qr-scanner.tsx` ist ein
   Stub mit Texteingabe. BarcodeDetector API mit WASM-Fallback, Props stehen
   bereits.
2. **Protokoll speichern** — `src/components/mobile/protokoll-form.tsx` sammelt
   Messwerte, Fotos und Signatur; das Absenden ist noch ein `toast.info`.
   Braucht eine Server Action, die `service_report` schreibt, den Job auf
   `erledigt` setzt und `naechste_wartung_am` um `wartungsintervall_monate`
   fortschreibt.
3. **Kunden- und Anlagen-CRUD** — beide Dashboard-Seiten sind Platzhalter.
   Beim Anlegen einer Anlage muss ein nicht erratbarer `qrToken` erzeugt und
   der QR-Aufkleber druckbar gemacht werden.
4. **Deployment** — R2-Buckets anlegen, Secrets per `wrangler secret put`
   setzen (dabei die **Produktions**-`DATABASE_URL`), dann `pnpm deploy`.

Bewusst nicht Teil der Gerüst-Phase und noch offen: PDF-Generierung der
Protokolle, Rollen-/Rechtematrix, Service Worker und Offline-Sync für den
Keller ohne Empfang, Tests, CI.
