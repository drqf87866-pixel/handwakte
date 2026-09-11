/**
 * In-Memory-Fake fuer Drizzle-Abfragen in Tests.
 *
 * Die Module unter Test rufen `getDb()` auf und bauen echte Drizzle-Queries
 * (select/from/join/where/orderBy/limit, insert/values, update/set/where).
 * Dieser Fake wertet sie gegen plain JS-Zeilen aus, statt eine Datenbank zu
 * brauchen. Entscheidend: Die WHERE-Bedingungen stammen aus dem
 * Produktionscode selbst. Die Tests mocken die drizzle-Operatoren (eq, and,
 * inArray, isNull, isNotNull, lte, asc, desc) so, dass jeder Aufruf neben dem
 * echten SQL-Objekt zusaetzlich eine auswertbare Beschreibung an das Objekt
 * anhaengt (siehe `bedingungAnbringen`). Der Fake interpretiert genau diese
 * Beschreibung. Faellt im Produktionscode z.B. die isNull-Pruefung beim
 * Attachment-Update weg, verknuepft der Fake auch belegte Dateien und der
 * Test wird rot. Dadurch pruefen die Faelle das reale SQL-Verhalten und nicht
 * nur, dass irgendeine Methode aufgerufen wurde.
 *
 * Der Helper haengt bewusst an keinem gemockten Modul (nur `import type`),
 * damit ihn die vi.mock-Factories per dynamischem Import laden koennen, ohne
 * einen Modulzyklus mit dem drizzle-Mock zu erzeugen.
 */

export type Zeile = Record<string, unknown>;

export type FakeState = {
  kunden: Zeile[];
  anlagen: Zeile[];
  auftraege: Zeile[];
  reports: Zeile[];
  attachments: Zeile[];
};

export function createLeerenState(): FakeState {
  return { kunden: [], anlagen: [], auftraege: [], reports: [], attachments: [] };
}

/** Die echten Tabellenobjekte (Identitaet wird zum Zuordnen benutzt). */
export type TabellenRegister = {
  kunde: object;
  anlage: object;
  auftrag: object;
  report: object;
  attachment: object;
};

/** Auswertbare Beschreibung eines gemockten Operator-Aufrufs. */
export type BedingungsMeta =
  | { art: "eq"; spalte: unknown; wert: unknown }
  | { art: "inArray"; spalte: unknown; werte: unknown }
  | { art: "and"; bedingungen: unknown[] }
  | { art: "isNull"; spalte: unknown }
  | { art: "isNotNull"; spalte: unknown }
  | { art: "lte"; spalte: unknown; wert: unknown }
  | { art: "asc"; spalte: unknown }
  | { art: "desc"; spalte: unknown };

const META = new WeakMap<object, BedingungsMeta>();

/** Von den gemockten drizzle-Operatoren aufgerufen, siehe Modulkommentar. */
export function bedingungAnbringen(sql: unknown, meta: BedingungsMeta): void {
  if (typeof sql === "object" && sql !== null) {
    META.set(sql, meta);
  }
}

function metaLesen(wert: unknown): BedingungsMeta | undefined {
  if (typeof wert !== "object" || wert === null) return undefined;
  return META.get(wert);
}

function alsObjekt(wert: unknown, name: string): object {
  if (typeof wert !== "object" || wert === null) {
    throw new Error(`[fake-db] ${name} ist kein Objekt.`);
  }
  return wert;
}

export type SpaltenRef = { tabelle: object; jsKey: string };

/**
 * Loest ein Drizzle-Spaltenobjekt auf Tabelle und JS-Schluessel auf.
 *
 * Spalten sind eigene enumerable Props ihrer Tabelle (`tabelle.spalte`), die
 * Tabelle ist ueber `spalte.table` rueckreferenziert. Die Aufloesung passiert
 * lazy zur Auswertezeit und braucht deshalb keinen Schema-Import.
 */
const spaltenCache = new WeakMap<object, Map<object, string>>();

export function spalteNachschlagen(spalte: unknown): SpaltenRef {
  const spaltenObjekt = alsObjekt(spalte, "Spalte");
  if (!("table" in spaltenObjekt)) {
    throw new Error("[fake-db] Wert ist kein Spaltenobjekt.");
  }
  const tabelle = (spaltenObjekt as { table: unknown }).table;
  const tabellenObjekt = alsObjekt(tabelle, "Spaltentabelle");
  let proTabelle = spaltenCache.get(tabellenObjekt);
  if (!proTabelle) {
    proTabelle = new Map();
    for (const [schluessel, wert] of Object.entries(tabellenObjekt)) {
      if (typeof wert === "object" && wert !== null) {
        proTabelle.set(wert, schluessel);
      }
    }
    spaltenCache.set(tabellenObjekt, proTabelle);
  }
  const jsKey = proTabelle.get(spaltenObjekt);
  if (!jsKey) {
    throw new Error("[fake-db] Spalte nicht auf ihrer Tabelle gefunden.");
  }
  return { tabelle: tabellenObjekt, jsKey };
}

