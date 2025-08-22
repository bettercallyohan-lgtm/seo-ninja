// src/serp.js — Serper.dev (Google Search)
const axios = require('axios');

// Construit les requêtes (keyword + footprints FR/EN)
function buildQueries(cfg){
  const queries=[], k=cfg.keyword||'';
  const fr=cfg.comment_footprints_fr||[], en=cfg.comment_footprints_en||[];
  const esc=s=> (s||'').replace(/"/g,'\\"');
  const frPart=fr.length? fr.map(f=>`\\"${esc(f)}\\"`).join(' OR '):'';
  const enPart=en.length? en.map(f=>`\\"${esc(f)}\\"`).join(' OR '):'';
  if(frPart) queries.push(`"${esc(k)}" (${frPart})`);
  if(enPart) queries.push(`"${esc(k)}" (${enPart})`);
  if(!queries.length) queries.push(`"${esc(k)}"`);
  return queries;
}

async function search(q, cfg){
  const key=process.env.SERPER_API_KEY;
  if(!key) throw new Error('SERPER_API_KEY manquant (ajoutez-le dans Replit > Secrets).');

  const limit=Math.min(cfg.search?.limit_per_query||20,100);
  const {data}=await axios.post(
    'https://google.serper.dev/search',
    { q, gl:'fr', hl:'fr', num: limit },
    { headers:{ 'X-API-KEY':key, 'Content-Type':'application/json' }, timeout:15000 }
  );

  const urls=[];
  if(Array.isArray(data?.organic)){
    for(const it of data.organic){
      if(it.link) urls.push(it.link);
    }
  }
  return { urls };
}

module.exports={ buildQueries, search };
