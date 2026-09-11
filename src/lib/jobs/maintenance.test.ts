import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  const { bedingungAnbringen } = await import("@/lib/test/fake-db");
  type Meta = Parameters<typeof bedingungAnbringen>[1];
  const markieren = (sql: unknown, meta: Meta): unknown => {
    bedingungAnbringen(sql, meta);
    return sql;
  };
  const rufen = (fn: unknown, ...args: never[]): unknown =>
    (fn as (...a: never[]) => unknown)(...args);
  return {
    ...actual,
    eq: (spalte: unknown, wert: unknown): unknown =>
      markieren(rufen(actual.eq, spalte as never, wert as never), { art: "eq", spalte, wert }),
    and: (...bedingungen: unknown[]): unknown =>
      markieren(rufen(actual.and, ...(bedingungen as never[])), {
        art: "and",
        bedingungen,
      }),
    inArray: (spalte: unknown, werte: unknown): unknown =>
      markieren(rufen(actual.inArray, spalte as never, werte as never), {
        art: "inArray",
        spalte,
        werte,
      }),
    isNull: (spalte: unknown): unknown =>
      markieren(rufen(actual.isNull, spalte as never), { art: "isNull", spalte }),
    isNotNull: (spalte: unknown): unknown =>
      markieren(rufen(actual.isNotNull, spalte as never), { art: "isNotNull", spalte }),
    lte: (spalte: unknown, wert: unknown): unknown =>
      markieren(rufen(actual.lte, spalte as never, wert as never), { art: "lte", spalte, wert }),
    asc: (spalte: unknown): unknown =>
      markieren(rufen(actual.asc, spalte as never), { art: "asc", spalte }),
    desc: (spalte: unknown): unknown =>
      markieren(rufen(actual.desc, spalte as never), { art: "desc", spalte }),
  };
});

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return { ...actual, getDb: vi.fn() };
});

vi.mock("@/lib/email", () => ({ sendMaintenanceDueEmail: vi.fn() }));

import {
  attachment,
  customer,
  getDb,
  installation,
  maintenanceJob,
  serviceReport,
  type Database,
} from "@/lib/db";
import { sendMaintenanceDueEmail } from "@/lib/email";
import { runMaintenanceScan } from "@/lib/jobs/maintenance";
import {
  createFakeDb,
  createLeerenState,
  type FakeDb,
  type FakeState,
  type TabellenRegister,
  type Zeile,
} from "@/lib/test/fake-db";

const dbMock = vi.mocked(getDb);
const mailMock = vi.mocked(sendMaintenanceDueEmail);

const ENV_KEY = "MAINTENANCE_NOTIFY_EMAIL";
const BUERO_MAIL = "buero@example.de";
const FIX_JETZT = new Date("2026-09-01T10:00:00.000Z");

const TABELLEN: TabellenRegister = {
  kunde: customer,
  anlage: installation,
  auftrag: maintenanceJob,
  report: serviceReport,
  attachment,
};

let state: FakeState;
let db: FakeDb;
let alterEnvWert: string | undefined;

beforeEach(() => {
  alterEnvWert = process.env[ENV_KEY];
  process.env[ENV_KEY] = BUERO_MAIL;
  state = createLeerenState();
  db = createFakeDb(state, TABELLEN);
  dbMock.mockReturnValue(db as unknown as Database);
  mailMock.mockReset();
  mailMock.mockResolvedValue({ id: "mail-1" } as never);
});

afterEach(() => {
  if (alterEnvWert === undefined) envLoeschen("MAINTENANCE_NOTIFY_EMAIL");
  else process.env[ENV_KEY] = alterEnvWert;
});

/** `delete process.env[X]` ist typisiert verboten, daher der Umweg. */
function envLoeschen(key: string): void {
  delete (process.env as Record<string, string | undefined>)[key];
}
/** Datum plus/minus Tage, gleiche Arithmetik wie der Scan (addDays). */
function tageAbJetzt(tage: number): Date {
  const kopie = new Date(FIX_JETZT);
  kopie.setDate(kopie.getDate() + tage);
  return kopie;
}

function legeKundeAn(over: Zeile = {}): Zeile {
  const kunde: Zeile = {
    id: `kunde-${state.kunden.length + 1}`,
    kundennummer: `1000${state.kunden.length + 1}`,
    name: "Muster GmbH",
    email: "kunde@example.de",
    ...over,
  };
  state.kunden.push(kunde);
  return kunde;
}

function legeAnlageAn(over: Zeile = {}): Zeile {
  const anlage: Zeile = {
    id: `anlage-${state.anlagen.length + 1}`,
    customerId: state.kunden[state.kunden.length - 1]?.["id"] ?? "kunde-1",
    bezeichnung: "Heizung Keller",
    qrToken: `qr-${state.anlagen.length + 1}`,
    wartungsintervallMonate: 12,
    letzteWartungAm: null,
    naechsteWartungAm: tageAbJetzt(10),
    aktiv: true,
    standort: "Keller",
    ...over,
  };
  state.anlagen.push(anlage);
  return anlage;
}

function legeAuftragAn(over: Zeile = {}): Zeile {
  const auftrag: Zeile = {
    id: `job-${state.auftraege.length + 1}`,
    installationId: "anlage-1",
    faelligAm: tageAbJetzt(10),
    status: "geplant",
    erinnerungGesendetAm: null,
    ...over,
  };
  state.auftraege.push(auftrag);
  return auftrag;
}

