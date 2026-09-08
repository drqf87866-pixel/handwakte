/**
 * Typisierung der Cloudflare-Bindings fuer `getCloudflareContext().env`.
 *
 * `CloudflareEnv` ist ein globales Interface aus @opennextjs/cloudflare; wir
 * erweitern es hier per Declaration Merging um unsere eigenen Bindings.
 * Die Runtime-Typen (R2Bucket, Fetcher, ...) liefert `worker-configuration.d.ts`,
 * das per `pnpm cf-typegen` aus der wrangler.jsonc erzeugt wird.
 */
declare global {
  interface CloudflareEnv {
    /** R2 Bucket fuer Fotos, Signaturen und PDFs der digitalen Bauakte. */
    MY_BUCKET: R2Bucket;

    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    RESEND_API_KEY: string;
    RESEND_FROM: string;
    MAINTENANCE_NOTIFY_EMAIL: string;
    CRON_SECRET: string;
  }
}

export {};
