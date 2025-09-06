# Atacademy Analytics (Express)

## Schnellstart (lokal)

```bash
npm install
npm start
# öffne http://localhost:3000
```

## Deployment auf Render

1. Neues **Web Service** auf Render anlegen (Node).
2. Repository mit diesem Projekt verbinden.
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. Nach dem Deploy besuche deine Domain – Tracking läuft automatisch.

## Was wird getrackt?

- Timestamp, IP (für GeoIP), Country (via `geoip-lite`), Pfad, Referrer, User-Agent.
- Gespeichert in `data/stats.json` (letzte 200k Events).

## Admin-Seite

- `public/admin.html` → Charts (Chart.js via CDN) + Tabellen.
- Daten via `/api/stats`.

## Hinweis

- Auf GitHub Pages funktioniert das Tracking nicht, weil kein Backend vorhanden ist.
- Nach Migration zu Render werden die Events aufgezeichnet.
- Stripe machen
