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

vi.mock("@/lib/email", () => ({ sendServiceReportEmail: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { addMonths } from "@/lib/dates";
import {
  attachment,
  customer,
  getDb,
  installation,
  maintenanceJob,
  serviceReport,
  type Database,
} from "@/lib/db";
import { sendServiceReportEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import {
  protokollAbschliessenKern,
  type ProtokollAbschlussErgebnis,
  type ProtokollDaten,
} from "@/lib/protokoll-abschluss";
import {
  createFakeDb,
  createLeerenState,
  type FakeDb,
  type FakeState,
  type TabellenRegister,
  type Zeile,
} from "@/lib/test/fake-db";

const dbMock = vi.mocked(getDb);
const mailMock = vi.mocked(sendServiceReportEmail);
const revalidateMock = vi.mocked(revalidatePath);

const MONTEUR = { id: "monteur-1", name: "Max Monteur" };
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

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIX_JETZT);
  state = createLeerenState();
  db = createFakeDb(state, TABELLEN);
  dbMock.mockReturnValue(db as unknown as Database);
  mailMock.mockReset();
  mailMock.mockResolvedValue({ id: "mail-1" } as never);
  revalidateMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

function legeKundeAn(over: Zeile = {}): Zeile {
  const kunde: Zeile = {
    id: "kunde-1",
    kundennummer: "10001",
    name: "Muster GmbH",
    email: "kunde@example.de",
    ...over,
  };
  state.kunden.push(kunde);
  return kunde;
}

function legeAnlageAn(over: Zeile = {}): Zeile {
  const anlage: Zeile = {
    id: "anlage-1",
    customerId: "kunde-1",
    bezeichnung: "Heizung Keller",
    qrToken: "qr-abc",
    wartungsintervallMonate: 12,
    letzteWartungAm: null,
    naechsteWartungAm: null,
    aktiv: true,
    ...over,
  };
  state.anlagen.push(anlage);
  return anlage;
}

function legeAuftragAn(over: Zeile = {}): Zeile {
  const auftrag: Zeile = {
    id: `job-${state.auftraege.length + 1}`,
    installationId: "anlage-1",
    faelligAm: new Date("2026-08-20T10:00:00.000Z"),
    status: "geplant",
    erinnerungGesendetAm: null,
    ...over,
  };
  state.auftraege.push(auftrag);
  return auftrag;
}

function legeAttachmentAn(over: Zeile = {}): Zeile {
  const att: Zeile = {
    id: `att-${state.attachments.length + 1}`,
    installationId: "anlage-1",
    reportId: null,
    r2Key: "fotos/a.jpg",
    art: "foto",
    createdAt: FIX_JETZT,
    ...over,
  };
  state.attachments.push(att);
  return att;
}

function protokollDaten(over: Partial<ProtokollDaten> = {}): ProtokollDaten {
  return {
    jobId: null,
    installationId: "anlage-1",
    abgastemperatur: 120,
    co2: 9.4,
    druck: 1.8,
    arbeitszeit: 45,
    taetigkeiten: "Wartung durchgefuehrt",
    maengel: null,
    empfehlungen: null,
    unterschriftName: "Hausmeister",
    attachmentIds: [],
    ...over,
  };
}

/** Engt das Ergebnis auf den Erfolgsfall ein (wirft bei ok:false). */
function erfolg(
  ergebnis: ProtokollAbschlussErgebnis,
): Extract<ProtokollAbschlussErgebnis, { ok: true }> {
  if (!ergebnis.ok) throw new Error(`Abschluss sollte gelingen: ${ergebnis.message}`);
  return ergebnis;
}

describe("protokollAbschliessenKern", () => {
  it("schreibt Report, schliesst expliziten Auftrag ab und plant Folgetermin", async () => {
    legeKundeAn();
    legeAnlageAn();
    legeAuftragAn({ id: "job-1", status: "geplant" });

    const ergebnis = erfolg(
      await protokollAbschliessenKern(protokollDaten({ jobId: "job-1" }), MONTEUR),
    );

    expect(ergebnis.jobId).toBe("job-1");
    expect(ergebnis.installationId).toBe("anlage-1");
    expect(ergebnis.qrToken).toBe("qr-abc");
    expect(state.reports).toHaveLength(1);
    expect(state.reports[0]).toMatchObject({
      id: ergebnis.reportId,
      installationId: "anlage-1",
      jobId: "job-1",
      monteurId: "monteur-1",
      arbeitszeitMinuten: 45,
      messwerte: { abgastemperatur: 120, co2: 9.4, druck: 1.8 },
    });
    expect(state.auftraege[0]?.["status"]).toBe("erledigt");
    expect(state.anlagen[0]?.["letzteWartungAm"]).toEqual(FIX_JETZT);
    expect(state.anlagen[0]?.["naechsteWartungAm"]).toEqual(addMonths(FIX_JETZT, 12));
    expect(mailMock).toHaveBeenCalledTimes(1);
    expect(mailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "kunde@example.de" }));
    expect(revalidateMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidateMock).toHaveBeenCalledWith("/anlagen/anlage-1");
  });

  it("verknuepft nur eigene freie Attachments und uebernimmt die Signatur", async () => {
    legeKundeAn();
    legeAnlageAn();
    legeKundeAn({ id: "kunde-2", kundennummer: "10002", name: "Zweite AG" });
    legeAnlageAn({ id: "anlage-2", customerId: "kunde-2", qrToken: "qr-xyz" });
    const foto = legeAttachmentAn({ id: "att-foto", art: "foto", r2Key: "fotos/a.jpg" });
    const signatur = legeAttachmentAn({
      id: "att-sign",
      art: "signatur",
      r2Key: "signaturen/s.png",
    });
    const fremd = legeAttachmentAn({ id: "att-fremd", installationId: "anlage-2" });
    const belegt = legeAttachmentAn({ id: "att-belegt", reportId: "report-alt" });
    const spaeter = legeAttachmentAn({ id: "att-spaeter" });

    const ergebnis = erfolg(
      await protokollAbschliessenKern(
        protokollDaten({ attachmentIds: ["att-foto", "att-sign", "att-fremd", "att-belegt"] }),
        MONTEUR,
      ),
    );

    expect(foto["reportId"]).toBe(ergebnis.reportId);
    expect(signatur["reportId"]).toBe(ergebnis.reportId);
    expect(fremd["reportId"]).toBeNull();
    expect(belegt["reportId"]).toBe("report-alt");
    expect(spaeter["reportId"]).toBeNull();
    expect(state.reports[0]?.["unterschriftKey"]).toBe("signaturen/s.png");
  });

  it.each(["erledigt", "storniert"])(
    "expliziter Auftrag mit Status %s liefert ok:false",
    async (status) => {
      legeKundeAn();
      legeAnlageAn();
      legeAuftragAn({ id: "job-1", status });

      const ergebnis = await protokollAbschliessenKern(
        protokollDaten({ jobId: "job-1" }),
        MONTEUR,
      );

      expect(ergebnis).toEqual({
        ok: false,
        message: "Dieser Auftrag ist bereits abgeschlossen.",
      });
      expect(state.reports).toHaveLength(0);
    },
  );

  it("unbekannte explizite jobId liefert ok:false", async () => {
    legeKundeAn();
    legeAnlageAn();

    const ergebnis = await protokollAbschliessenKern(protokollDaten({ jobId: "job-x" }), MONTEUR);

    expect(ergebnis).toEqual({ ok: false, message: "Auftrag nicht gefunden." });
    expect(state.reports).toHaveLength(0);
  });

  it("Spontanflow uebernimmt den fruehesten offenen Auftrag", async () => {
    legeKundeAn();
    legeAnlageAn();
    legeAuftragAn({
      id: "job-spaet",
      status: "geplant",
      faelligAm: new Date("2026-09-10T10:00:00.000Z"),
    });
    const frueh = legeAuftragAn({
      id: "job-frueh",
      status: "terminiert",
      faelligAm: new Date("2026-08-01T10:00:00.000Z"),
    });
    legeAuftragAn({
      id: "job-alt",
      status: "erledigt",
      faelligAm: new Date("2026-01-01T10:00:00.000Z"),
    });

    const ergebnis = erfolg(
      await protokollAbschliessenKern(protokollDaten({ jobId: null }), MONTEUR),
    );

    expect(ergebnis.jobId).toBe("job-frueh");
    expect(frueh["status"]).toBe("erledigt");
    expect(state.auftraege[0]?.["status"]).toBe("geplant");
    expect(state.reports[0]?.["jobId"]).toBe("job-frueh");
  });

  it("Spontanflow ohne offenen Auftrag schreibt Report ohne Job", async () => {
    legeKundeAn();
    legeAnlageAn();
    legeAuftragAn({ id: "job-alt", status: "storniert" });

    const ergebnis = erfolg(
      await protokollAbschliessenKern(protokollDaten({ jobId: null }), MONTEUR),
    );

    expect(ergebnis.jobId).toBeNull();
    expect(state.reports).toHaveLength(1);
    expect(state.reports[0]?.["jobId"]).toBeNull();
    expect(state.auftraege[0]?.["status"]).toBe("storniert");
  });

  it("manuell weiter hinten gelegter Folgetermin bleibt bestehen", async () => {
    legeKundeAn();
    const manuell = new Date("2028-03-15T10:00:00.000Z");
    legeAnlageAn({ naechsteWartungAm: manuell });

    const ergebnis = await protokollAbschliessenKern(protokollDaten(), MONTEUR);

    expect(erfolg(ergebnis).jobId).toBeNull();
    expect(state.anlagen[0]?.["naechsteWartungAm"]).toEqual(manuell);
    expect(state.anlagen[0]?.["letzteWartungAm"]).toEqual(FIX_JETZT);
  });

  it("unbekannte Anlage liefert ok:false", async () => {
    const ergebnis = await protokollAbschliessenKern(
      protokollDaten({ installationId: "anlage-x" }),
      MONTEUR,
    );

    expect(ergebnis).toEqual({
      ok: false,
      message: "Anlage nicht gefunden. Bitte erneut scannen.",
    });
    expect(state.reports).toHaveLength(0);
  });

  it("Mailfehler kippt den gespeicherten Abschluss nicht", async () => {
    legeKundeAn();
    legeAnlageAn();
    mailMock.mockRejectedValueOnce(new Error("Resend down"));

    const ergebnis = await protokollAbschliessenKern(protokollDaten(), MONTEUR);

    expect(erfolg(ergebnis).installationId).toBe("anlage-1");
    expect(state.reports).toHaveLength(1);
  });

  it("ohne Kunden-E-Mail geht der Abschluss ohne Mail durch", async () => {
    legeKundeAn({ email: null });
    legeAnlageAn();

    const ergebnis = await protokollAbschliessenKern(protokollDaten(), MONTEUR);

    expect(erfolg(ergebnis).installationId).toBe("anlage-1");
    expect(mailMock).not.toHaveBeenCalled();
  });
});
