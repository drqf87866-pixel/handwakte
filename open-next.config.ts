import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Incremental Cache / Tag Cache / Queue bleiben vorerst auf Default.
  // Bei Bedarf: r2IncrementalCache, d1NextTagCache, ...
});
