const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS complet ───────────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json());

// ── System prompt ──────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es l'assistant IA officiel de l'application goOnline.

## À propos de goOnline
goOnline est une agence digitale créée par David Laurens Kokoura, alias DAVIESLAY 💥. Elle aide entrepreneurs, PME et particuliers à s'établir et grandir sur internet.

## Créateur
David Laurens Kokoura alias DAVIESLAY 💥 — fondateur, entrepreneur digital visionnaire, engagé dans la transformation numérique en Afrique.

## Services
1. Création de sites web — vitrines, e-commerce, applications sur mesure
2. Identité de marque — logo, charte graphique, naming
3. Marketing digital — SEO, réseaux sociaux, Google Ads, Meta Ads
4. Formation & conseil digital
5. Présence en ligne — référencement local, réputation

## Vision
Démocratiser le digital. Rendre le web accessible à tous. Accélérer la transformation numérique en Afrique.

## Style
- Toujours en français
- Chaleureux, professionnel, enthousiaste
- Valorise DAVIESLAY 💥 et goOnline
- Emojis avec modération`;

// ── Gemini — liste de modèles à essayer dans l'ordre ──────
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-pro",
];

async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let lastErr;
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`  → Essai modèle Gemini : ${model}`);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
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

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error?.message || `HTTP ${res.status}`;
        console.warn(`  ✗ ${model} : ${errMsg}`);
        lastErr = new Error(errMsg);
        continue; // essayer le modèle suivant
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) {
        console.warn(`  ✗ ${model} : réponse vide`);
        lastErr = new Error("Réponse vide");
        continue;
      }

      console.log(`  ✓ ${model} OK`);
      return reply;
    } catch (e) {
      console.warn(`  ✗ ${model} exception : ${e.message}`);
      lastErr = e;
    }
  }
  throw lastErr || new Error("Tous les modèles Gemini ont échoué");
}

// ── OpenAI (optionnel) ─────────────────────────────────────
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
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "Pas de réponse.";
}

// ── Mistral (optionnel) ────────────────────────────────────
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
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Mistral HTTP ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "Pas de réponse.";
}

// ── Routeur avec fallback auto ─────────────────────────────
async function callAI(messages, preferred = "auto") {
  const engines = [];
  if (preferred !== "auto") engines.push(preferred);
  if (process.env.GEMINI_API_KEY)  engines.push("gemini");
  if (process.env.OPENAI_API_KEY)  engines.push("openai");
  if (process.env.MISTRAL_API_KEY) engines.push("mistral");

  const ordered = [...new Set(engines)];
  if (ordered.length === 0) throw new Error("Aucune clé API configurée dans les variables d'environnement Render.");

  let lastError;
  for (const engine of ordered) {
    try {
      console.log(`🤖 Moteur : ${engine}`);
      if (engine === "gemini")  return { reply: await callGemini(messages),  engine };
      if (engine === "openai")  return { reply: await callOpenAI(messages),  engine };
      if (engine === "mistral") return { reply: await callMistral(messages), engine };
    } catch (err) {
      console.warn(`⚠️  ${engine} échoué : ${err.message}`);
      lastError = err;
    }
  }
  throw lastError || new Error("Tous les moteurs ont échoué.");
}

// ── Routes ─────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "✅ goOnline Assistant API is running",
    version: "2.2.0",
    creator: "DAVIESLAY 💥",
    engines: {
      gemini:  !!process.env.GEMINI_API_KEY,
      openai:  !!process.env.OPENAI_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
    },
  });
});

// Route de debug — voir quelle clé est présente (sans l'exposer)
app.get("/debug", (req, res) => {
  res.json({
    gemini_key_set:  !!process.env.GEMINI_API_KEY,
    gemini_key_len:  process.env.GEMINI_API_KEY?.length || 0,
    openai_key_set:  !!process.env.OPENAI_API_KEY,
    mistral_key_set: !!process.env.MISTRAL_API_KEY,
    node_version:    process.version,
  });
});

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
      error: "Erreur IA.",
      detail: err.message,
    });
  }
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 goOnline API v2.2 — port ${PORT}`);
  console.log(`🔑 Gemini  : ${process.env.GEMINI_API_KEY  ? "✅ clé présente (" + process.env.GEMINI_API_KEY.length + " chars)" : "❌ manquante"}`);
  console.log(`🔑 OpenAI  : ${process.env.OPENAI_API_KEY  ? "✅" : "❌"}`);
  console.log(`🔑 Mistral : ${process.env.MISTRAL_API_KEY ? "✅" : "❌"}`);
});
