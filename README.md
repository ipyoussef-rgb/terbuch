# Terbuch — Terminbuchung

Terminbuchungs-Anwendung für kommunale Services (Bürgerservice, Fahrerlaubnis, Standesamt) mit:

- **KOBIL Identity** SSO für Bürger:innen und Sachbearbeiter:innen (zwei separate OIDC Clients).
- **KOBIL Chat (mChat / Mercury)** zur Termin­bestätigung per Ja / Nein direkt im Chat.
- **Admin-Portal** mit Dashboard, Termin­übersicht, Chat-Komponist und Slot-Verwaltung.
- **Vercel-ready** auf dem Free-Tier (Neon Postgres, einfacher Cron).

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4
- Prisma 7 + Neon Postgres (Adapter `@prisma/adapter-neon`)
- `openid-client` v6 (Authorization Code + PKCE, Client Credentials)
- `jose` für signierte Session-Cookies
- `zod` für Eingabe­validierung

## Lokale Einrichtung

```bash
# 1. Dependencies
npm install

# 2. .env aus Template anlegen und ausfüllen
cp .env.example .env
# DATABASE_URL, KOBIL_*, AUTH_SECRET (`openssl rand -base64 32`) eintragen

# 3. Schema in die Datenbank pushen
npm run db:push

# 4. Stamm­daten einspielen (Services, Optionen, Ämter)
npm run db:seed

# 5. Slots für die nächsten 14 Tage generieren
npm run slots:generate

# 6. Dev-Server
npm run dev
```

App läuft auf <http://localhost:3000>.

## Deployment auf Vercel (Free Tier)

1. Repo verbinden, Projekt auf Vercel anlegen.
2. **Neon** Integration aktivieren (Storage → Postgres → Neon). Der `DATABASE_URL` wird automatisch gesetzt.
3. Restliche Environment Variablen aus `.env.example` in den Vercel Project Settings hinterlegen — Production **und** Preview.
4. `KOBIL_USER_CLIENT_ID/SECRET`, `KOBIL_ADMIN_CLIENT_ID/SECRET`, `KOBIL_CHAT_CLIENT_ID/SECRET` aus deinem KOBIL-Tenant.
5. **Redirect URIs** der OIDC Clients im KOBIL-Tenant ergänzen:
   - User: `https://<dein-domain>/api/auth/user/callback`
   - Admin: `https://<dein-domain>/api/auth/admin/callback`
6. **Webhook URL** für die Chat-App im KOBIL-Tenant eintragen:
   - `https://<dein-domain>/api/admin/chat-webhook`
   - `KOBIL_WEBHOOK_SECRET` als Header `x-webhook-secret` mitschicken (falls Mercury das unterstützt) oder als Query-Parameter `?secret=…`.
7. `KOBIL_CHAT_SERVICE_UUID` setzen (UUID der Chat-App im KOBIL-Tenant).
8. `AUTH_SECRET` und `CRON_SECRET` jeweils auf eine Zufalls­zeichenkette setzen.
9. Erste Bereitstellung. Dann einmalig:
   - In Vercel CLI / Build Logs `npx prisma migrate deploy` läuft automatisch (Teil des `build` Skripts).
   - Lokal mit Production-DB einmal `DATABASE_URL=… npm run db:seed && DATABASE_URL=… npm run slots:generate` ausführen, damit die Stammdaten und initialen Slots da sind.
10. Der tägliche Cron (`vercel.json`) füllt anschließend automatisch neue Slots auf.

## Ablauf (Bürger:innen-Seite)

```
/                  → Service-Auswahl (Bürgerservice / Fahrerlaubnis / Standesamt)
/service/[slug]    → Optionen (z. B. Personalausweis beantragen)
/office?option=…   → Ämter, sortiert nach Entfernung (Browser-Geolocation)
/slots?option=&office= → Freie Termine in den nächsten 14 Tagen
/book?option=&office=&slot= → Auto-gefülltes Formular, Reservierung
/booking/[id]      → Bestätigungs-Wartebildschirm (pollt den Status)
```

Nach Klick auf **Reservieren**:

1. Slot wird in einer DB-Transaktion auf `PENDING` gesetzt, Termin angelegt.
2. Server schickt zwei Mercury-Nachrichten an die Bürger:in:
   - `plainText` mit Termin­details
   - `choiceRequest` mit „Ja, bestätigen" / „Nein, abbrechen"
3. Bürger:in antwortet im KOBIL Chat → KOBIL Mercury POSTet auf `/api/admin/chat-webhook`:
   - **Ja** → Termin `CONFIRMED`, Slot `BOOKED`, Dank-Nachricht via `processChatMessage`.
   - **Nein** → Termin `CANCELLED`, Slot wieder `FREE`, Bestätigung der Stornierung.
4. Bestätigungs­bildschirm pollt `/api/appointments/[id]` und aktualisiert sich automatisch.

## Admin-Portal

```
/admin/login           → KOBIL Identity Login (Admin Client)
/admin                 → Heutige Termine, Status-Statistik
/admin/appointments    → Liste aller Termine, Status-Filter
/admin/appointments/[id] → Detail + Chat-Verlauf + Nachricht senden
/admin/slots           → Slot-Verwaltung pro Amt/Service (FREE ↔ BLOCKED)
```

## KOBIL-Chat-Integration: Anpassungs­punkte

Die exakten Mercury-Endpunkte können je nach Tenant variieren. Alle Aufrufe sind in **`lib/kobil/chat-client.ts`** isoliert. Falls die Pfad­struktur anders ist:

- `KOBIL_CHAT_SEND_PATH` Env-Variable überschreibt das Pfad-Template (default `/api/v1/services/{serviceUuid}/users/{userId}/messages`).
- Bei abweichenden Body-Schemas: nur die `send()`-Funktion in `chat-client.ts` anpassen.

Die Webhook-Verifikation läuft aktuell über einen geteilten Secret-Header (`x-webhook-secret`). Falls Mercury statt­dessen Signaturen ausstellt, in `app/api/admin/chat-webhook/route.ts` die `checkSecret`-Funktion ersetzen.

## Wichtige Verifikationen vor Produktiv­start

1. **OIDC-Claims**: Beim ersten Login sind ggf. `birthdate`, `address` nicht enthalten — abhängig von der Realm-Konfiguration (Scopes). `lib/auth/claims.ts` zeigt das Mapping.
2. **Mercury-User-ID**: Die App nimmt an, dass die `sub` aus dem User-OIDC identisch mit der Mercury-User-ID ist. Wenn nicht, in `app/api/appointments/route.ts` und im Webhook das Mapping anpassen.
3. **Webhook-Auth**: Mercury muss `x-webhook-secret` (oder `?secret=…`) mitsenden, sonst die `KOBIL_WEBHOOK_SECRET`-Env leer lassen (Achtung: dann ist der Webhook öffentlich).

## Skripte

| Script | Beschreibung |
|---|---|
| `npm run dev` | Dev-Server (Turbopack) |
| `npm run build` | `prisma generate && prisma migrate deploy && next build` |
| `npm run db:push` | Schema direkt in die DB pushen (kein Migrations­ordner) |
| `npm run db:migrate` | Neue Migration anlegen + ausführen |
| `npm run db:deploy` | Pending Migrationen ausführen (CI/Prod) |
| `npm run db:seed` | Stamm­daten einspielen |
| `npm run db:studio` | Prisma Studio öffnen |
| `npm run slots:generate` | Slots für die nächsten 14 Tage erzeugen |
