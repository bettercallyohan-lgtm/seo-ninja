const fs = require('fs');
const path = require('path');
const PQueue = require('p-queue').default;
const { buildQueries, search } = require('./serp');
const { crawlAndDetect } = require('./detection');
const { exportToExcel } = require('./export');

async function runOnce(cfg) {
  const logs = [];
  function log(msg){ logs.push(msg); console.log(msg); }

  const queries = buildQueries(cfg);
  const uniq = Array.from(new Set(queries));
  log(`🔎 ${uniq.length} requête(s) générée(s).`);

  const queue = new PQueue({ concurrency: cfg.concurrency?.max_tasks || 3 });
  const results = [];
  const seen = new Set();

  for (const q of uniq) {
    queue.add(async () => {
      const dmin = cfg.concurrency?.min_delay_ms || 500;
      const dmax = cfg.concurrency?.max_delay_ms || 1500;
      const delay = dmin + Math.floor(Math.random() * (dmax - dmin));
      await new Promise(r => setTimeout(r, delay));

      const { urls } = await search(q, cfg);
      log(`• ${urls.length} URL(s) depuis la requête : ${q}`);

      for (const url of urls) {
        if (seen.has(url)) continue;
        seen.add(url);
        try {
          const row = await crawlAndDetect(url, q, cfg);
          if (!row) continue;

          // Ne garder que les pages en FR si possible
          const isFR = (row.language_detected || '').startsWith('fr');
          if (!isFR) continue;

          if (row.quality_score >= (cfg.scoring?.threshold ?? 60)) {
            results.push(row);
            log(`✅ ${row.quality_score} | ${row.url}`);
          } else {
            log(`➖ ${row.quality_score} | ${row.url}`);
          }
        } catch (e) {
          log(`⚠️ ${url}: ${e.message}`);
        }
      }
    });
  }

  await queue.onIdle();

  const outPath = path.resolve(__dirname, '..', (cfg.export?.path || './output/spots.xlsx'));
  await exportToExcel(results, outPath);
  return { outPath, count: results.length, logs };
}

module.exports = { runOnce };
