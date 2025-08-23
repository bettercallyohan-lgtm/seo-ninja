// server.js — MODE DIAGNOSTIC MINIMAL
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Petite page de test (champ + bouton)
app.get('/', (_req, res) => {
  res.send(`<!doctype html><meta charset="utf-8">
  <body style="font-family:sans-serif;padding:24px">
    <h1>Test POST /run</h1>
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
        out.textContent = 'Envoi...';
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

// La route à tester
app.post('/run', (req, res) => {
  const keyword = (req.body?.keyword || '').trim();
  console.log('POST /run reçu, keyword =', keyword);
  res.type('text/plain').send(`OK ✅ POST /run reçu.\nkeyword = "${keyword}"`);
});

// Sécurité : message clair si on tape /run en GET
app.get('/run', (_req, res) => {
  res.status(405).send('Cette URL accepte uniquement POST. Retour à /.');
});

const server = app.listen(PORT, () => {
  console.log('🚀 Serveur DIAG sur port', server.address().port);
});
