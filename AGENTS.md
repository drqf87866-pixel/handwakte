# handwakte — Digitale Bauakte (agent instructions)

B2B app for a heating/plumbing business: office staff manage customers and
installations on desktop, technicians scan QR stickers on site and file service
reports from their phones. Stack: Next.js 16 App Router on Cloudflare Workers
via `@opennextjs/cloudflare`, Neon Postgres over `@neondatabase/serverless` +
Drizzle ORM, Better Auth (email/password, no self-signup), Cloudflare R2 via
the `MY_BUCKET` worker binding, Resend for email, daily cron scan at 06:00 UTC.

## Business context

- Initial users: two brothers running a heating/plumbing business with no
  employees; both do office and field work themselves.
- No role separation needed for now: `role` (`admin`, `buero`, `monteur`)
  exists in the schema for future growth but is intentionally not enforced
  in guards or UI. Do not build role enforcement or user-management UI
  unless explicitly requested.

Docs (do not duplicate, link instead):

- `README.md` — setup, dev workflow, features, deployment, architecture decisions.
- `docs/BENUTZERHANDBUCH.md` — user manual (German). Update it when UI text or
  user-facing behavior changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Toolchain and commands

- Package manager is `pnpm` (`packageManager: pnpm@12.3.4`). Never use npm/yarn.
- `pnpm dev` — Next.js dev server (`localhost:3000`, bindings included).
- `pnpm preview` — OpenNext build + real Workers runtime (`localhost:8787`).
  `next dev` and the Worker preview are different origins; both are trusted in
  `src/lib/auth.ts`, keep it that way.
- `pnpm typecheck` — runs `next typegen && tsc --noEmit`. The typegen step is
  load-bearing (see gotchas), do not simplify it back to bare `tsc`.
- `pnpm lint` — eslint (flat config, Next core-web-vitals + typescript).
- `pnpm cf-typegen` — regenerates `worker-configuration.d.ts` after changing
  `wrangler.jsonc` bindings.
- Database: `pnpm db:push` dev branch only (compares against the live DB),
  `pnpm db:migrate` for production, `pnpm db:generate` to create a migration
  from schema changes (commit the result). Never point `db:push` at production.
- `pnpm auth:generate` — re-sync the Better Auth schema after changing
  `src/lib/auth.ts`.
- `pnpm user:create -- --email=… --name="…"` — create accounts (no
  self-signup in the app). Test email without dev server or DB via
  `scripts/send-test-email.mts` (see `README.md`).

## Gotchas (hard rules, all verified against the code)

- **Push auf main ist ein Produktions-Deploy.** Die Cloudflare-GitHub-Integration
  deployed bei jedem Push auf `main` automatisch. Kein Push ohne ausdrueckliche
  Freigabe; ein Commit allein (ohne Push) deployt nichts.
- **Stale `.next` route types.** The global `PageProps<"…">` helper validates
  against the generated route manifest. If `tsc` reports a route as not
  satisfying `AppRoutes` even though the page file exists, the manifest is
  stale — run `pnpm exec next typegen`. Never edit `next-env.d.ts` or anything
  under `.next/` by hand.
- **No `proxy.ts` / `middleware.ts`.** Auth guard is `requireSession()` in the
  `(dashboard)` and `(mobile)` layouts. Node-runtime middleware breaks the
  OpenNext/Cloudflare bundle on Windows (symlink permissions).
- **`nodeLinker: hoisted`** in `pnpm-workspace.yaml` exists for the same
  reason. Do not change it.
- **No presigned R2 URLs.** Bindings cannot sign URLs. Uploads proxy through
  `/api/upload`, delivery goes through the guarded `/api/files/*` route. Direct
  browser uploads would need the S3-compatible R2 API with access keys.
- **Lazy clients.** `getDb()`, `getAuth()`, `getResend()` construct on first
  use so missing env vars surface as clean `/api/health` errors instead of
  import-time crashes. No top-level env access in these modules.
- **Every server action calls `requireSession()` itself.** Actions are their
  own POST endpoints; the layout guard only protects page rendering.
- **Never `.bind()` a server action inside a client component render**
  (e.g. `updateKunde.bind(null, id)` belongs in the server component and is
  passed down as a prop). Rebinding per render breaks error-state responses.
- **`disableSignUp: true`** in `src/lib/auth.ts` is a security boundary
  (otherwise anyone could mint a `monteur` account and read all customer
  data). Accounts come exclusively from `scripts/create-user.mts`, which
  builds its own open-signup auth instance for that purpose.

## Conventions

- Language is German; **ASCII spelling only** (`ue/ae/oe/ss`, no Umlauts) in
  code comments, UI strings, and docs. Keep it that way for consistency.
- Route groups `(dashboard)` / `(mobile)` are URL-transparent:
  `src/app/(dashboard)/anlagen/[id]/page.tsx` serves `/anlagen/[id]`. Use
  `PageProps<'/anlagen/[id]'>` (public path, without group) for page props.
- Domain rules: maintenance scan lead time `VORLAUF_TAGE = 30`
  (`src/lib/jobs/maintenance.ts`, idempotent); `qrToken` is immutable after
  creation; deactivation via the `aktiv` flag instead of deletion (no delete
  endpoint for installations); follow-up date after a report is
  `max(now + interval, existing manual date)` — manual input wins.
- Mail is best effort, data is strict: `protokollAbschliessen` fails the action
  on data errors but only logs Resend failures (dev has no verified domain).

## Verification checklist

- After code changes: `pnpm typecheck && pnpm lint` must be green.
- When adding features: extend the Funktionen/Struktur sections in `README.md`;
  when changing UI text or user-facing behavior: update
  `docs/BENUTZERHANDBUCH.md` as well.
- Cron changes must touch `wrangler.jsonc` and `src/worker.ts` consistently;
  R2 binding changes additionally need `pnpm cf-typegen`.
