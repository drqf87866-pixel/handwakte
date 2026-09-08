// Eigener Worker-Entrypoint (wrangler.jsonc -> "main").
//
// OpenNext baut den Next.js-Handler nach .open-next/worker.js. Wir reichen
// dessen fetch() unveraendert durch und haengen zusaetzlich einen scheduled()
// Handler an - so bedient ein einziger Worker sowohl die App als auch den
// Cron-Trigger ("0 6 * * *").
//
// Der Import zeigt auf ein Build-Artefakt, das erst durch
// `opennextjs-cloudflare build` entsteht. Vor dem ersten Build existiert die
// Datei nicht; das ist erwartet und stoert `next dev` nicht.
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore - Build-Artefakt: existiert erst nach `opennextjs-cloudflare build`
import openNextHandler from "../.open-next/worker.js";

import { runMaintenanceScan } from "@/lib/jobs/maintenance";

// Durable Objects, die OpenNext fuer Cache und Revalidation mitliefert. Sie
// muessen aus dem Entrypoint exportiert bleiben, sonst findet Wrangler sie
// nicht, sobald in wrangler.jsonc ein entsprechendes Binding dazukommt.
// @ts-ignore - Build-Artefakt: existiert erst nach `opennextjs-cloudflare build`
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "../.open-next/worker.js";

export default {
  fetch: (request: Request, env: CloudflareEnv, ctx: ExecutionContext) =>
    openNextHandler.fetch(request, env, ctx),

  async scheduled(controller: ScheduledController, _env: CloudflareEnv, ctx: ExecutionContext) {
    ctx.waitUntil(
      runMaintenanceScan()
        .then((result) => {
          console.log("[cron] Wartungs-Scan", controller.cron, JSON.stringify(result));
        })
        .catch((error: unknown) => {
          console.error("[cron] Wartungs-Scan fehlgeschlagen", error);
        }),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;
