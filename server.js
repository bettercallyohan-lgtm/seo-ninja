require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const YAML = require('yaml');
const { runOnce } = require('./src/app');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares pour JSON et formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques (sert index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Log simple pour debug
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Page d'accueil (au cas où)
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Si quelqu’un fait GET /run par erreur, on explique :
app.get('/run', (_req, res) => {
  res.status(405).send('<p>Cette URL accepte uniquement POST. Retournez à <a href="/">l’interface</a> et cliquez sur le bouton Run.</p>');
});

// POST /run = lance la recherche
app.post('/run', async (req, res) => {
  try {
    const keyword = (req.body.keyword || '').trim();
    if (!keyword) return res.status(400).send('<p>Mot-clé manquant. <a href="/">Retour</a></p>');

    // charge config.yaml et remplace le keyword
    const cfgPath = path.join(__dirname, 'config.yaml');
    const cfg = YAML.parse(fs.readFileSync(cfgPath, 'utf8'));
    cfg.keyword = keyword;

    const { outPath, count, logs } = await runOnce(cfg);

    const rel = path.relative(path.join(__dirname), outPath).replace(/\\/g,'/');
    const html = `
      <!doctype html><html lang="fr"><meta charset="utf-8">
      <title>Résultats</title>
      <body style="font-family:system-ui;padding:24px;max-width:780px;margin:auto">
      <h2>Terminé ✅</h2>
      <p><strong>Mot-clé :</strong> ${escapeHtml(keyword)}</p>
      <p><strong>Spots retenus :</strong> ${count}</p>
      <p><a class="button" style="display:inline-block;padding:10px 14px;background:#0a7a2d;color:#fff;text-decoration:none;border-radius:8px" href="/download?f=${encodeURIComponent(rel)}">Télécharger spots.xlsx</a></p>
      <div style="border:1px solid #eee;border-radius:10px;padding:12px;margin-top:16px">
        <div style="color:#666;font-size:13px;margin-bottom:6px">Journal</div>
        <pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px">${escapeHtml(logs.join('\n'))}</pre>
      </div>
      <p style="margin-top:20px"><a href="/">⟵ Revenir</a></p>
      </body></html>
    `;
    res.send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send(`<p>Erreur: ${escapeHtml(e.message)}. <a href="/">Retour</a></p>`);
  }
});

app.get('/download', (req, res) => {
  const rel = req.query.f || '';
  const abs = path.join(__dirname, rel);
  if (!fs.existsSync(abs)) return res.status(404).send('Fichier introuvable.');
  res.download(abs, 'spots.xlsx');
});

const server = app.listen(PORT, () => {
  const actual = server.address().port;
  console.log(`🚀 Serveur SEO Ninja lancé sur http://localhost:${actual}`);
});

function escapeHtml(s='') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
