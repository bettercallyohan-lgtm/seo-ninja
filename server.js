// server.js
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { runOnce } = require("./src/app"); // 👈 correction ici

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/search", async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword || keyword.trim() === "") {
      return res.status(400).json({ error: "Keyword manquant." });
    }

    console.log(`🔎 Recherche lancée avec le mot-clé : ${keyword}`);

    // Ici tu appelles runOnce avec une config
    const results = await runOnce({
      keyword,
      concurrency: { max_tasks: 3, min_delay_ms: 500, max_delay_ms: 1500 },
      scoring: { threshold: 60 },
      export: { path: "./output/spots.xlsx" }
    });

    res.json({ success: true, results });
  } catch (err) {
    console.error("❌ Erreur dans /search :", err.message);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur SEO Ninja lancé sur http://localhost:${PORT}`);
});
