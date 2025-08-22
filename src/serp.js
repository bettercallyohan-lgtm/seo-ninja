// src/serp.js — Recherche web (Serper.dev en priorité, fallback SerpAPI)
const axios = require('axios');

/**
 * Construit des requêtes (dorks) autour du mot-clé + footprints FR/EN.
 * Pas de restriction TLD ; on cible FR via gl/hl.
 */
function buildQueries(cfg) {
  const queries = [];
  const k = cfg.keyword || '';
  const fr = cfg.comment_footprints_fr || [];
  const en = cfg.comment_footprints_en || [];

  const esc = (s = '') => s.replace(/"/g, '\\"');
  const frPart = fr.length ? fr.map(f => `\\"${esc(f)}\\"`).join(' OR ') : '';
  const enPart = en.length ? en.map(f => `\\"${esc(f)}\\"`).join(' OR ') : '';

  if (frPart) queries.push(`"${esc(k)}" (${frPart})`);
  if (enPart) queries.push(`"${esc(k)}" (${enPart})`);
  if (queries.length === 0) queries.push(`"${esc(k)}"`); // fallback minimal

  return queries;
}

/**
 * Recherche principale.
 * - Priorité : SERPER_API_KEY (Serper.dev)
 * - Fallback : SERPAPI_API_KEY (SerpAPI)
 */
async function search(q, cfg) {
  const limit = Math.min((cfg?.search?.limit_per_query || 20), 100);

  if (process.env.SERPER_API_KEY) {
    return await searchWithSerper(q, limit);
  }
  if (process.env.SERPAPI_API_KEY) {
    return await searchWithSerpApi(q, limit);
  }

  throw new Error(
    'Aucune clé API trouvée. Ajoute SERPER_API_KEY (Serper.dev) ou SERPAPI_API_KEY (SerpAPI) dans Replit > Secrets.'
  );
}

/* ----------------------- Implémentations fournisseurs ---------------------- */

async function searchWithSerper(q, limit) {
  try {
    const { data } = await axios.post(
      'https://google.serper.dev/search',
      { q, gl: 'fr', hl: 'fr', num: limit },
      {
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const urls = [];
    if (Array.isArray(data?.organic)) {
      for (const it of data.organic) {
        if (it?.link) urls.push(it.link);
      }
    }
    return { urls: uniq(urls) };
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || 'Erreur Serper.dev';
    throw new Error(`Recherche Serper échouée pour "${q}": ${msg}`);
  }
}

async function searchWithSerpApi(q, limit) {
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(q)}&hl=fr&gl=fr&num=${limit}&api_key=${process.env.SERPAPI_API_KEY}`;
    const { data } = await axios.get(url, { timeout: 15000 });

    const urls = [];
    if (Array.isArray(data?.organic_results)) {
      for (const r of data.organic_results) {
        if (r?.link) urls.push(r.link);
      }
    }
    return { urls: uniq(urls) };
  } catch (err) {
    const msg = err?.response?.data?.error || err.message || 'Erreur SerpAPI';
    throw new Error(`Recherche SerpAPI échouée pour "${q}": ${msg}`);
  }
}

/* --------------------------------- Utils ---------------------------------- */
function uniq(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

module.exports = { buildQueries, search };
