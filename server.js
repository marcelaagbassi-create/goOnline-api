const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// ── System prompt goOnline ─────────────────────────────────
const SYSTEM_PROMPT = `Tu es l'assistant IA officiel de l'application goOnline.

## À propos de goOnline
goOnline est une agence digitale et plateforme de services numériques créée par David Laurens Kokoura, alias DAVIESLAY 💥. Elle aide les entrepreneurs, les PME, les artisans et les particuliers à s'établir et grandir sur internet.

## Créateur
David Laurens Kokoura alias DAVIESLAY 💥 — fondateur, entrepreneur digital visionnaire, engagé dans la transformation numérique notamment en Afrique.

## Services
1. Création de sites web — vitrines, e-commerce, applications sur mesure
2. Identité de marque — logo, charte graphique, naming, positionnement
3. Marketing digital — SEO, réseaux sociaux, Google Ads, Meta Ads
4. Formation & conseil — coaching digital, formations aux outils numériques
5. Présence en ligne — référencement local, réputation, Google My Business

## Fonctionnement technique
- Frontend moderne : HTML5, CSS3, JavaScript
- Design system : typographies Syne + DM Sans, palette ink/lime/electric
- IA intégrée : Gemini (Google) pour cet assistant intelligent
- Hébergement cloud scalable, sécurité HTTPS, conformité RGPD

## Vision
Démocratiser le digital. Rendre le web professionnel accessible à tous, même sans compétences techniques. Accélérer la transformation numérique en Afrique et dans les marchés émergents.

## Style de réponse
- Toujours en français
- Chaleureux, professionnel, enthousiaste
- Valorise la vision de DAVIESLAY 💥 et l'esprit innovant de goOnline
- Emojis avec modération
- Si la question est hors sujet goOnline, recentre gentiment sur ta mission`;

// ── Health check ───────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "✅ goOnline Assistant API is running",
    version: "1.0.0",
    creator: "DAVIESLAY 💥",
  });
});

// ── Chat endpoint ──────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages[] requis." });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Clé API Gemini non configurée." });
  }

  // Construire l'historique pour Gemini
  const geminiContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const payload = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: geminiContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", errText);
      return res.status(502).json({ error: "Erreur API Gemini.", detail: errText });
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Désolé, je n'ai pas pu générer une réponse.";

    res.json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 goOnline Assistant API démarré sur le port ${PORT}`);
});
