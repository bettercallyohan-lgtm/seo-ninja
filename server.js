// server.js — version simple avec /run
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const YAML = require('yaml');
const { runOnce } = require('./src/app'); // doit exporter runOnce

const app = express();
const PORT = process.env.PORT || 3000;

// pour récupérer le champ du <form>
app.use(express.urlencoded({ extended: true }));
// servir la page public/index.html
app.use(express.static(path.join(__dirname, 'public')));

// Page d’accueil (UI keyword + bouton Run)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Traitement du formulaire
app.post('/run', async (req, res) => {
  const keyword = (req.body.keyword || '').trim();
  if (!keyword) {
    return res.status(400).send('<p>Mot-clé manquant. <a href="/">Retour</a></p>');
  }

  try {
    // lire config.yaml et écraser le keyword
    const cfgPath = path.join(__dirname, 'config.yaml');
    const cfg = YAML.parse(fs.readFileSync(cfgPath, 'utf8'));
    cfg.keyword = keyword;

    const { outPath, count, logs } = await runOnce(cfg);

    const rel = path.relative(__dirname, outPath).replace(/\\/g, '/');
    res.send(`
      <!doctype html><meta charset="utf-8">
      <body style="font-family:system-ui;max-width:780px;margin:24px auto;padding:16px">
        <h2>Terminé ✅</h2>
        <p><b>Mot-clé :</b> ${escapeHtml(keyword)}<br>
           <b>Spots retenus :</b> ${count}</p>
        <p><a href="/download?f=${encodeURIComponent(rel)}"
              style="display:inline-block;padding:10px 14px;background:#0a7a2d;color:#fff;border-radius:8px;text-decoration:none">
              Télécharger spots.xlsx</a></p>
        <pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px;color:#444">${escapeHtml(logs.join('\n'))}</pre>
        <p><a href="/">⟵ Revenir</a></p>
      </body>
    `);
  } catch (e) {
    console.error(e);
    res.status(500).send(`<p>Erreur: ${escapeHtml(e.message)}. <a href="/">Retour</a></p>`);
  }
});

// Téléchargement du fichier généré
app.get('/download', (req, res) => {
  const rel = req.query.f || '';
  const abs = path.join(__dirname, rel);
  if (!fs.existsSync(abs)) return res.status(404).send('Fichier introuvable.');
  res.download(abs, 'spots.xlsx');
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur SEO Ninja lancé sur http://localhost:${PORT}`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} déjà utilisé. Ne lance pas Run ET "npm start" en même temps.`);
    process.exit(1);
  } else {
    console.error(err);
  }
});

function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
