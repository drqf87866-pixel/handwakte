import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Zugriff auf den R2-Bucket erfolgt ueber das Cloudflare-Worker-Binding
 * (`env.MY_BUCKET`) - kein S3-SDK, keine Access Keys, kein Netzwerk-Hop.
 *
 * Hinweis zu Presigned URLs: Bindings koennen keine signierten URLs erzeugen.
 * Direkte Browser-Uploads brauchen die S3-kompatible R2-API mit Access Keys
 * (z.B. via aws4fetch). Fuer das MVP laufen Uploads daher als Proxy ueber
 * /api/upload und die Auslieferung ueber die geschuetzte Route /api/files/*.
 */
export async function getBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = env.MY_BUCKET;

  if (!bucket) {
    throw new Error(
      "R2-Binding MY_BUCKET fehlt. In wrangler.jsonc pruefen und `pnpm cf-typegen` laufen lassen.",
    );
  }

  return bucket;
}

export type ObjectKeyInput = {
  /** Ordner-Ebene im Bucket. */
  kind: "fotos" | "signaturen" | "dokumente";
  /** Anlage, zu der die Datei gehoert - haelt die Bauakte im Bucket beisammen. */
  installationId: string;
  filename: string;
};

/** Dateiname auf ASCII, Kleinschreibung und Bindestriche normalisieren. */
function slugify(filename: string): string {
  return filename
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Baut einen kollisionsfreien Object-Key, z.B.
 * `installations/abc123/fotos/1757000000000-kessel-vorne.jpg`.
 */
export function buildObjectKey({ kind, installationId, filename }: ObjectKeyInput): string {
  const safeName = slugify(filename) || "datei";
  return `installations/${installationId}/${kind}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
}

export async function putObject(
  key: string,
  body: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
  options: { contentType?: string; customMetadata?: Record<string, string> } = {},
) {
  const bucket = await getBucket();
  return bucket.put(key, body, {
    httpMetadata: options.contentType ? { contentType: options.contentType } : undefined,
    customMetadata: options.customMetadata,
  });
}

export async function getObject(key: string) {
  const bucket = await getBucket();
  return bucket.get(key);
}

export async function headObject(key: string) {
  const bucket = await getBucket();
  return bucket.head(key);
}

export async function deleteObject(key: string) {
  const bucket = await getBucket();
  await bucket.delete(key);
}

export async function listObjects(prefix: string, limit = 100) {
  const bucket = await getBucket();
  return bucket.list({ prefix, limit });
}

/** Interne URL, unter der eine hochgeladene Datei ausgeliefert wird. */
export function objectUrl(key: string): string {
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
}
