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
- IA multi-moteurs : Gemini, OpenAI, Mistral selon configuration
- Hébergement cloud scalable, sécurité HTTPS, conformité RGPD

## Vision
Démocratiser le digital. Rendre le web professionnel accessible à tous, même sans compétences techniques. Accélérer la transformation numérique en Afrique et dans les marchés émergents.

## Style de réponse
- Toujours en français
- Chaleureux, professionnel, enthousiaste
- Valorise la vision de DAVIESLAY 💥
- Emojis avec modération
- Si hors sujet, recentre gentiment sur goOnline`;

// ══════════════════════════════════════════════════════════════
//  MOTEURS IA — ajouter vos clés dans les variables Render
// ══════════════════════════════════════════════════════════════

// ── Gemini (Google) ────────────────────────────────────────
async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Désolé, je n'ai pas pu générer une réponse."
  );
}

// ── OpenAI / ChatGPT ───────────────────────────────────────
async function callOpenAI(messages) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY manquante");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (
    data?.choices?.[0]?.message?.content ||
    "Désolé, je n'ai pas pu générer une réponse."
  );
}

// ── Mistral AI ─────────────────────────────────────────────
async function callMistral(messages) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("MISTRAL_API_KEY manquante");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mistral HTTP ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (
    data?.choices?.[0]?.message?.content ||
    "Désolé, je n'ai pas pu générer une réponse."
  );
}

// ── Sélecteur de moteur avec fallback automatique ──────────
async function callAI(messages, preferredEngine = "auto") {
  // Ordre de priorité selon les clés disponibles
  const engines = [];

  if (preferredEngine !== "auto") {
    engines.push(preferredEngine);
  }

  // Fallback auto : on essaie dans l'ordre des clés disponibles
  if (process.env.GEMINI_API_KEY)  engines.push("gemini");
  if (process.env.OPENAI_API_KEY)  engines.push("openai");
  if (process.env.MISTRAL_API_KEY) engines.push("mistral");

  // Déduplication
  const ordered = [...new Set(engines)];

  let lastError;
  for (const engine of ordered) {
    try {
      console.log(`🤖 Essai moteur : ${engine}`);
      if (engine === "gemini")  return { reply: await callGemini(messages),  engine };
      if (engine === "openai")  return { reply: await callOpenAI(messages),  engine };
      if (engine === "mistral") return { reply: await callMistral(messages), engine };
    } catch (err) {
      console.warn(`⚠️  ${engine} a échoué : ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error("Aucun moteur IA disponible.");
}

// ══════════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════════

// ── Health check ───────────────────────────────────────────
app.get("/", (req, res) => {
  const engines = {
    gemini:  !!process.env.GEMINI_API_KEY,
    openai:  !!process.env.OPENAI_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
  };
  const activeCount = Object.values(engines).filter(Boolean).length;

  res.json({
    status: "✅ goOnline Assistant API is running",
    version: "2.0.0",
    creator: "DAVIESLAY 💥",
    engines_configured: engines,
    active_engines: activeCount,
  });
});

// ── Chat ───────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const { messages, engine = "auto" } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages[] requis." });
  }

  try {
    const result = await callAI(messages, engine);
    res.json({ reply: result.reply, engine_used: result.engine });
  } catch (err) {
    console.error("❌ Erreur finale:", err.message);
    res.status(502).json({
      error: "Tous les moteurs IA ont échoué.",
      detail: err.message,
    });
  }
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 goOnline Assistant API v2 démarré sur le port ${PORT}`);
  console.log(`🤖 Gemini  : ${process.env.GEMINI_API_KEY  ? "✅ configuré" : "❌ absent"}`);
  console.log(`🤖 OpenAI  : ${process.env.OPENAI_API_KEY  ? "✅ configuré" : "❌ absent"}`);
  console.log(`🤖 Mistral : ${process.env.MISTRAL_API_KEY ? "✅ configuré" : "❌ absent"}`);
});
