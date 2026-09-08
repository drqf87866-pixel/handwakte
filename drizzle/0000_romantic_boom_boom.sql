CREATE TYPE "public"."attachment_kind" AS ENUM('foto', 'pdf', 'signatur', 'sonstiges');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('geplant', 'terminiert', 'erledigt', 'ueberfaellig', 'storniert');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'buero', 'monteur');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" text,
	"report_id" text,
	"r2_key" text NOT NULL,
	"dateiname" text NOT NULL,
	"content_type" text NOT NULL,
	"groesse_bytes" integer NOT NULL,
	"art" "attachment_kind" DEFAULT 'foto' NOT NULL,
	"hochgeladen_von" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"kundennummer" text NOT NULL,
	"name" text NOT NULL,
	"ansprechpartner" text,
	"email" text,
	"telefon" text,
	"strasse" text,
	"plz" text,
	"ort" text,
	"notizen" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installation" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"bezeichnung" text NOT NULL,
	"hersteller" text,
	"modell" text,
	"serien_nr" text,
	"baujahr" integer,
	"standort" text,
	"strasse" text,
	"plz" text,
	"ort" text,
	"qr_token" text NOT NULL,
	"wartungsintervall_monate" integer DEFAULT 12 NOT NULL,
	"letzte_wartung_am" timestamp with time zone,
	"naechste_wartung_am" timestamp with time zone,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_job" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" text NOT NULL,
	"faellig_am" timestamp with time zone NOT NULL,
	"termin_am" timestamp with time zone,
	"status" "job_status" DEFAULT 'geplant' NOT NULL,
	"monteur_id" text,
	"notiz" text,
	"erinnerung_gesendet_am" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_report" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text,
	"installation_id" text NOT NULL,
	"monteur_id" text,
	"durchgefuehrt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"arbeitszeit_minuten" integer,
	"messwerte" jsonb,
	"taetigkeiten" text,
	"maengel" text,
	"empfehlungen" text,
	"unterschrift_key" text,
	"unterschrift_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'monteur' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_installation_id_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."installation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_report_id_service_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."service_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_hochgeladen_von_user_id_fk" FOREIGN KEY ("hochgeladen_von") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installation" ADD CONSTRAINT "installation_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_job" ADD CONSTRAINT "maintenance_job_installation_id_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."installation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_job" ADD CONSTRAINT "maintenance_job_monteur_id_user_id_fk" FOREIGN KEY ("monteur_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_report" ADD CONSTRAINT "service_report_job_id_maintenance_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."maintenance_job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_report" ADD CONSTRAINT "service_report_installation_id_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."installation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_report" ADD CONSTRAINT "service_report_monteur_id_user_id_fk" FOREIGN KEY ("monteur_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attachment_r2_key_idx" ON "attachment" USING btree ("r2_key");--> statement-breakpoint
CREATE INDEX "attachment_installation_idx" ON "attachment" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "attachment_report_idx" ON "attachment" USING btree ("report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_kundennummer_idx" ON "customer" USING btree ("kundennummer");--> statement-breakpoint
CREATE UNIQUE INDEX "installation_qr_token_idx" ON "installation" USING btree ("qr_token");--> statement-breakpoint
CREATE INDEX "installation_customer_id_idx" ON "installation" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "installation_naechste_wartung_idx" ON "installation" USING btree ("naechste_wartung_am");--> statement-breakpoint
CREATE INDEX "maintenance_job_installation_idx" ON "maintenance_job" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "maintenance_job_status_faellig_idx" ON "maintenance_job" USING btree ("status","faellig_am");--> statement-breakpoint
CREATE INDEX "service_report_installation_idx" ON "service_report" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "service_report_job_idx" ON "service_report" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");