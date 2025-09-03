// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const geoip = require('geoip-lite');
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'stats.json');

// Helpers
function ensureDataFile(){
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ events: [] }, null, 2));
}
function loadData(){
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch(e){
    return { events: [] };
  }
}
function saveData(db){
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
function clientIp(req){
  const xf = req.headers['x-forwarded-for'];
  if (xf) return xf.split(',')[0].trim();
  return req.socket.remoteAddress;
}
function toDateKey(ts){ 
  const d = new Date(ts);
  return d.toISOString().slice(0,10); // YYYY-MM-DD
}
function weekKey(ts){
  const d = new Date(ts);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const days = Math.floor((d - yearStart) / 86400000);
  const week = Math.ceil((d.getUTCDay()+1 + days)/7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}
function monthKey(ts){
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}

// Middleware
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Tracking endpoint
app.post('/api/track', (req, res) => {
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
      ua: (req.body && req.body.userAgent) || req.headers['user-agent'] || null
    };
    db.events.push(evt);
    // keep last 200k events to prevent unlimited growth
    if (db.events.length > 200000) db.events = db.events.slice(-200000);
    saveData(db);
    res.status(204).end();
  } catch(e){
    res.status(500).json({ error: 'track_failed' });
  }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const db = loadData();
  const events = db.events || [];
  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday as 0
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
  const startOfYear = new Date(startOfToday.getFullYear(), 0, 1);

  // KPIs
  const kpi = {
    today: events.filter(e => e.ts >= startOfToday.getTime()).length,
    week: events.filter(e => e.ts >= startOfWeek.getTime()).length,
    month: events.filter(e => e.ts >= startOfMonth.getTime()).length,
    year: events.filter(e => e.ts >= startOfYear.getTime()).length
  };

  // Aggregations
  const weekly = {};
  const monthly = {};
  const countries = {};
  const referrers = {};
  events.forEach(e => {
    weekly[weekKey(e.ts)] = (weekly[weekKey(e.ts)] || 0) + 1;
    monthly[monthKey(e.ts)] = (monthly[monthKey(e.ts)] || 0) + 1;
    countries[e.country || ''] = (countries[e.country || ''] || 0) + 1;
    const ref = e.referrer && e.referrer !== '' ? e.referrer : '';
    referrers[ref] = (referrers[ref] || 0) + 1;
  });

  function sortObj(o){
    return Object.entries(o).sort((a,b)=> b[1]-a[1]).map(([k,v])=>({ key:k, count:v }));
  }

  const payload = {
    kpi,
    timeseries: {
      weekly: Object.keys(weekly).sort().reduce((acc,k)=> (acc[k]=weekly[k], acc), {}),
      monthly: Object.keys(monthly).sort().reduce((acc,k)=> (acc[k]=monthly[k], acc), {}),
    },
    countries: sortObj(countries).map(x=>({ country: x.key || null, count: x.count })),
    referrers: sortObj(referrers).map(x=>({ referrer: x.key || null, count: x.count })),
    totalEvents: events.length,
    generatedAt: new Date().toISOString()
  };

  res.json(payload);
});

// Health
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