describe("runMaintenanceScan", () => {
  it("legt fuer faellige Anlage Auftrag an und mailt ans Buero", async () => {
    legeKundeAn();
    const faellig = tageAbJetzt(10);
    legeAnlageAn({ naechsteWartungAm: faellig });

    const ergebnis = await runMaintenanceScan(FIX_JETZT);

    expect(ergebnis).toEqual({ geprueft: 1, jobsErstellt: 1, mailsGesendet: 1, fehler: [] });
    expect(state.auftraege).toHaveLength(1);
    expect(state.auftraege[0]).toMatchObject({
      installationId: "anlage-1",
      status: "geplant",
      faelligAm: faellig,
    });
    expect(state.auftraege[0]?.["erinnerungGesendetAm"]).toEqual(FIX_JETZT);
    expect(mailMock).toHaveBeenCalledTimes(1);
    expect(mailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: BUERO_MAIL, kunde: "Muster GmbH", anlage: "Heizung Keller" }),
    );
  });

  it("nimmt Anlage genau an der Vorlaufgrenze noch mit", async () => {
    legeKundeAn();
    legeAnlageAn({ naechsteWartungAm: tageAbJetzt(30) });

    const ergebnis = await runMaintenanceScan(FIX_JETZT);

    expect(ergebnis).toEqual({ geprueft: 1, jobsErstellt: 1, mailsGesendet: 1, fehler: [] });
  });

  it("markiert ueberfaellige Wartung als ueberfaellig", async () => {
    legeKundeAn();
    const faellig = tageAbJetzt(-5);
    legeAnlageAn({ naechsteWartungAm: faellig });

    const ergebnis = await runMaintenanceScan(FIX_JETZT);

    expect(ergebnis).toEqual({ geprueft: 1, jobsErstellt: 1, mailsGesendet: 1, fehler: [] });
    expect(state.auftraege[0]).toMatchObject({ status: "ueberfaellig", faelligAm: faellig });
  });

  it("ueberspringt Anlage ausserhalb der Vorlaufzeit", async () => {
    legeKundeAn();
    legeAnlageAn({ naechsteWartungAm: tageAbJetzt(31) });

    const ergebnis = await runMaintenanceScan(FIX_JETZT);

    expect(ergebnis).toEqual({ geprueft: 0, jobsErstellt: 0, mailsGesendet: 0, fehler: [] });
    expect(state.auftraege).toHaveLength(0);
    expect(mailMock).not.toHaveBeenCalled();
  });

  it("ueberspringt inaktive Anlage", async () => {
    legeKundeAn();
    legeAnlageAn({ aktiv: false });

    const ergebnis = await runMaintenanceScan(FIX_JETZT);

    expect(ergebnis).toEqual({ geprueft: 0, jobsErstellt: 0, mailsGesendet: 0, fehler: [] });
    expect(state.auftraege).toHaveLength(0);
  });

  it("ueberspringt Anlage ohne naechsteWartungAm", async () => {
    legeKundeAn();
    legeAnlageAn({ naechsteWartungAm: null });

    const ergebnis = await runMaintenanceScan(FIX_JETZT);

    expect(ergebnis).toEqual({ geprueft: 0, jobsErstellt: 0, mailsGesendet: 0, fehler: [] });
    expect(state.auftraege).toHaveLength(0);
  });

  it.each(["geplant", "terminiert", "ueberfaellig"])(
    "offener Auftrag mit Status %s verhindert Duplikat",
    async (status) => {
      legeKundeAn();
      legeAnlageAn();
      legeAuftragAn({ id: "job-offen", status });

      const ergebnis = await runMaintenanceScan(FIX_JETZT);

      expect(ergebnis).toEqual({ geprueft: 1, jobsErstellt: 0, mailsGesendet: 0, fehler: [] });
      expect(state.auftraege).toHaveLength(1);
      expect(mailMock).not.toHaveBeenCalled();
    },
  );

  it("stornierter Auftrag zaehlt nicht als offen", async () => {
    legeKundeAn();
    legeAnlageAn();
    legeAuftragAn({ id: "job-alt", status: "storniert" });

    const ergebnis = await runMaintenanceScan(FIX_JETZT);

    expect(ergebnis).toEqual({ geprueft: 1, jobsErstellt: 1, mailsGesendet: 1, fehler: [] });
    expect(state.auftraege).toHaveLength(2);
  });

  it("erledigter Auftrag zaehlt nicht als offen", async () => {
    legeKundeAn();
    legeAnlageAn();
    legeAuftragAn({ id: "job-alt", status: "erledigt" });

    const ergebnis = await runMaintenanceScan(FIX_JETZT);

    expect(ergebnis).toEqual({ geprueft: 1, jobsErstellt: 1, mailsGesendet: 1, fehler: [] });
    expect(state.auftraege).toHaveLength(2);
  });

  it("ohne Notify-Adresse wird Auftrag ohne Mail angelegt", async () => {
    envLoeschen("MAINTENANCE_NOTIFY_EMAIL");
    legeKundeAn();
    legeAnlageAn();

    const ergebnis = await runMaintenanceScan(FIX_JETZT);

    expect(ergebnis).toEqual({ geprueft: 1, jobsErstellt: 1, mailsGesendet: 0, fehler: [] });
    expect(state.auftraege).toHaveLength(1);
    expect(mailMock).not.toHaveBeenCalled();
    expect(state.auftraege[0]?.["erinnerungGesendetAm"]).toBeUndefined();
  });

  it("Mailfehler landet in fehler, Auftrag bleibt bestehen", async () => {
    legeKundeAn();
    legeAnlageAn();
    mailMock.mockRejectedValueOnce(new Error("Resend down"));

    const ergebnis = await runMaintenanceScan(FIX_JETZT);

    expect(ergebnis.geprueft).toBe(1);
    expect(ergebnis.jobsErstellt).toBe(1);
    expect(ergebnis.mailsGesendet).toBe(0);
    expect(ergebnis.fehler).toHaveLength(1);
    expect(state.auftraege).toHaveLength(1);
  });
});
