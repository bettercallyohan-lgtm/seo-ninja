// server.js
// Point d’entrée principal de l’application SEO Ninja

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

// Nos modules internes
const { runSearch } = require("./src/app");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // pour servir index.html

// Route principale pour lancer la recherche
app.post("/search", async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword || keyword.trim() === "") {
      return res.status(400).json({ error: "Keyword manquant." });
    }

    console.log(`🔎 Recherche lancée avec le mot-clé : ${keyword}`);

    // On lance le process défini dans src/app.js
    const results = await runSearch(keyword);

    res.json({ success: true, results });
  } catch (err) {
    console.error("❌ Erreur dans /search :", err.message);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur SEO Ninja lancé sur http://localhost:${PORT}`);
});
