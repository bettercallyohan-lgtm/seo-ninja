// server.js — DIAG V5 : impossible d'avoir encore "Cannot POST /run" si ce fichier tourne
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const START = new Date().toISOString();
console.log('🔧 DIAG V5 chargé à', START);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// log TOUTES les requêtes
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// 1) Ping pour prouver que CE serveur tourne
app.get('/__ping', (_req, res) => {
  res.type('text/plain').send(`PONG DIAG V5 @ ${START}`);
});

// 2) Page de test très simple
app.get('/', (_req, res) => {
  res.send(`<!doctype html><meta charset="utf-8">
  <body style="font-family:sans-serif;padding:24px">
    <h1>DIAG V5 — Test /run</h1>
    <p>Chargé à: ${START}</p>
    <div style="display:flex;gap:8px">
      <input id="kw" placeholder="mot-clé" style="padding:8px;flex:1">
      <button id="go" style="padding:8px 12px">POST /run</button>
      <a id="go2" href="#" style="padding:8px 12px;background:#eee;border:1px solid #ccc;border-radius:6px;text-decoration:none">GET /run</a>
    </div>
    <pre id="out" style="margin-top:12px;white-space:pre-wrap"></pre>
    <script>
      const out = document.getElementById('out');
      document.getElementById('go').onclick = async () => {
        const keyword = document.getElementById('kw').value.trim();
        out.textContent = 'POST /run...';
        const r = await fetch('/run', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ keyword }) });
        out.textContent = await r.text();
      };
      document.getElementById('go2').onclick = async (e) => {
        e.preventDefault();
        const keyword = encodeURIComponent(document.getElementById('kw').value.trim());
        out.textContent = 'GET /run...';
        const r = await fetch('/run?keyword=' + keyword);
        out.textContent = await r.text();
      };
    </script>
  </body>`);
});

// 3) /run accepte TOUTES les méthodes (GET/POST/PUT/…)
app.all('/run', (req, res) => {
  const method = req.method;
  const kw = (req.body && req.body.keyword) || req.query.keyword || '';
  console.log(`➡️ /run reçu | method=${method} | keyword="${kw}"`);
  res.type('text/plain').send(`OK DIAG V5 — /run reçu
method=${method}
keyword="${kw}"`);
});

// 4) 404 custom : si tu vois encore "Cannot POST /run", ça ne vient PAS de ce serveur
app.use((req, res) => {
  res.status(404).type('text/plain').send(`404 DIAG V5 — ${req.method} ${req.url}`);
});

const server = app.listen(PORT, () => {
  console.log(`🚀 DIAG V5 démarré sur port ${server.address().port}`);
});
