/**
 * Alphabet ohne verwechselbare Zeichen: kein 0/O, kein 1/I/L, kein U (das im
 * Ausdruck schnell wie V aussieht). Der Token steht auf einem Aufkleber im
 * Heizungskeller und wird notfalls abgetippt, wenn die Kamera streikt.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Token fuer den QR-Aufkleber einer Anlage.
 *
 * 12 Zeichen aus 30 ergeben rund 59 Bit - nicht erratbar, aber kurz genug zum
 * Vorlesen. Bewusst kein `randomUUID()`: 36 Zeichen mit Bindestrichen tippt
 * niemand freiwillig ab.
 */
export function generateQrToken(laenge = 12): string {
  const bytes = new Uint8Array(laenge);
  crypto.getRandomValues(bytes);

  let token = "";
  for (const byte of bytes) {
    // 256 ist kein Vielfaches von 30, der Modulo bevorzugt die ersten Zeichen
    // minimal. Bei 59 Bit Ausgangsentropie ist das ohne Belang.
    token += ALPHABET[byte % ALPHABET.length];
  }

  return token;
}
