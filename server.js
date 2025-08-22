// server.js — point d'entrée SEO Ninja
require('dotenv').config();
const express = require("express");
const path = require("path");

// Nos modules internes
const { runSearch } = require("./src/app");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json()); // remplace body-parser
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // sert index.html et assets

// Page d'accueil (optionnel si tu sers déjà /public)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API: lancer la recherche
app.post("/search", async (req, res) => {
  try {
    const keyword = (req.body.keyword || "").trim();
    if (!keyword) {
      return res.status(400).json({ error: "Keyword manquant." });
    }

    console.log(`🔎 Recherche lancée avec le mot-clé : ${keyword}`);
    const results = await runSearch(keyword); // doit être exporté depuis src/app.js

    res.json({ success: true, results });
  } catch (err) {
    console.error("❌ Erreur dans /search :", err);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur SEO Ninja lancé sur http://localhost:${PORT}`);
});
