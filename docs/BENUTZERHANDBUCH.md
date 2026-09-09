# Benutzerhandbuch Digitale Bauakte

Stand: September 2026. Dieses Handbuch richtet sich an alle, die mit der Anwendung arbeiten — im Büro am Rechner und als Monteur vor Ort.

Bitte beachten Sie: Die Anwendung befindet sich im Aufbau. Details zu Funktionen, die noch ausgebaut werden (z. B. Offline-Nutzung im Keller ohne Empfang), nennt das jeweilige Kapitel.

## Inhalt

1. [Überblick: Worum geht es?](#1-überblick-worum-geht-es)
2. [Erste Schritte: Anmelden und Startseite](#2-erste-schritte-anmelden-und-startseite)
3. [Büro: Übersicht der offenen Wartungen](#3-büro-übersicht-der-offenen-wartungen)
4. [Büro: Kunden verwalten](#4-büro-kunden-verwalten)
5. [Büro: Anlagen verwalten](#5-büro-anlagen-verwalten)
6. [Büro: QR-Aufkleber drucken und anbringen](#6-büro-qr-aufkleber-drucken-und-anbringen)
7. [Monteur: Anlage scannen](#7-monteur-anlage-scannen)
8. [Monteur: Bauakte vor Ort lesen und Fotos aufnehmen](#8-monteur-bauakte-vor-ort-lesen-und-fotos-aufnehmen)
9. [Monteur: Serviceprotokoll ausfüllen](#9-monteur-serviceprotokoll-ausfüllen)
10. [Üben mit Demo-Daten](#10-üben-mit-demo-daten)
11. [Automatik im Hintergrund: Wartungs-Scan und E-Mail](#11-automatik-im-hintergrund-wartungs-scan-und-e-mail)
12. [Hilfe bei Problemen (FAQ)](#12-hilfe-bei-problemen-faq)
13. [Glossar](#13-glossar)

---

## 1. Überblick: Worum geht es?

Die Digitale Bauakte verwaltet Heizungs- und Sanitäranlagen Ihrer Kunden und erinnert das Büro automatisch an fällige Wartungen.

Es gibt zwei Arbeitsweisen:

| Wo? | Wer? | Was? |
| --- | --- | --- |
| Im Büro am Rechner | Innendienst | Dashboard prüfen, Kunden und Anlagen anlegen und pflegen, QR-Aufkleber drucken |
| Vor Ort mit dem Handy | Monteur | QR-Code an der Anlage scannen, Stammdaten prüfen, Fotos aufnehmen, Serviceprotokoll ausfüllen |

Die Startseite der Anwendung fragt Sie daher zuerst: **„Anlage scannen"** (für den Monteur) oder **„Büro-Dashboard"** (für das Büro).

---

## 2. Erste Schritte: Anmelden und Startseite

### 2.1 Anmelden

1. Rufen Sie die Anwendung im Browser auf.
2. Falls Sie noch nicht angemeldet sind, landen Sie automatisch auf der Seite **„Willkommen zurück"** mit dem Hinweis „Melden Sie sich an, um fortzufahren."
3. Geben Sie Ihre **E-Mail** und Ihr **Passwort** ein.
4. Klicken Sie auf **„Anmelden"**.
5. Ergebnis: Während der Prüfung steht dort „Wird geprüft …", danach landen Sie auf der gewünschten Seite (Standard: Übersicht). Bei falschen Daten erscheint eine Fehlermeldung — prüfen Sie dann Schreibweise und versuchen Sie es erneut.

Ihre Zugangsdaten erhalten Sie von Ihrem Administrator. Es gibt keine Selbstregistrierung in der Anwendung.

### 2.1b Passwort vergessen

Kommen Sie gar nicht mehr hinein, klicken Sie auf der Anmeldeseite auf **„Passwort vergessen?"**:

1. Geben Sie Ihre **E-Mail-Adresse** ein und klicken Sie auf **„Link anfordern"**.
2. Sie erhalten eine Mail mit einem Link (gilt 1 Stunde, nur einmal nutzbar). Hinweis: Aus Sicherheitsgründen erscheint diese Bestätigung immer — auch wenn Sie sich bei der Adresse vertippt haben. Dann kommt schlicht keine Mail an.
3. Öffnen Sie den Link und vergeben Sie zweimal Ihr **neues Passwort** (mindestens 8 Zeichen).
4. Melden Sie sich mit dem neuen Passwort an. Waren Sie noch auf anderen Geräten angemeldet, sind diese dabei abgemeldet worden — melden Sie sich dort einfach neu an.

Ist der Link abgelaufen oder wurde er schon benutzt, erscheint ein Hinweis — fordern Sie einfach einen neuen an. Kommt gar keine Mail an, prüfen Sie den Spam-Ordner und die Schreibweise der Adresse.

### 2.1a Profil, Passwort und Abmelden

Oben rechts in der Kopfzeile sehen Sie nur noch Ihr **Benutzer-Icon** (Kreis mit Ihrem Anfangsbuchstaben). Klicken Sie darauf, um Ihre **Profil-Seite** (`/profil`) zu öffnen. Dort finden Sie an einem Ort:

- Ihre Konto-Info (Name, E-Mail, Rolle),
- den Passwortwechsel,
- die Abmelde-Schaltfläche.

Ihr Passwort wechseln Sie selbst, ohne den Administrator:

1. Klicken Sie in der Kopfzeile auf Ihr **Benutzer-Icon**.
2. Geben Sie im Bereich „Neues Passwort" Ihr **aktuelles Passwort** sowie zweimal das **neue Passwort** ein (mindestens 8 Zeichen).
3. Klicken Sie auf **„Passwort ändern"**.
4. Ergebnis: Das neue Passwort gilt sofort. Waren Sie zusätzlich auf einem anderen Gerät angemeldet (z. B. Handy und Büro-Rechner), werden die anderen Sitzungen dabei abgemeldet — melden Sie sich dort einfach neu an.

Stimmt das aktuelle Passwort nicht, erscheint „Das aktuelle Passwort ist falsch." Passen die beiden neuen Eingaben nicht zusammen, erscheint ein entsprechender Hinweis — Ihre Eingaben bleiben dabei stehen.

### 2.2 Startseite

Nach dem Aufruf der Startadresse sehen Sie die Karte **„Digitale Bauakte"** mit zwei großen Schaltflächen:

- **„Anlage scannen"** — tippen Sie hier als Monteur vor Ort.
- **„Büro-Dashboard"** — klicken Sie hier für die Büro-Arbeit.

### 2.3 Navigation

Im Büro-Bereich finden Sie oben bzw. seitlich die **Büro-Navigation** mit drei Punkten:

- **Übersicht** (`/dashboard`)
- **Kunden** (`/kunden`)
- **Anlagen** (`/anlagen`)

Der gerade geöffnete Bereich ist farbig markiert.

Auf dem Handy finden Sie unten die Daumen-Navigation mit vier Punkten:

- **Start** (`/`)
- **Scannen** (`/scan`)
- **Aufträge** (`/dashboard`)
- **Sync** (`/sync`) — ausstehende Offline-Einträge einspielen. Steht eine Zahl am Symbol, warten Einträge auf Empfang (siehe Kapitel 9.5).

Zum Abmelden klicken Sie in der Kopfzeile auf Ihr Benutzer-Icon und nutzen auf der Profil-Seite die Abmelde-Schaltfläche.

---

## 3. Büro: Übersicht der offenen Wartungen

Rufen Sie **Übersicht** (`/dashboard`) auf. Die Seite heißt **„Offene Wartungen"** mit dem Untertitel „Automatisch erzeugt vom täglichen Wartungs-Scan." Sie müssen Aufträge hier nicht von Hand anlegen.

### 3.1 Kennzahlen oben

Drei Karten zeigen auf einen Blick:

- **Überfällig** — Wartungen, deren Fälligkeitsdatum bereits vorbei ist.
- **Fällig in 30 Tagen** — Wartungen, die in den nächsten 30 Tagen anstehen (ohne die überfälligen).
- **Offen gesamt** — alle offenen Aufträge zusammen.

### 3.2 Tabelle der Aufträge

Über der Tabelle stehen vier Filter-Schaltflächen: **Alle**, **Geplant**, **Terminiert**, **Überfällig**. Damit grenzen Sie die Liste ein, ohne dass die Kennzahlen oben sich ändern.

Darunter steht die Tabelle mit den Spalten:

- **Fällig** — Datum plus relative Angabe wie „heute", „morgen", „in 10 Tagen", „seit 3 Tagen" oder „seit gestern".
- **Kunde**
- **Anlage** (anklickbar — führt zur Auftragsdetailseite, siehe Kapitel 3.3)
- **Termin** — vereinbarter Termin (oder „–", falls noch keiner vergeben ist)
- **Monteur** — zugeteilte Person (oder „–")
- **Status** als farbige Markierung:
  - **Überfällig** (rot)
  - **Geplant** (grau)
  - **Terminiert** (Umriss)

Die Liste ist nach Fälligkeit sortiert und zeigt maximal 50 Einträge.

### 3.3 Auftrag öffnen, terminieren und stornieren

Klicken Sie in der Tabelle auf die **Anlage**, um die Auftragsdetailseite zu öffnen. Oben stehen Status, Anlage und Kunde (beide anklickbar), darunter die Karte **„Details"** mit Fälligkeit, Termin, Monteur, Standort und Notiz sowie — bei offenen Aufträgen — die Schaltfläche **„Protokoll ausfüllen"**.

Darunter finden Sie die Karte **„Termin vergeben"**:

1. Tragen Sie den **Termin** ein (Pflichtfeld).
2. Wählen Sie optional einen **Monteur** aus („Noch nicht zugeteilt", falls noch offen).
3. Ergänzen Sie bei Bedarf eine **Notiz** (z. B. Zufahrt, Ansprechpartner vor Ort).
4. Klicken Sie auf **„Termin speichern"** („Wird gespeichert …" währenddessen). Der Auftrag steht danach auf **Terminiert**. Bereits terminierte Aufträge lassen sich hier erneut umbuchen — einfach neues Datum eintragen und wieder speichern.

Ganz unten steht bei offenen Aufträgen die Karte zum **Stornieren** (z. B. bei Doppelanlage oder beendeter Betreuung): Nach der Rückfrage „Auftrag wirklich stornieren?" steht der Auftrag auf **Storniert**. Er bleibt in der Anlagen-Historie sichtbar, zählt aber nicht mehr als offen — ist die Wartung weiterhin fällig, legt der tägliche Scan beim nächsten Lauf einen neuen Auftrag an.

Erledigte und stornierte Aufträge lassen sich nicht mehr terminieren oder stornieren; die Seite zeigt dann stattdessen einen Hinweis. Ganz unten stehen die **Protokolle zu diesem Auftrag**.

### 3.4 Sonderfälle

- **„Aktuell keine offenen Wartungsaufträge."** — Es ist nichts zu tun. Sobald der tägliche Scan fällige Anlagen findet, erscheinen sie hier automatisch.
- **„Datenbank nicht erreichbar: …"** — Die Anwendung kann die Datenbank gerade nicht lesen. Warten Sie kurz und laden Sie neu. Hilft das nicht, wenden Sie sich an Ihren Administrator (siehe auch Kapitel 12).

---

## 4. Büro: Kunden verwalten

### 4.1 Kundenliste (`/kunden`)

Die Seite **„Kunden"** trägt den Untertitel „Hausverwaltungen, Eigentümer und Gewerbe mit ihren Anlagen."

Oben rechts steht die Schaltfläche **„Neuer Kunde"**. Die Zahl neben der Überschrift zeigt, wie viele Kunden vorhanden sind.

Die Tabelle enthält:

- **Kundennummer** (als Code markiert, anklickbar)
- **Name** (anklickbar)
- **Ansprechpartner** (oder „–")
- **Ort** (oder „–")
- **Anlagen** (Anzahl, rechtsbündig)

Klicken Sie auf Kundennummer oder Name, um die Kundendetails zu öffnen.

Noch keine Kunden? Dann steht dort: „Noch keine Kunden angelegt. Legen Sie den ersten Kunden an, um Anlagen zu verwalten."

### 4.2 Neuen Kunden anlegen (`/kunden/neu`)

1. Klicken Sie auf **„Neuer Kunde"**.
2. Füllen Sie die Karten aus:
   - **Stammdaten:** **Kundennummer** (Pflicht, Vorschlag ist bereits eingetragen), **Name** (Pflicht, z. B. Firma, Hausverwaltung oder Eigentümer), **Ansprechpartner**, **Telefon**, **E-Mail**.
   - **Anschrift:** **Straße und Hausnummer**, **PLZ**, **Ort**.
   - **Notizen:** **Interne Notizen** — der Hinweis „Nur für das Büro sichtbar." bedeutet: Der Monteur sieht diesen Text vor Ort nicht.
3. Klicken Sie unten auf **„Kunde anlegen"**. Während des Speicherns steht dort „Wird gespeichert …".
4. Ergebnis: Sie landen automatisch auf der neuen Kundendetailseite.

Mit **„Abbrechen"** kehren Sie ohne zu speichern zur Kundenliste zurück.

Bitte beachten Sie:

- Die **Kundennummer muss eindeutig** sein. Ist sie bereits vergeben, erscheint unter dem Feld: „Diese Kundennummer ist bereits vergeben" sowie oben „Bitte die markierten Felder prüfen." Wählen Sie dann eine andere Nummer.
- Keine gültige E-Mail-Adresse wird mit „Keine gültige E-Mail-Adresse" beanstandet. Leer lassen ist erlaubt.

### 4.3 Kundendetails (`/kunden/[id]`)

Oben stehen Name und Kundennummer. Rechts finden Sie drei Aktionen:

- **„Bearbeiten"** — öffnet das Formular aus Kapitel 4.2 mit gespeicherten Werten.
- **„Anlage anlegen"** (mit Plus-Zeichen) — legt direkt eine Anlage für genau diesen Kunden an; der Kunde ist dann bereits vorausgewählt.
- **„Löschen"** (rot) — fragt zuerst: Kunde „…" wirklich löschen? Währenddessen steht dort „Löscht …".

Darunter sehen Sie die **Stammdaten** (Kundennummer, Ansprechpartner, E-Mail, Telefon, Straße, PLZ / Ort) sowie ggf. Ihre Notizen.

Ganz unten steht die Liste **„Anlagen"** dieses Kunden mit Bezeichnung (anklickbar), Standort, nächster Wartung und Status (**Aktiv** / **Inaktiv**). Gibt es noch keine, steht dort: „Noch keine Anlagen für diesen Kunden."

### 4.4 Kunden bearbeiten (`/kunden/[id]/bearbeiten`)

Das Formular entspricht dem Anlegen. Die Schaltfläche heißt hier **„Änderungen speichern"**. **„Abbrechen"** führt zurück zur Kundendetailseite, ohne zu speichern.

### 4.5 Kunden löschen — nur ohne Anlagen möglich

Ein Kunde lässt sich **nur löschen, solange keine Anlage mehr an ihm hängt**. Der Grund: An einem Kunden hängen Anlagen, Aufträge, Protokolle und Datei-Verweise — Reste im Dateispeicher blieben sonst verwaist zurück.

Versuchen Sie es trotzdem, erhalten Sie die Meldung:

> „Kunde hat noch X Anlage(n). Erst die Anlagen löschen oder umhängen."

Gehen Sie dann so vor:

1. Öffnen Sie die Anlagen des Kunden (Liste unten auf der Kundendetailseite).
2. Hängen Sie jede Anlage per **„Bearbeiten"** auf einen anderen Kunden um (Feld **Kunde**) oder deaktivieren Sie nicht mehr betreute Anlagen (siehe Kapitel 5.5).
3. Erst wenn die Anlagenliste des Kunden leer ist, funktioniert **„Löschen"**. Danach landen Sie wieder in der Kundenliste.

---

## 5. Büro: Anlagen verwalten

### 5.1 Anlagenliste (`/anlagen`)

Die Seite **„Anlagen"** trägt den Untertitel „Die digitale Bauakte je Heizungs- oder Sanitäranlage."

Oben rechts: **„Neue Anlage"**. Die Zahl neben der Überschrift ist die Anzahl aller Anlagen.

Die Tabelle enthält:

- **Kunde** (anklickbar, führt zum Kunden)
- **Anlage** (Bezeichnung, anklickbar, führt zur Anlage)
- **Standort** (oder „–")
- **Intervall** (z. B. „12 Mon.")
- **Nächste Wartung** (Datum oder „–"; überfällige Daten stehen rot und fett)
- **Status:**
  - **Aktiv** (grau) — normale, betreute Anlage.
  - **Überfällig** (rot) — aktiv und Fälligkeitsdatum liegt in der Vergangenheit.
  - **Inaktiv** (Umriss) — deaktiviert, wird vom Wartungs-Scan übersprungen.

Noch keine Anlagen? Dann steht dort: „Noch keine Anlagen angelegt. Legen Sie die erste Anlage an, damit der Wartungs-Scan sie erfassen kann."

### 5.2 Neue Anlage anlegen (`/anlagen/neu`)

Sie erreichen das Formular über **„Neue Anlage"** in der Anlagenliste oder über **„Anlage anlegen"** auf einer Kundendetailseite (dann ist der Kunde bereits vorausgewählt).

Füllen Sie die drei Karten aus:

**Karte „Anlage":**

- **Kunde** (Pflicht) — wählen Sie aus der Liste („Kundennummer - Name"). Steht dort „Bitte wählen", haben Sie noch nichts ausgewählt.
- **Bezeichnung** (Pflicht) — z. B. „Gas-Brennwertkessel Haus A".
- **Hersteller**, **Modell**, **Serien-Nr.**, **Baujahr** (optional, bitte so genau wie möglich — der Monteur sieht diese Angaben vor Ort).

**Karte „Aufstellort":**

- **Standort** — z. B. „Keller, Heizraum links".
- **Straße und Hausnummer**, **PLZ**, **Ort** — falls abweichend vom Kunden.

**Karte „Wartung":**

- **Intervall (Monate)** (Pflicht, 1 bis 120, Standard: 12).
- **Letzte Wartung** (Datum, optional).
- **Nächste Wartung** (Datum, optional) — mit dem Hinweis: „Leer lassen: wird aus letzter Wartung und Intervall berechnet."

Klicken Sie auf **„Anlage anlegen"** („Wird gespeichert …" währenddessen). Mit **„Abbrechen"** kehren Sie ohne zu speichern zur Anlagenliste zurück.

### 5.3 Wie die nächste Wartung berechnet wird

Das ist die wichtigste Regel im Formular:

- Lassen Sie **Nächste Wartung leer**, wird sie automatisch aus **Letzte Wartung + Intervall** berechnet. Beispiel: Letzte Wartung 15.03.2026, Intervall 12 Monate → nächste Wartung 15.03.2027.
- Tragen Sie selbst ein Datum bei **Nächste Wartung** ein, **gewinnt immer Ihr Eintrag**.
- Lassen Sie **beide Datumsfelder leer**, hat die Anlage kein Fälligkeitsdatum („–") — **der tägliche Scan findet sie dann nie**. Tragen Sie daher mindestens die letzte Wartung oder die nächste Wartung ein.

### 5.4 Anlagendetails (`/anlagen/[id]`)

Oben stehen Status (**Aktiv** oder **Inaktiv**), Bezeichnung sowie Kunde mit Kundennummer (anklickbar). Rechts finden Sie:

- **„Bearbeiten"** — öffnet das Formular mit gespeicherten Werten.
- **„QR-Aufkleber"** (mit QR-Symbol) — öffnet die Druckansicht (Kapitel 6).
- **„Deaktivieren"** bzw. **„Aktivieren"** — siehe Kapitel 5.5.

Darunter sehen Sie zwei Karten:

- **Stammdaten:** Hersteller, Modell, Serien-Nr., Baujahr, Standort, Adresse.
- **Wartung:** Intervall, letzte Wartung, nächste Wartung sowie der **QR-Token** (Code in Festbreitenschrift). Darunter steht: „Der Monteur erreicht die Anlage unter `/anlage/<Token>` – per Scan oder durch Eintippen des Tokens unter `/scan`."

Ganz unten stehen zwei Verläufe (jeweils die letzten 10 Einträge):

- **Wartungsaufträge** mit Fällig, Termin, Monteur und Status (**Überfällig**, **Geplant**, **Terminiert**, **Erledigt**, **Storniert**). Das Fälligkeitsdatum ist anklickbar und führt zur Auftragsdetailseite (siehe Kapitel 3.3). Gibt es noch keine, steht dort: „Noch keine Aufträge. Der tägliche Scan legt sie an, sobald die nächste Wartung innerhalb des Vorlaufs liegt."
- **Protokolle** mit Durchgeführt, Tätigkeiten und Mängeln. Gibt es noch keine, steht dort: „Noch keine Serviceprotokolle erfasst."

Ist die Anlage deaktiviert, erscheint zusätzlich der Hinweis: „Diese Anlage ist deaktiviert und wird vom täglichen Wartungs-Scan übersprungen."

### 5.5 Anlage bearbeiten, deaktivieren und aktivieren

**Bearbeiten** (`/anlagen/[id]/bearbeiten`) funktioniert wie das Anlegen, die Schaltfläche heißt **„Änderungen speichern"**. **„Abbrechen"** führt ohne zu speichern zurück zur Anlage.

Wichtig: Der **QR-Token ändert sich beim Bearbeiten nicht**. Das ist Absicht, weil der gedruckte Aufkleber bereits an der Anlage klebt. Auch über das Formular lässt sich der Token nicht ändern.

**Bitte löschen Sie Anlagen nicht, sondern deaktivieren Sie sie.** Dafür gibt es auf der Anlagendetailseite die Schaltfläche **„Deaktivieren"**. Sie werden gefragt: „Anlage deaktivieren? Sie fällt damit aus dem Wartungsturnus." Nach dem Deaktivieren:

- steht oben der Status **Inaktiv**,
- erscheint der Hinweis zum übersprungenen Scan,
- legt der tägliche Scan keine neuen Aufträge mehr für diese Anlage an,
- bleibt die gesamte Historie (Aufträge, Protokolle) erhalten.

Mit **„Aktivieren"** nehmen Sie die Anlage wieder in den Turnus auf (Meldung: „Anlage aktiviert" bzw. „Anlage deaktiviert").

---

## 6. Büro: QR-Aufkleber drucken und anbringen

Jede Anlage hat genau einen QR-Code. Der Monteur scannt ihn vor Ort und landet direkt in der richtigen Bauakte.

### 6.1 Druckansicht öffnen

1. Öffnen Sie die Anlage (z. B. über **Anlagen** → Bezeichnung).
2. Klicken Sie rechts auf **„QR-Aufkleber"** (`/anlagen/[id]/qr`).
3. Ergebnis: Die Seite **„QR-Aufkleber"** erscheint mit dem Hinweis „Ausdrucken, laminieren und gut sichtbar an der Anlage anbringen." und einer Schaltfläche **„Zurück zur Anlage"**.

### 6.2 Was auf dem Aufkleber steht

Der Aufkleber ist bewusst klein gehalten (Karte in Visitenkartengröße) und enthält:

- links den QR-Code,
- rechts **Bezeichnung**, **Kunde**, ggf. **Standort** und den **Token in Maschinenschrift** (z. B. `demo1234`),
- unten den Hinweis: „Scannen oder Code unter `<Ihre-Adresse>/scan` eingeben."
- Unter dem Aufkleber steht zusätzlich das genaue **Ziel des Codes** (z. B. `https://…/anlage/demo1234`) zur Kontrolle.

### 6.3 Drucken, anbringen und testen

1. Nutzen Sie die Druckfunktion Ihres Browsers. Es wird nur der Aufkleber gedruckt — Navigation, Kopfzeile und Schaltflächen werden automatisch ausgeblendet.
2. Empfehlung: Aufkleber **ausdrucken, laminieren** (Heizungskeller sind feucht und staubig) und **gut sichtbar an der Anlage** anbringen, z. B. seitlich am Kessel.
3. Testen Sie den Aufkleber sofort: Öffnen Sie auf dem Handy `/scan`, geben Sie den aufgedruckten Token ein und tippen Sie auf **„Anlage öffnen"**. Es muss genau diese Anlage erscheinen.
4. Drucken Sie den Aufkleber bei Bedarf erneut — der Code bleibt gleich, solange die Anlage besteht.

---

## 7. Monteur: Anlage scannen

Rufen Sie auf dem Handy **Scannen** (`/scan`) auf. Die Seite heißt **„Anlage scannen"** mit dem Untertitel „QR-Code am Kessel scannen, um die Bauakte zu öffnen."

1. Tippen Sie auf **„Kamera starten"** und erlauben Sie den Kamera-Zugriff, falls der Browser fragt.
2. Halten Sie den QR-Code des Aufklebers ins markierte Bildfeld — die Bauakte öffnet sich automatisch (`/anlage/<Token>`).
3. Klappt es nicht (verweigerte Berechtigung, kein Empfang für die Erkennung ist nicht nötig — sie läuft auf dem Gerät —, oder altes Handy), tippen Sie den **Code vom Aufkleber** unten von Hand ein und tippen Sie auf **„Anlage öffnen"**.

Fremde QR-Codes (z. B. WLAN-Codes) werden ignoriert — der Scan läuft einfach weiter.

**Ohne Empfang:** Die Scan-Seite selbst funktioniert auch offline. Bereits besuchte Bauakten öffnen sich aus dem Zwischenspeicher (mit dem Hinweis „Offline – Stand vom letzten Besuch"); eine noch nie geöffnete Anlage braucht beim ersten Mal Empfang. Tipp für den Tag im Keller: morgens mit Empfang einmal alle heutigen Anlagen öffnen, dann sind sie unten verfügbar.

Unten in der Handy-Navigation kommen Sie über **Start** zurück zur Auswahl und über **Aufträge** zur Liste der offenen Wartungen.

---

## 8. Monteur: Bauakte vor Ort lesen und Fotos aufnehmen

Nach dem Scan sehen Sie oben zuerst eine Markierung:

- **„Wartung überfällig"** (rot) — diese Anlage ist über ihr Fälligkeitsdatum hinaus.
- **„Bauakte"** (grau) — normale Akte, keine Überfälligkeit.

Darunter stehen Bezeichnung und Kunde.

### 8.1 Stammdaten

Die Karte **„Stammdaten"** zeigt: Kunde, Hersteller, Modell, Serien-Nr., Baujahr, Standort, letzte Wartung und nächste Wartung. Steht dort „–", ist dieser Wert im Büro nicht gepflegt — melden Sie das bitte dem Innendienst, damit er es nachtragen kann.

### 8.2 Foto aufnehmen

Unter den Stammdaten finden Sie die Schaltfläche **„Foto aufnehmen"** (mit Kamera-Symbol):

1. Tippen Sie darauf.
2. Ergebnis: Auf dem Handy öffnet sich direkt die **Rückkamera**, am Rechner der **Dateidialog**.
3. Nehmen Sie das Foto auf bzw. wählen Sie eine Bilddatei.
4. Ergebnis: Das Foto wird automatisch hochgeladen und der Bauakte zugeordnet. Bei Erfolg erscheint „Foto gespeichert". Währenddessen steht auf der Schaltfläche „Wird hochgeladen …".

Darunter steht zur Bestätigung: „Fotos werden direkt der Bauakte zugeordnet." und eine Schaltfläche **„Protokoll ausfüllen"** (mit Klemmbrett-Symbol, siehe nächstes Kapitel).

Fotos lassen sich sowohl hier als auch direkt im Protokoll aufnehmen — sie landen in beiden Fällen bei derselben Anlage.

---

## 9. Monteur: Serviceprotokoll ausfüllen

Tippen Sie in der Bauakte auf **„Protokoll ausfüllen"**. Sie landen auf der Seite **„Serviceprotokoll"** (`/protokoll/[Auftrag]`).

Oben steht entweder **„Spontaner Serviceeinsatz"** (Sie kamen ohne vorherigen Auftrag, die Anlage steht in der Adresse als `?installation=…`) oder **„Auftrag <Nummer>"** (Sie arbeiten einen geplanten Auftrag ab).

### 9.1 Messwerte

Die Karte **„Messwerte"** enthält vier Felder:

- **Abgastemp. (°C)**
- **CO₂ (%)**
- **Druck (bar)**
- **Arbeitszeit (min)**

Tragen Sie die Werte so ein, wie Sie sie gemessen haben. Alle Felder sind derzeit optional — lassen Sie weg, was Sie nicht gemessen haben.

### 9.2 Fotos im Protokoll

Die Karte **„Fotos"** enthält dieselbe Funktion **„Foto aufnehmen"** wie in Kapitel 8.2. Nutzen Sie sie für Typenschilder, Mängel oder die fertige Arbeit.

### 9.3 Unterschrift des Kunden

Die Karte **„Unterschrift Kunde"** enthält:

1. Feld **„Name"** — Name der unterschreibenden Person (wird automatisch als Personenname erkannt).
2. Unterschriftenfeld (leere Zeichenfläche) — unterschreiben lassen Sie mit **Finger, Stift oder Maus**.
3. Zwei Schaltflächen darunter:
   - **„Löschen"** — verwirft die Zeichnung, das Feld ist wieder leer.
   - **„Übernehmen"** — speichert die Unterschrift als Bild bei der Anlage. Bei Erfolg erscheint „Unterschrift gespeichert". Ohne Zeichnung ist die Schaltfläche deaktiviert.

Klappt das Speichern nicht, erscheint z. B. „Unterschrift konnte nicht gespeichert werden" — prüfen Sie dann Ihre Internetverbindung und versuchen Sie es erneut.

### 9.4 Abschließen

Ganz unten steht die große Schaltfläche **„Protokoll abschließen"**. Tippen Sie darauf, wenn Messwerte, Fotos und Unterschrift vollständig sind:

1. Während des Speicherns steht dort „Wird gespeichert …".
2. Ergebnis: Das Protokoll wird als offizieller Servicebericht abgelegt, der Auftrag auf „Erledigt" gesetzt, die nächste Wartung um das Intervall fortgeschrieben und Sie landen zurück in der Bauakte der Anlage.
3. Das Büro sieht den Bericht unter **Anlagen → Anlage → Protokolle**, der Auftrag verschwindet aus der Übersicht der offenen Wartungen. Hat der Kunde eine E-Mail-Adresse hinterlegt, erhält er automatisch eine Bestätigung.

Haben Sie den Einsatz ohne vorherigen Auftrag begonnen („Spontaner Serviceeinsatz"), wird ein gleichzeitig offener Auftrag derselben Anlage automatisch mit abgeschlossen — so bleibt keine Karteileiche im Dashboard zurück.

Sonderfall: Steht dort **„Keine Anlage gewählt. Bitte zuerst den QR-Code an der Anlage scannen."**, wurde die Seite ohne Anlage aufgerufen. Gehen Sie dann zurück zu **Scannen** und öffnen Sie die Anlage erneut über ihren Token.

### 9.5 Offline erfassen und synchronisieren

Im Keller ohne Empfang arbeiten Sie fast wie gewohnt — mit drei sichtbaren Unterschieden:

1. **Fotos und Unterschrift** melden „Offline gespeichert – Sync steht aus" statt „Foto gespeichert". Sie liegen zunächst nur auf Ihrem Gerät (platzsparend verkleinert) und wandern später automatisch mit.
2. **„Protokoll abschließen"** legt das Protokoll ohne Netz ebenfalls auf dem Gerät ab („Offline gespeichert – wird synchronisiert, sobald Empfang besteht") und bringt Sie zurück in die Bauakte. Es gilt dann noch **nicht** als offizieller Servicebericht — das passiert erst beim Sync.
3. Der Zähler am **Sync**-Symbol unten zeigt, wie viele Einträge warten.

Sobald Empfang besteht, gibt es drei Wege zum Einspielen — alle führen zum selben Ergebnis:

- **Automatisch:** Öffnen Sie die App mit Empfang (Büro oder unterwegs), startet die Synchronisierung von selbst — bei Erfolg erscheint z. B. „2 Einträge automatisch synchronisiert".
- **Per Button:** Öffnen Sie **Sync** unten und tippen Sie auf **„Jetzt synchronisieren"**.
- **Beim Absenden:** Enthält ein Protokoll Aufnahmen aus der Offline-Zeit und Sie haben inzwischen Netz, werden sie beim Abschließen still mit hochgeladen („Aufnahmen werden hochgeladen …").

Nach erfolgreichem Sync verhält sich alles wie in Kapitel 9.4 beschrieben (Bericht abgelegt, Auftrag erledigt, Folgetermin fortgeschrieben, E-Mail ans Büro bzw. den Kunden). **Schlägt ein Eintrag fehl** (z. B. wurde der Auftrag inzwischen im Büro storniert), bleibt er mit der genauen Meldung in der **Sync**-Liste stehen — nichts geht verloren. Tippen Sie dann erneut auf **„Jetzt synchronisieren"** (ggf. nach Rücksprache mit dem Büro).

Bitte beachten Sie: Abmelden leert den Seiten-Zwischenspeicher auf dem Gerät (geteilte Geräte!). Offene Sync-Einträge selbst bleiben erhalten und werden nach der nächsten Anmeldung eingespielt — im Büro sichtbar ist aber erst, was synchronisiert wurde. Synchronisieren Sie deshalb möglichst **vor** dem Abmelden.

---

## 10. Üben mit Demo-Daten

Zum Ausprobieren liegen in der Entwicklungs-Datenbank ein Testkonto und drei Anlagen bereit. Die Zugangsdaten erhalten Sie von Ihrem Administrator (sie stehen aus Sicherheitsgründen nicht in diesem Handbuch).

Die drei Demo-Anlagen erreichen Sie über **Scannen** (`/scan`, Token eintippen) oder direkt über `/anlage/<Token>`:

| Code/Token | Anlage | Fälligkeit | Was Sie sehen und üben können |
| --- | --- | --- | --- |
| `demo1234` | Gas-Brennwertkessel Haus A | in ca. 10 Tagen | **Normalfall:** Bauakte mit Markierung „Bauakte", Auftrag wird im Dashboard unter „Fällig in 30 Tagen" angelegt. Üben Sie: Scannen → Stammdaten lesen → Foto aufnehmen → Protokoll öffnen. |
| `demo5678` | Gas-Brennwertkessel Haus B | in ca. 120 Tagen | **Noch nicht fällig:** liegt bewusst außerhalb des 30-Tage-Vorlaufs, daher wird **kein Auftrag** im Dashboard angelegt. Üben Sie: Warum erscheint hier nichts unter „Übersicht"? |
| `demo9012` | Warmwasserbereiter Backstube | überfällig | **Dringend:** Bauakte mit roter Markierung „Wartung überfällig", Auftrag steht im Dashboard unter „Überfällig" mit Angabe wie „seit X Tagen". Üben Sie: Dringlichkeit erkennen und priorisieren. |

Empfohlener Übungsablauf:

1. Melden Sie sich an.
2. Öffnen Sie als Büro die **Übersicht** und merken Sie sich, welche der drei Anlagen dort auftaucht und welche nicht.
3. Wechseln Sie aufs Handy (oder ein schmales Browserfenster), rufen Sie **Scannen** auf und tippen Sie nacheinander `demo1234`, `demo5678` und `demo9012` ein.
4. Prüfen Sie jeweils Markierung, Stammdaten und nächste Wartung.
5. Nehmen Sie bei `demo1234` ein Testfoto auf, füllen Sie das Protokoll aus und schließen Sie es ab. Prüfen Sie danach im Büro, dass der Auftrag aus der Übersicht verschwunden und das Protokoll in der Anlage erschienen ist.
6. Öffnen Sie im Büro die Anlage „Gas-Brennwertkessel Haus A" und prüfen Sie Wartungsaufträge und Protokolle.

Falls die Demo-Daten fehlen (z. B. nach einem Datenbank-Neuaufbau), wenden Sie sich an Ihren Administrator — sie werden per Skript eingespielt, nicht über die Oberfläche.

---

## 11. Automatik im Hintergrund: Wartungs-Scan und E-Mail

Sie müssen Fälligkeiten nicht selbst überwachen. Jeden Morgen läuft automatisch der **Wartungs-Scan**:

- Er prüft alle **aktiven** Anlagen mit einem Fälligkeitsdatum.
- Liegt die nächste Wartung **innerhalb der nächsten 30 Tage** (oder ist bereits vorbei), legt er einen Auftrag an — doppelte Aufträge werden dabei vermieden.
- **Inaktive** Anlagen werden übersprungen.
- Anlagen **ohne Fälligkeitsdatum** werden nie gefunden (siehe Kapitel 5.3).

Das Büro wird per **E-Mail** über fällige Wartungen informiert. Die E-Mail geht an das zentrale Büropostfach, nicht an den einzelnen Monteur.

Was das für Sie bedeutet:

- **Büro:** Schauen Sie morgens auf die **Übersicht**. Neue Aufträge sind ohne Ihr Zutun erschienen. Planen Sie überfällige zuerst.
- **Monteur:** Wundert Sie sich nicht, wenn ein Auftrag unter **Aufträge** auftaucht, den niemand von Hand angelegt hat — das war der Scan.

---

## 12. Hilfe bei Problemen (FAQ)

**Anmeldung schlägt fehl.**

Prüfen Sie E-Mail-Schreibweise und Passwort. Nach einem falschen Versuch erscheint eine Fehlermeldung über dem Formular. Kommen Sie gar nicht mehr hinein, nutzen Sie **„Passwort vergessen?"** auf der Anmeldeseite (siehe Kapitel 2.1b) — solange Sie noch angemeldet sind, ändern Sie es stattdessen auf Ihrer **Profil-Seite** (Benutzer-Icon in der Kopfzeile, siehe Kapitel 2.1a).

**Ich werde auf die Anmeldeseite zurückgeworfen.**

Ihre Sitzung ist abgelaufen oder Sie waren noch nicht angemeldet. Melden Sie sich erneut an — danach geht es automatisch zur ursprünglich gewünschten Seite weiter.

**„Datenbank nicht erreichbar" auf Übersicht, Kunden oder Anlagen.**

Die Anwendung läuft, aber die Datenbank antwortet nicht. Laden Sie die Seite neu und prüfen Sie Ihre Internetverbindung. Bleibt die Meldung, wenden Sie sich mit dem genauen Fehlertext an Ihren Administrator.

**Anlage wird nach dem Scan nicht gefunden.**

Prüfen Sie: Token exakt abgetippt? Keine überflüssigen Leerzeichen, kein Buchstabe mit Zahl verwechselt (z. B. „O" statt „0")? Der Token steht in Maschinenschrift auf dem Aufkleber und in der Büro-Ansicht unter **Wartung → QR-Token**. Stimmt er und es klappt trotzdem nicht, ist der Aufkleber evtl. alt — lassen Sie im Büro prüfen, ob die Anlage noch aktiv ist.

**Kunde lässt sich nicht löschen.**

Das ist Absicht, solange noch Anlagen am Kunden hängen (Meldung mit Anzahl). Hängen Sie die Anlagen zuerst um oder deaktivieren Sie sie (Kapitel 4.5 und 5.5).

**Bei „Nächste Wartung" steht nur „–".**

Es ist weder eine nächste noch eine letzte Wartung eingetragen. Tragen Sie im Büro mindestens eines von beiden nach (Kapitel 5.3), sonst findet der Scan die Anlage nie.

**Ein Auftrag taucht nicht in der Übersicht auf.**

Mögliche Ursachen in dieser Reihenfolge prüfen: 1) Anlage ist **inaktiv** → aktivieren. 2) Nächste Wartung liegt **mehr als 30 Tage** in der Zukunft (wie Demo-Fall `demo5678`) → noch abwarten. 3) Es gibt gar kein Fälligkeitsdatum („–") → nachtragen. 4) Der Auftrag wurde **storniert oder ist erledigt** → er steht nur noch in der Anlagen-Historie; bei weiter fälliger Wartung legt der Scan einen neuen an.

**„Foto gespeichert" erscheint nicht / Upload schlägt fehl.**

Prüfen Sie Ihre Internetverbindung (gerade im Keller oft schwach). Versuchen Sie es erneut. Bleibt der Fehler („Upload fehlgeschlagen" o. ä.), notieren Sie den genauen Text und melden Sie ihn dem Büro — das Foto kann später nachgetragen werden.

**Unterschrift lässt sich nicht übernehmen.**

Die Schaltfläche **„Übernehmen"** bleibt deaktiviert, solange das Feld leer ist — unterschreiben Sie zuerst. Erscheint „Unterschrift konnte nicht gespeichert werden", prüfen Sie die Verbindung und versuchen Sie es erneut.

**„Protokoll abschließen" meldet einen Fehler.**

Lesen Sie die Meldung über dem Formular: Feldfehler (z. B. keine Zahl bei den Messwerten) sind direkt am Feld markiert. Bei „Auftrag nicht gefunden" oder „bereits abgeschlossen" hat sich der Auftragsstand geändert — kehren Sie zur Bauakte zurück und öffnen Sie das Protokoll erneut. Ihre Fotos und die Unterschrift sind bereits gespeichert und gehen dabei nicht verloren.

**Sync-Eintrag bleibt mit Fehler stehen.**

Lesen Sie die Meldung in der **Sync**-Liste: Bei geändertem Auftragsstand („bereits abgeschlossen") klären Sie das mit dem Büro (ggf. Spontanprotokoll neu erfassen), bei Netzfehlern genügt ein erneuter Tipp auf **„Jetzt synchronisieren"** mit besserem Empfang.

**Nach dem Abmelden ist die Bauakte offline weg.**

Das ist Absicht (geteilte Geräte): Abmelden leert den Seiten-Zwischenspeicher. Offene Sync-Einträge bleiben erhalten und werden nach der nächsten Anmeldung eingespielt — lesen lässt sich offline danach nur, was Sie erneut besucht haben.

**QR-Aufkleber sieht beim Drucken falsch aus.**

Drucken Sie über die Browser-Druckfunktion von der Seite **„QR-Aufkleber"** aus — nur dort wird automatisch alles außer dem Aufkleber ausgeblendet. Prüfen Sie, dass Sie nicht versehentlich die normale Anlagenseite drucken.

**E-Mail über fällige Wartung kommt nicht an.**

Prüfen Sie Spam-Ordner und ob das richtige Büropostfach hinterlegt ist. Hinweis für den Administrator: Ohne verifizierte Absender-Domain stellt der E-Mail-Dienst nur an die eigene Konto-Adresse zu — Mails an Kundenadressen brauchen erst eine verifizierte Domain.

**Reset-Mail („Passwort vergessen") kommt nicht an.**

Prüfen Sie Spam-Ordner und die Schreibweise der eingegebenen Adresse — aus Sicherheitsgründen erscheint die Bestätigung immer, auch bei vertippter Adresse (dann kommt schlicht keine Mail). Der Link gilt nur 1 Stunde und nur einmal. Für den Administrator gilt derselbe Domain-Hinweis wie oben.

---

## 13. Glossar

- **Bauakte** — alle Daten einer Anlage an einem Ort: Stammdaten, Aufstellort, Wartungstermine, Aufträge, Protokolle und Fotos.
- **QR-Token** — kurzer Code je Anlage (z. B. `demo1234`). Steckt im QR-Code, steht zusätzlich in Klarschrift auf dem Aufkleber und lässt sich unter `/scan` von Hand eintippen. Ändert sich nach dem Anlegen nicht mehr.
- **Intervall** — Wartungsabstand in Monaten (1–120, Standard 12).
- **Nächste Wartung** — Fälligkeitsdatum. Leer lassen heißt: wird aus letzter Wartung + Intervall berechnet. Ein eingetragenes Datum gewinnt immer.
- **Aktiv / Inaktiv** — nur aktive Anlagen nimmt der Scan in den Turnus. Inaktiv heißt: betreuen wir gerade nicht, Historie bleibt erhalten.
- **Status eines Auftrags:**
  - **Geplant** — vom Scan angelegt, noch kein Termin vergeben.
  - **Terminiert** — Termin ist vergeben.
  - **Überfällig** — Fälligkeitsdatum ist vorbei.
  - **Erledigt / Storniert** — abgeschlossen bzw. gegenstandslos; erscheinen nicht mehr in der Übersicht der offenen Wartungen.
- **Scan** — hier zweideutig: 1) der Monteur scannt (bzw. tippt) den QR-Code vor Ort; 2) der automatische Wartungs-Scan jeden Morgen, der Aufträge anlegt.
- **Protokoll / Servicebericht** — Dokumentation eines Einsatzes: Messwerte, Fotos, Mängel, Unterschrift.

---

*Technische Details (Installation, Datenbank, E-Mail-Einrichtung, Deployment) stehen nicht in diesem Handbuch, sondern in `README.md` für Administratoren und Entwickler.*
