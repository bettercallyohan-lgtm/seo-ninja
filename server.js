// server.js — DIAG v3 : prouve qu'on tourne bien & que POST /run existe
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 DIAG server.js chargé (v3)');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// log chaque requête (méthode + url)
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// 1) Ping simple pour vérifier que c'est CE serveur qui répond
app.get('/__ping', (_req, res) => {
  res.type('text/plain').send('PONG ✅ (DIAG v3)');
});

// 2) Page test très simple
app.get('/', (_req, res) => {
  res.send(`<!doctype html><meta charset="utf-8">
  <body style="font-family:sans-serif;padding:24px">
    <h1>Test POST /run (DIAG v3)</h1>
    <div style="display:flex;gap:8px">
      <input id="kw" placeholder="mot-clé" style="padding:8px;flex:1">
      <button id="go" style="padding:8px 12px">Run</button>
    </div>
    <pre id="out" style="margin-top:12px;white-space:pre-wrap"></pre>
    <script>
      const go = document.getElementById('go');
      const kw = document.getElementById('kw');
      const out = document.getElementById('out');
      go.onclick = async () => {
        const keyword = (kw.value||'').trim();
        out.textContent = 'Envoi POST /run...';
        try {
          const r = await fetch('/run', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ keyword })
          });
          const txt = await r.text();
          out.textContent = txt;
        } catch(e){ out.textContent = 'Erreur: '+e.message; }
      };
    </script>
  </body>`);
});

// 3) La route qu'on teste
app.post('/run', (req, res) => {
  const keyword = (req.body?.keyword || '').trim();
  console.log('➡️  POST /run reçu, keyword =', keyword);
  res.type('text/plain').send(`OK ✅ POST /run.\nkeyword = "${keyword}"`);
});

// 4) Si quelqu’un tape GET /run dans la barre d’adresse :
app.get('/run', (_req, res) => {
  res.status(405).type('text/plain').send('Cette URL accepte uniquement POST. Retour à /.');
});

const server = app.listen(PORT, () => {
  console.log('🚀 DIAG v3 démarré sur port', server.address().port);
});
