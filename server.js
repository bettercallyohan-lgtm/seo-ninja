// server.js — DIAG + PROD v4 (accepte POST et GET /run)
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const YAML = require('yaml');
const { runOnce } = require('./src/app');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 SEO-Ninja server.js chargé (v4)');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// log toutes les requêtes
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Health check : doit répondre "PONG v4"
app.get('/__ping', (_req, res) => res.type('text/plain').send('PONG v4'));

// Page d’accueil
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handler commun pour /run (GET ou POST)
async function handleRun(req, res) {
  try {
    const keyword =
      (req.body && typeof req.body.keyword === 'string' && req.body.keyword.trim()) ||
      (typeof req.query.keyword === 'string' && req.query.keyword.trim()) ||
      '';

    if (!keyword) {
      return res
        .status(400)
        .send('<p>Mot-clé manquant. <a href="/">Retour</a></p>');
    }

    const cfgPath = path.join(__dirname, 'config.yaml');
    if (!fs.existsSync(cfgPath)) throw new Error('config.yaml introuvable à la racine.');
    const cfg = YAML.parse(fs.readFileSync(cfgPath, 'utf8'));
    cfg.keyword = keyword;

    const { outPath, count, logs } = await runOnce(cfg);
    const rel = path.relative(__dirname, outPath).replace(/\\/g, '/');

    res.send(`<!doctype html><meta charset="utf-8">
    <body style="font-family:system-ui;padding:24px;max-width:780px;margin:auto">
      <h2>Terminé ✅</h2>
      <p><b>Mot-clé :</b> ${escapeHtml(keyword)}<br><b>Spots retenus :</b> ${count}</p>
      <p><a href="/download?f=${encodeURIComponent(rel)}"
            style="display:inline-block;padding:10px 14px;background:#0a7a2d;color:#fff;border-radius:8px;text-decoration:none">
            Télécharger spots.xlsx</a></p>
      <pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px;color:#444">${escapeHtml(logs.join('\n'))}</pre>
      <p><a href="/">⟵ Revenir</a></p>
    </body>`);
  } catch (e) {
    console.error(e);
    res.status(500).send(`<p>Erreur: ${escapeHtml(e.message)}. <a href="/">Retour</a></p>`);
  }
}

// Accepte les DEUX méthodes sur /run
app.post('/run', handleRun);
app.get('/run', handleRun);

// Téléchargement du fichier généré
app.get('/download', (req, res) => {
  const rel = req.query.f || '';
  const abs = path.join(__dirname, rel);
  if (!fs.existsSync(abs)) return res.status(404).send('Fichier introuvable.');
  res.download(abs, 'spots.xlsx');
});

// catch-all optionnel : renvoie l'index si route inconnue
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`🚀 SEO Ninja v4 démarré sur port ${server.address().port}`);
});

function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
