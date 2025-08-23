// server.js — SEO Ninja (routes /, /run, /search, /download)
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const YAML = require('yaml');
const { runOnce } = require('./src/app');

const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(express.urlencoded({ extended: true })); // pour <form method="post">
app.use(express.json());                          // pour JSON (route /search)
app.use(express.static(path.join(__dirname, 'public')));

// page d'accueil -> sert public/index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- ROUTE FORMULAIRE (HTML) ---
// Ta page public/index.html doit avoir: <form method="post" action="/run"> + input name="keyword"
app.post('/run', async (req, res) => {
  const keyword = (req.body.keyword || '').trim();
  if (!keyword) return res.status(400).send('<p>Mot-clé manquant. <a href="/">Retour</a></p>');

  try {
    // charger config.yaml et écraser le keyword
    const cfgPath = path.join(__dirname, 'config.yaml');
    const cfg = YAML.parse(fs.readFileSync(cfgPath, 'utf8'));
    cfg.keyword = keyword;

    const { outPath, count, logs } = await runOnce(cfg);

    const rel = path.relative(__dirname, outPath).replace(/\\/g, '/');
    const html = `
      <!doctype html><html lang="fr"><meta charset="utf-8">
      <title>Résultats</title>
      <body style="font-family:system-ui;padding:24px;max-width:780px;margin:auto">
        <h2>Terminé ✅</h2>
        <p><strong>Mot-clé :</strong> ${escapeHtml(keyword)}</p>
        <p><strong>Spots retenus :</strong> ${count}</p>
        <p><a style="display:inline-block;padding:10px 14px;background:#0a7a2d;color:#fff;text-decoration:none;border-radius:8px"
              href="/download?f=${encodeURIComponent(rel)}">Télécharger spots.xlsx</a></p>
        <div style="border:1px solid #eee;border-radius:10px;padding:12px;margin-top:16px">
          <div style="color:#666;font-size:13px;margin-bottom:6px">Journal</div>
          <pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px">
${escapeHtml(logs.join('\n'))}</pre>
        </div>
        <p style="margin-top:20px"><a href="/">⟵ Revenir</a></p>
      </body></html>`;
    res.send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send(`<p>Erreur: ${escapeHtml(e.message)}. <a href="/">Retour</a></p>`);
  }
});

// --- ROUTE API (JSON) ---
// Permet de lancer via fetch/axios: POST /search { "keyword": "..." }
app.post('/search', async (req, res) => {
  const keyword = (req.body.keyword || '').trim();
  if (!keyword) return res.status(400).json({ error: 'Mot-clé manquant.' });

  try {
    const cfgPath = path.join(__dirname, 'config.yaml');
    const cfg = YAML.parse(fs.readFileSync(cfgPath, 'utf8'));
    cfg.keyword = keyword;

    const { outPath, count, logs } = await runOnce(cfg);
    res.json({ success: true, count, outPath, logs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erreur interne' });
  }
});

// téléchargement du fichier Excel généré
app.get('/download', (req, res) => {
  const rel = req.query.f || '';
  const abs = path.join(__dirname, rel);
  if (!fs.existsSync(abs)) return res.status(404).send('Fichier introuvable.');
  res.download(abs, 'spots.xlsx');
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur SEO Ninja lancé sur http://localhost:${PORT}`);
});

function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
