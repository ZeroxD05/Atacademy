// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const geoip = require("geoip-lite");
const app = express();

// === Simple Auth Setup ===
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// In-memory token store (clears on server restart)
const ACTIVE_TOKENS = new Set();

// Credentials from env with safe defaults (change in production)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ata2005hh@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Atailayda05";

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const obj = {};
  raw.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      obj[k] = decodeURIComponent(v);
    }
  });
  return obj;
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies.auth;
  if (token && ACTIVE_TOKENS.has(token)) return next();
  // for API requests return 401 JSON, for pages redirect
  if (req.path.startsWith("/api/"))
    return res.status(401).json({ error: "unauthorized" });
  return res.redirect("/login.html");
}

// Login routes
app.get("/login", (req, res) => res.redirect("/login.html"));

app.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = require("crypto").randomBytes(24).toString("hex");
    ACTIVE_TOKENS.add(token);
    res.cookie ? null : null; // no cookie-parser; set manually
    res.setHeader(
      "Set-Cookie",
      `auth=${encodeURIComponent(
        token
      )}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`
    );
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: "invalid_credentials" });
});

app.post("/logout", (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.auth;
  if (token) ACTIVE_TOKENS.delete(token);
  res.setHeader(
    "Set-Cookie",
    "auth=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0"
  );
  res.json({ ok: true });
});

// Protect admin UI route
app.get("/admin", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
// Prevent direct access to raw file, redirect to /admin
app.get("/admin.html", (req, res) => res.redirect("/admin"));

const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "stats.json");

// Helpers
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE))
    fs.writeFileSync(DATA_FILE, JSON.stringify({ events: [] }, null, 2));
}
function loadData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return { events: [] };
  }
}
function saveData(db) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return xf.split(",")[0].trim();
  return req.socket.remoteAddress;
}
function toDateKey(ts) {
  const d = new Date(ts);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function weekKey(ts) {
  const d = new Date(ts);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const days = Math.floor((d - yearStart) / 86400000);
  const week = Math.ceil((d.getUTCDay() + 1 + days) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

// Middleware
app.use(express.json({ limit: "64kb" }));
app.use(
  express.static(path.join(__dirname, "public"), { extensions: ["html"] })
);

// Tracking endpoint
app.post("/api/track", (req, res) => {
  try {
    const db = loadData();
    const now = Date.now();
    const ip = clientIp(req);
    const geo = geoip.lookup(ip) || {};
    const country = geo.country || null;

    const evt = {
      ts: now,
      ip,
      country,
      path: (req.body && req.body.path) || null,
      referrer: (req.body && req.body.referrer) || null,
      ua: (req.body && req.body.userAgent) || req.headers["user-agent"] || null,
    };
    db.events.push(evt);
    // keep last 200k events to prevent unlimited growth
    if (db.events.length > 200000) db.events = db.events.slice(-200000);
    saveData(db);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: "track_failed" });
  }
});

// Stats endpoint
app.get("/api/stats", requireAuth, (req, res) => {
  const db = loadData();
  const events = db.events || [];
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday as 0
  const startOfMonth = new Date(
    startOfToday.getFullYear(),
    startOfToday.getMonth(),
    1
  );
  const startOfYear = new Date(startOfToday.getFullYear(), 0, 1);

  // KPIs
  const kpi = {
    today: events.filter((e) => e.ts >= startOfToday.getTime()).length,
    week: events.filter((e) => e.ts >= startOfWeek.getTime()).length,
    month: events.filter((e) => e.ts >= startOfMonth.getTime()).length,
    year: events.filter((e) => e.ts >= startOfYear.getTime()).length,
  };

  // Aggregations
  const weekly = {};
  const monthly = {};
  const countries = {};
  const referrers = {};
  events.forEach((e) => {
    weekly[weekKey(e.ts)] = (weekly[weekKey(e.ts)] || 0) + 1;
    monthly[monthKey(e.ts)] = (monthly[monthKey(e.ts)] || 0) + 1;
    countries[e.country || ""] = (countries[e.country || ""] || 0) + 1;
    const ref = e.referrer && e.referrer !== "" ? e.referrer : "";
    referrers[ref] = (referrers[ref] || 0) + 1;
  });

  function sortObj(o) {
    return Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ key: k, count: v }));
  }

  const payload = {
    kpi,
    timeseries: {
      weekly: Object.keys(weekly)
        .sort()
        .reduce((acc, k) => ((acc[k] = weekly[k]), acc), {}),
      monthly: Object.keys(monthly)
        .sort()
        .reduce((acc, k) => ((acc[k] = monthly[k]), acc), {}),
    },
    countries: sortObj(countries).map((x) => ({
      country: x.key || null,
      count: x.count,
    })),
    referrers: sortObj(referrers).map((x) => ({
      referrer: x.key || null,
      count: x.count,
    })),
    totalEvents: events.length,
    generatedAt: new Date().toISOString(),
  };

  res.json(payload);
});

// Health
app.get("/api/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
