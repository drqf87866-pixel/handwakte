/**
 * Erzeugt die PWA-Icons aus einer eingebetteten 5x7-Bitmap-Schrift.
 *
 *   node scripts/generate-icons.mjs
 *
 * Reines Node (zlib ist eingebaut): dunkle Kachel in theme_color plus
 * orangefarbenes "B". Platzhalter, bis das Buero ein echtes Logo liefert -
 * dann nur die Dateien in public/icons/ ersetzen, Namen behalten.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIEL = join(HIER, "..", "public", "icons");

const HINTERGRUND = [10, 10, 10];
const ZEICHEN = [249, 115, 22];

// "B" als 5x7-Bitmap, # = Pixel.
const B = ["XXXX.", "X...X", "X...X", "XXXX.", "X...X", "X...X", "XXXX."];

const CRC_TABELLE = (() => {
  const tabelle = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabelle[n] = c;
  }
  return tabelle;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABELLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(typ, daten) {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(daten.length);
  const körper = Buffer.concat([Buffer.from(typ, "ascii"), daten]);
  const pruefung = Buffer.alloc(4);
  pruefung.writeUInt32BE(crc32(körper));
  return Buffer.concat([laenge, körper, pruefung]);
}

/** Truecolor-PNG ohne Alpha aus einem (x, y) -> [r, g, b]-Callback. */
function alsPng(groesse, pixel) {
  const scankanaele = groesse * 3 + 1;
  const roh = Buffer.alloc(scankanaele * groesse);
  for (let y = 0; y < groesse; y++) {
    roh[y * scankanaele] = 0; // Filtertyp 0 (keiner)
    for (let x = 0; x < groesse; x++) {
      const [r, g, b] = pixel(x, y);
      roh.set([r, g, b], y * scankanaele + 1 + x * 3);
    }
  }

  const kopf = Buffer.alloc(13);
  kopf.writeUInt32BE(groesse, 0);
  kopf.writeUInt32BE(groesse, 4);
  kopf[8] = 8; // Bittiefe
  kopf[9] = 2; // Truecolor
  kopf[12] = 0; // Interlace: nein

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", kopf),
    chunk("IDAT", deflateSync(roh)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Malt das "B" mittig. `anteil` steuert, wie viel der Kante die Glyphe
 * einnimmt (maskable braucht mehr Rand wegen der Safe Zone).
 */
function maltB(groesse, anteil) {
  const zelle = Math.floor((groesse * anteil) / 7);
  const breite = 5 * zelle;
  const hoehe = 7 * zelle;
  const startX = Math.floor((groesse - breite) / 2);
  const startY = Math.floor((groesse - hoehe) / 2);

  return (x, y) => {
    const spalte = Math.floor((x - startX) / zelle);
    const zeile = Math.floor((y - startY) / zelle);
    if (spalte < 0 || spalte > 4 || zeile < 0 || zeile > 6) return HINTERGRUND;
    return B[zeile][spalte] === "X" ? ZEICHEN : HINTERGRUND;
  };
}

mkdirSync(ZIEL, { recursive: true });

const varianten = [
  { datei: "icon-192.png", groesse: 192, anteil: 0.52 },
  { datei: "icon-512.png", groesse: 512, anteil: 0.52 },
  // Maskable: voller Hintergrund, Motiv klein genug fuer jede Maske.
  { datei: "icon-maskable-512.png", groesse: 512, anteil: 0.34 },
  { datei: "apple-touch-icon.png", groesse: 180, anteil: 0.52 },
];

for (const { datei, groesse, anteil } of varianten) {
  writeFileSync(join(ZIEL, datei), alsPng(groesse, maltB(groesse, anteil)));
  console.log(`  ${datei} (${groesse}x${groesse})`);
}
