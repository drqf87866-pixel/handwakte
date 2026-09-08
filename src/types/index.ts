import type {
  Attachment,
  Customer,
  Installation,
  MaintenanceJob,
  ServiceReport,
} from "@/lib/db/schema";

export type { Attachment, Customer, Installation, MaintenanceJob, ServiceReport };

export type Rolle = "admin" | "buero" | "monteur";

export type JobStatus = MaintenanceJob["status"];

/** Antwortform von /api/upload. */
export type UploadResult = {
  id: string;
  key: string;
  url: string;
};

/** Ein Auftrag samt Kontext, wie ihn die Listen im Dashboard brauchen. */
export type AuftragMitKontext = MaintenanceJob & {
  installation: Pick<Installation, "id" | "bezeichnung" | "standort" | "qrToken">;
  kunde: Pick<Customer, "id" | "name">;
};

/** Antwortform von /api/health. */
export type HealthCheck = { ok: boolean; detail: string; ms: number };
export type HealthResponse = {
  ok: boolean;
  timestamp: string;
  checks: Record<"db" | "r2" | "resend" | "auth", HealthCheck>;
};
