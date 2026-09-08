import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./src/lib/**/*"],
  },
};

export default nextConfig;

// Macht die Cloudflare-Bindings (MY_BUCKET, ...) auch in `next dev` verfuegbar,
// sodass getCloudflareContext() lokal genauso funktioniert wie im Worker.
initOpenNextCloudflareForDev();
