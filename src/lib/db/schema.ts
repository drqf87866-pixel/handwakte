import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Better Auth                                                                 */
/* Tabellen und Spalten entsprechen dem Better-Auth-Core-Schema.               */
/* Nach Aenderungen an auth.ts mit `pnpm auth:generate` abgleichen.            */
/* -------------------------------------------------------------------------- */

/** Rollen im Betrieb: Buero/Admin vs. Monteur im Aussendienst. */
export const userRole = pgEnum("user_role", ["admin", "buero", "monteur"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("monteur"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* -------------------------------------------------------------------------- */
/* Domaene: Digitale Bauakte                                                   */
/* -------------------------------------------------------------------------- */

/** Lebenszyklus eines Wartungsauftrags. */
export const jobStatus = pgEnum("job_status", [
  "geplant",
  "terminiert",
  "erledigt",
  "ueberfaellig",
  "storniert",
]);

/** Art einer in R2 abgelegten Datei. */
export const attachmentKind = pgEnum("attachment_kind", ["foto", "pdf", "signatur", "sonstiges"]);

/** Kunde des Betriebs (Hausverwaltung, Eigentuemer, Gewerbe). */
export const customer = pgTable(
  "customer",
  {
    id: text("id").primaryKey(),
    kundennummer: text("kundennummer").notNull(),
    name: text("name").notNull(),
    ansprechpartner: text("ansprechpartner"),
    email: text("email"),
    telefon: text("telefon"),
    strasse: text("strasse"),
    plz: text("plz"),
    ort: text("ort"),
    notizen: text("notizen"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customer_kundennummer_idx").on(t.kundennummer)],
);

/** Eine konkrete Heizungs- oder Sanitaeranlage beim Kunden (die Bauakte). */
export const installation = pgTable(
  "installation",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),

    bezeichnung: text("bezeichnung").notNull(),
    hersteller: text("hersteller"),
    modell: text("modell"),
    serienNr: text("serien_nr"),
    baujahr: integer("baujahr"),

    /** Aufstellort, z.B. "Keller, Heizraum links" oder "3. OG". */
    standort: text("standort"),
    strasse: text("strasse"),
    plz: text("plz"),
    ort: text("ort"),

    /**
     * Token auf dem QR-Aufkleber an der Anlage. Der Monteur scannt ihn und
     * landet direkt auf /anlage/<qrToken>. Nicht erratbar waehlen.
     */
    qrToken: text("qr_token").notNull(),

    wartungsintervallMonate: integer("wartungsintervall_monate").notNull().default(12),
    letzteWartungAm: timestamp("letzte_wartung_am", { withTimezone: true }),
    naechsteWartungAm: timestamp("naechste_wartung_am", { withTimezone: true }),

    aktiv: boolean("aktiv").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("installation_qr_token_idx").on(t.qrToken),
    index("installation_customer_id_idx").on(t.customerId),
    index("installation_naechste_wartung_idx").on(t.naechsteWartungAm),
  ],
);

/** Ein faelliger bzw. eingeplanter Wartungsauftrag zu einer Anlage. */
export const maintenanceJob = pgTable(
  "maintenance_job",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id")
      .notNull()
      .references(() => installation.id, { onDelete: "cascade" }),

    faelligAm: timestamp("faellig_am", { withTimezone: true }).notNull(),
    terminAm: timestamp("termin_am", { withTimezone: true }),
    status: jobStatus("status").notNull().default("geplant"),

    monteurId: text("monteur_id").references(() => user.id, { onDelete: "set null" }),
    notiz: text("notiz"),

    /** Vom Cron gesetzt, verhindert doppelte Erinnerungs-Mails. */
    erinnerungGesendetAm: timestamp("erinnerung_gesendet_am", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("maintenance_job_installation_idx").on(t.installationId),
    index("maintenance_job_status_faellig_idx").on(t.status, t.faelligAm),
  ],
);

/** Serviceprotokoll, das der Monteur vor Ort ausfuellt und quittieren laesst. */
export const serviceReport = pgTable(
  "service_report",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").references(() => maintenanceJob.id, { onDelete: "set null" }),
    installationId: text("installation_id")
      .notNull()
      .references(() => installation.id, { onDelete: "cascade" }),
    monteurId: text("monteur_id").references(() => user.id, { onDelete: "set null" }),

    durchgefuehrtAm: timestamp("durchgefuehrt_am", { withTimezone: true }).notNull().defaultNow(),
    arbeitszeitMinuten: integer("arbeitszeit_minuten"),

    /** Freie Messwerte, z.B. { abgastemperatur: 120, co2: 9.4, druck: 1.8 }. */
    messwerte: jsonb("messwerte").$type<Record<string, string | number | null>>(),
    taetigkeiten: text("taetigkeiten"),
    maengel: text("maengel"),
    empfehlungen: text("empfehlungen"),

    /** R2-Key des Signatur-PNG plus Klarname des Unterzeichners. */
    unterschriftKey: text("unterschrift_key"),
    unterschriftName: text("unterschrift_name"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("service_report_installation_idx").on(t.installationId),
    index("service_report_job_idx").on(t.jobId),
  ],
);

/** Metadaten zu einer Datei im R2-Bucket (MY_BUCKET). */
export const attachment = pgTable(
  "attachment",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id").references(() => installation.id, {
      onDelete: "cascade",
    }),
    reportId: text("report_id").references(() => serviceReport.id, { onDelete: "cascade" }),

    /** Object-Key im Bucket, siehe buildObjectKey() in src/lib/r2.ts. */
    r2Key: text("r2_key").notNull(),
    dateiname: text("dateiname").notNull(),
    contentType: text("content_type").notNull(),
    groesseBytes: integer("groesse_bytes").notNull(),
    art: attachmentKind("art").notNull().default("foto"),

    hochgeladenVon: text("hochgeladen_von").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("attachment_r2_key_idx").on(t.r2Key),
    index("attachment_installation_idx").on(t.installationId),
    index("attachment_report_idx").on(t.reportId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Relations (fuer db.query.*)                                                 */
/* -------------------------------------------------------------------------- */

export const customerRelations = relations(customer, ({ many }) => ({
  installations: many(installation),
}));

export const installationRelations = relations(installation, ({ one, many }) => ({
  customer: one(customer, {
    fields: [installation.customerId],
    references: [customer.id],
  }),
  jobs: many(maintenanceJob),
  reports: many(serviceReport),
  attachments: many(attachment),
}));

export const maintenanceJobRelations = relations(maintenanceJob, ({ one, many }) => ({
  installation: one(installation, {
    fields: [maintenanceJob.installationId],
    references: [installation.id],
  }),
  monteur: one(user, {
    fields: [maintenanceJob.monteurId],
    references: [user.id],
  }),
  reports: many(serviceReport),
}));

export const serviceReportRelations = relations(serviceReport, ({ one, many }) => ({
  installation: one(installation, {
    fields: [serviceReport.installationId],
    references: [installation.id],
  }),
  job: one(maintenanceJob, {
    fields: [serviceReport.jobId],
    references: [maintenanceJob.id],
  }),
  monteur: one(user, {
    fields: [serviceReport.monteurId],
    references: [user.id],
  }),
  attachments: many(attachment),
}));

export const attachmentRelations = relations(attachment, ({ one }) => ({
  installation: one(installation, {
    fields: [attachment.installationId],
    references: [installation.id],
  }),
  report: one(serviceReport, {
    fields: [attachment.reportId],
    references: [serviceReport.id],
  }),
}));

export type User = typeof user.$inferSelect;
export type Customer = typeof customer.$inferSelect;
export type Installation = typeof installation.$inferSelect;
export type MaintenanceJob = typeof maintenanceJob.$inferSelect;
export type ServiceReport = typeof serviceReport.$inferSelect;
export type Attachment = typeof attachment.$inferSelect;