/** Spaltenobjekt (id, installationId, ...) vs. Literal (String, Date, ...). */
function istSpalte(wert: unknown): boolean {
  return (
    typeof wert === "object" &&
    wert !== null &&
    "table" in wert &&
    "name" in wert
  );
}

export type ZeilenKontext = Map<object, Zeile>;

function spaltenWert(spalte: unknown, ctx: ZeilenKontext): unknown {
  const ref = spalteNachschlagen(spalte);
  return ctx.get(ref.tabelle)?.[ref.jsKey];
}

/** Rechte Seite von eq/lte: Spalte (Join-Bedingung) oder Literal. */
function vergleichsWert(wert: unknown, ctx: ZeilenKontext): unknown {
  return istSpalte(wert) ? spaltenWert(wert, ctx) : wert;
}

function gleich(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

function kleinerGleich(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() <= b.getTime();
  if (typeof a === "number" && typeof b === "number") return a <= b;
  if (typeof a === "string" && typeof b === "string") return a <= b;
  throw new Error("[fake-db] lte mit unvergleichbaren Werten aufgerufen.");
}

export function bedingungPruefen(bedingung: unknown, ctx: ZeilenKontext): boolean {
  const meta = metaLesen(bedingung);
  if (!meta) {
    throw new Error("[fake-db] Unmarkierte Bedingung - ist der Operator-Mock aktiv?");
  }
  switch (meta.art) {
    case "eq":
      return gleich(spaltenWert(meta.spalte, ctx), vergleichsWert(meta.wert, ctx));
    case "inArray": {
      const wert = spaltenWert(meta.spalte, ctx);
      const liste = meta.werte as unknown[];
      return Array.isArray(liste) && liste.some((eintrag) => gleich(wert, eintrag));
    }
    case "isNull": {
      const wert = spaltenWert(meta.spalte, ctx);
      return wert === null || wert === undefined;
    }
    case "isNotNull": {
      const wert = spaltenWert(meta.spalte, ctx);
      return wert !== null && wert !== undefined;
    }
    case "lte":
      return kleinerGleich(spaltenWert(meta.spalte, ctx), vergleichsWert(meta.wert, ctx));
    case "and":
      return meta.bedingungen.every(
        (teil) => teil === undefined || bedingungPruefen(teil, ctx),
      );
    case "asc":
    case "desc":
      throw new Error("[fake-db] Sortierung als Filter benutzt.");
  }
}

function vergleicheFuerSort(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (a === b) return 0;
  return 0;
}

function zeilenFuer(
  state: FakeState,
  tabellen: TabellenRegister,
  tabelle: unknown,
): Zeile[] {
  const ziel = alsObjekt(tabelle, "Tabelle");
  if (ziel === tabellen.kunde) return state.kunden;
  if (ziel === tabellen.anlage) return state.anlagen;
  if (ziel === tabellen.auftrag) return state.auftraege;
  if (ziel === tabellen.report) return state.reports;
  if (ziel === tabellen.attachment) return state.attachments;
  throw new Error("[fake-db] Unbekannte Tabelle.");
}

type Projektion = Record<string, unknown>;

/** Verkettbarer select-Builder, per `then` awaitable wie das Drizzle-Original. */
class FakeSelect {
  private von: object | undefined;
  private verbindung: { tabelle: object; on: unknown } | undefined;
  private filter: unknown;
  private hatFilter = false;
  private sortierung: unknown;
  private anzahl: number | undefined;

  constructor(
    private state: FakeState,
    private tabellen: TabellenRegister,
    private projektion: Projektion,
  ) {}

  from(tabelle: unknown): this {
    this.von = alsObjekt(tabelle, "from");
    return this;
  }

  innerJoin(tabelle: unknown, on: unknown): this {
    this.verbindung = { tabelle: alsObjekt(tabelle, "join"), on };
    return this;
  }

  where(bedingung: unknown): this {
    this.filter = bedingung;
    this.hatFilter = true;
    return this;
  }

  orderBy(...sortierungen: unknown[]): this {
    this.sortierung = sortierungen[0];
    return this;
  }

  limit(n: number): this {
    this.anzahl = n;
    return this;
  }

  then<TResult1 = Zeile[], TResult2 = never>(
    onf?: ((wert: Zeile[]) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onr?: ((grund: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.ausfuehren()).then(onf, onr);
  }

  private ausfuehren(): Zeile[] {
    if (!this.von) throw new Error("[fake-db] select ohne from.");
    const von: object = this.von;
    let kontexte: ZeilenKontext[] = zeilenFuer(this.state, this.tabellen, von).map(
      (zeile) => new Map<object, Zeile>([[von, zeile]]),
    );
    const verbindung = this.verbindung;
    if (verbindung) {
      const rechte = zeilenFuer(this.state, this.tabellen, verbindung.tabelle);
      const kombiniert: ZeilenKontext[] = [];
      for (const ctx of kontexte) {
        for (const rechts of rechte) {
          const neu = new Map(ctx);
          neu.set(verbindung.tabelle, rechts);
          if (bedingungPruefen(verbindung.on, neu)) kombiniert.push(neu);
        }
      }
      kontexte = kombiniert;
    }
    if (this.hatFilter) {
      const filter = this.filter;
      kontexte = kontexte.filter((ctx) => bedingungPruefen(filter, ctx));
    }
    if (this.sortierung !== undefined) {
      const meta = metaLesen(this.sortierung);
      if (!meta || (meta.art !== "asc" && meta.art !== "desc")) {
        throw new Error("[fake-db] Unmarkierte Sortierung - ist der Operator-Mock aktiv?");
      }
      const richtung = meta.art === "asc" ? 1 : -1;
      const spalte = meta.spalte;
      kontexte = [...kontexte].sort(
        (a, b) => richtung * vergleicheFuerSort(spaltenWert(spalte, a), spaltenWert(spalte, b)),
      );
    }
    let zeilen = kontexte.map((ctx) => {
      const ergebnis: Zeile = {};
      for (const [alias, spalte] of Object.entries(this.projektion)) {
        ergebnis[alias] = spaltenWert(spalte, ctx);
      }
      return ergebnis;
    });
    if (this.anzahl !== undefined) zeilen = zeilen.slice(0, this.anzahl);
    return zeilen;
  }
}

/**
 * Erzeugt den Fake-Client fuer einen Test. `state` halten die Tests selbst
 * (Aufbau und Assertions), `tabellen` sind die echten Tabellenobjekte aus
 * `@/lib/db` (nur zur Identitaet, kein DB-Zugriff).
 */
export function createFakeDb(state: FakeState, tabellen: TabellenRegister) {
  return {
    select(projektion: Projektion): FakeSelect {
      return new FakeSelect(state, tabellen, projektion);
    },
    insert(tabelle: unknown) {
      const ziel = zeilenFuer(state, tabellen, tabelle);
      return {
        values(objekt: Zeile): Promise<Zeile[]> {
          ziel.push({ ...objekt });
          return Promise.resolve([]);
        },
      };
    },
    update(tabelle: unknown) {
      const ziel = zeilenFuer(state, tabellen, tabelle);
      const tabellenObjekt = alsObjekt(tabelle, "Tabelle");
      return {
        set(objekt: Zeile) {
          return {
            where(bedingung: unknown): Promise<Zeile[]> {
              for (const zeile of ziel) {
                if (bedingungPruefen(bedingung, new Map<object, Zeile>([[tabellenObjekt, zeile]]))) {
                  Object.assign(zeile, objekt);
                }
              }
              return Promise.resolve([]);
            },
          };
        },
      };
    },
  };
}

export type FakeDb = ReturnType<typeof createFakeDb>;

/**
 * Baut das gemockte drizzle-orm-Modul: alle Originale plus getaggte
 * Operatoren (eq, and, inArray, isNull, isNotNull, lte, asc, desc). Wird aus
 * den vi.mock-Factories der Testdateien aufgerufen und bekommt dort
 * `importOriginal` uebergeben.
 */
export async function mockDrizzleOrm(importOriginal: () => Promise<unknown>): Promise<unknown> {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const original = (name: string) => actual[name] as (...args: never[]) => unknown;
  const taggen = (name: string, args: unknown[], meta: BedingungsMeta): unknown => {
    const sql = original(name)(...(args as never[]));
    bedingungAnbringen(sql, meta);
    return sql;
  };
  return {
    ...actual,
    eq: (spalte: unknown, wert: unknown): unknown =>
      taggen("eq", [spalte, wert], { art: "eq", spalte, wert }),
    and: (...bedingungen: unknown[]): unknown =>
      taggen("and", bedingungen, { art: "and", bedingungen }),
    inArray: (spalte: unknown, werte: unknown): unknown =>
      taggen("inArray", [spalte, werte], { art: "inArray", spalte, werte }),
    isNull: (spalte: unknown): unknown =>
      taggen("isNull", [spalte], { art: "isNull", spalte }),
    isNotNull: (spalte: unknown): unknown =>
      taggen("isNotNull", [spalte], { art: "isNotNull", spalte }),
    lte: (spalte: unknown, wert: unknown): unknown =>
      taggen("lte", [spalte, wert], { art: "lte", spalte, wert }),
    asc: (spalte: unknown): unknown =>
      taggen("asc", [spalte], { art: "asc", spalte }),
    desc: (spalte: unknown): unknown =>
      taggen("desc", [spalte], { art: "desc", spalte }),
  };
}
