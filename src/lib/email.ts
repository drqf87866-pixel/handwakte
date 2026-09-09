import { Resend } from "resend";

let cached: Resend | undefined;

/**
 * Resend-Client, lazy initialisiert. Der Versand laeuft ueber normales HTTPS und
 * funktioniert damit unveraendert in der Worker-Runtime.
 */
export function getResend(): Resend {
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY ist nicht gesetzt.");
  }

  cached = new Resend(apiKey);
  return cached;
}

/**
 * Das Resend-SDK wirft bei API-Fehlern nicht, sondern liefert `{ data, error }`.
 * Ohne diese Pruefung gilt eine abgelehnte Mail (falscher Key, nicht
 * verifizierte Absenderdomain) faelschlich als erfolgreich versendet.
 */
async function send(payload: Parameters<Resend["emails"]["send"]>[0]) {
  const { data, error } = await getResend().emails.send(payload);

  if (error) {
    throw new Error(`Resend: ${error.name} - ${error.message}`);
  }

  return data;
}

function getFrom(): string {
  const from = process.env.RESEND_FROM;
  if (!from) {
    throw new Error('RESEND_FROM ist nicht gesetzt (Format: "Wartung <wartung@example.de>").');
  }
  return from;
}

const styles = {
  body: "margin:0;padding:24px;background:#f5f5f4;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1917;",
  card: "max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:24px;",
  h1: "margin:0 0 16px;font-size:18px;font-weight:600;",
  button:
    "display:inline-block;margin:8px 0 16px;padding:12px 24px;background:#1c1917;color:#ffffff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;",
  p: "margin:0 0 12px;font-size:14px;line-height:1.6;",
  table: "width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;",
  th: "text-align:left;padding:6px 8px;border-bottom:1px solid #e7e5e4;color:#57534e;font-weight:500;width:40%;",
  td: "text-align:left;padding:6px 8px;border-bottom:1px solid #e7e5e4;",
  footer: "margin:16px 0 0;font-size:12px;color:#78716c;",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, rows: Array<[string, string]>, intro: string, outro?: string) {
  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><th style="${styles.th}">${escapeHtml(label)}</th><td style="${styles.td}">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html lang="de"><body style="${styles.body}">
  <div style="${styles.card}">
    <h1 style="${styles.h1}">${escapeHtml(title)}</h1>
    <p style="${styles.p}">${escapeHtml(intro)}</p>
    <table style="${styles.table}">${tableRows}</table>
    ${outro ? `<p style="${styles.p}">${escapeHtml(outro)}</p>` : ""}
    <p style="${styles.footer}">Automatisch erzeugt vom Wartungsplaner.</p>
  </div>
</body></html>`;
}

/**
 * Variante mit Aktions-Schaltflaeche (z. B. Reset-Link). Die URL laeuft
 * durch escapeHtml, damit kein HTML aus dem Token entweichen kann.
 */
function layoutMitAktion(
  title: string,
  intro: string,
  aktion: { label: string; url: string },
  outro?: string,
) {
  return `<!doctype html><html lang="de"><body style="${styles.body}">
  <div style="${styles.card}">
    <h1 style="${styles.h1}">${escapeHtml(title)}</h1>
    <p style="${styles.p}">${escapeHtml(intro)}</p>
    <a style="${styles.button}" href="${escapeHtml(aktion.url)}">${escapeHtml(aktion.label)}</a>
    ${outro ? `<p style="${styles.p}">${escapeHtml(outro)}</p>` : ""}
    <p style="${styles.footer}">Automatisch erzeugt von der Digitalen Bauakte.</p>
  </div>
</body></html>`;
}

export type PasswordResetMail = {
  to: string | string[];
  url: string;
};

/** Reset-Link zum Vergeben eines neuen Passworts (1 Stunde gueltig). */
export async function sendPasswordResetEmail(input: PasswordResetMail) {
  return send({
    from: getFrom(),
    to: input.to,
    subject: "Neues Passwort fuer die Digitale Bauakte",
    html: layoutMitAktion(
      "Passwort zuruecksetzen",
      "fuer Ihr Konto wurde ein neues Passwort angefordert. Klicken Sie auf die Schaltflaeche und vergeben Sie ein neues Passwort (mindestens 8 Zeichen). Der Link gilt 1 Stunde.",
      { label: "Neues Passwort vergeben", url: input.url },
      "Falls Sie das nicht angefordert haben, ignorieren Sie diese Mail einfach - Ihr bisheriges Passwort bleibt gueltig.",
    ),
  });
}

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" });

export type MaintenanceDueMail = {
  to: string | string[];
  kunde: string;
  anlage: string;
  standort?: string | null;
  faelligAm: Date;
  anlagenUrl?: string;
};

/** Benachrichtigung ans Buero: eine Wartung wird faellig. */
export async function sendMaintenanceDueEmail(input: MaintenanceDueMail) {
  const rows: Array<[string, string]> = [
    ["Kunde", input.kunde],
    ["Anlage", input.anlage],
    ["Standort", input.standort ?? "-"],
    ["Faellig am", dateFmt.format(input.faelligAm)],
  ];

  return send({
    from: getFrom(),
    to: input.to,
    subject: `Wartung faellig: ${input.anlage} (${input.kunde})`,
    html: layout(
      "Wartung wird faellig",
      rows,
      "Fuer die folgende Anlage steht die naechste Wartung an. Bitte einen Termin mit dem Kunden abstimmen.",
      input.anlagenUrl,
    ),
  });
}

export type ServiceReportMail = {
  to: string | string[];
  kunde: string;
  anlage: string;
  durchgefuehrtAm: Date;
  monteur?: string | null;
  maengel?: string | null;
};

/** Bestaetigung an den Kunden nach abgeschlossenem Service. */
export async function sendServiceReportEmail(input: ServiceReportMail) {
  const rows: Array<[string, string]> = [
    ["Anlage", input.anlage],
    ["Durchgefuehrt am", dateFmt.format(input.durchgefuehrtAm)],
    ["Monteur", input.monteur ?? "-"],
    ["Festgestellte Maengel", input.maengel?.trim() || "keine"],
  ];

  return send({
    from: getFrom(),
    to: input.to,
    subject: `Serviceprotokoll: ${input.anlage}`,
    html: layout(
      `Wartung abgeschlossen - ${input.kunde}`,
      rows,
      "die Wartung Ihrer Anlage wurde durchgefuehrt. Das unterschriebene Protokoll finden Sie im Anhang bzw. in Ihrer Bauakte.",
    ),
  });
}
