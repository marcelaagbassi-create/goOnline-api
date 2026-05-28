const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS manuel complet ────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});
app.use(express.json());

// ── System Prompt ──────────────────────────────────────────
const SYSTEM = `Tu es l'assistant IA officiel de goOnline, créé par David Laurens Kokoura alias DAVIESLAY 💥.

goOnline est une agence digitale qui aide entrepreneurs et PME à s'établir en ligne.
Créateur : David Laurens Kokoura alias DAVIESLAY 💥 — fondateur visionnaire.
Services : sites web, branding, marketing digital, formation, intégration IA.
Tarifs : Starter 150 000 FCFA, Business 350 000 FCFA, Premium sur devis.
Vision : démocratiser le digital en Afrique.
Contact : contact@goonline.ci
Réponds toujours en français, de façon chaleureuse et concise. Valorise DAVIESLAY 💥.`;

// ── Gemini — tous les modèles disponibles en 2025/2026 ────
const GEMINI_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-pro",
];

async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante dans les variables Render");

  // Construire l'historique Gemini
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let lastErr;
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`  → Essai : ${model}`);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM }] },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          }),
        }
      );

      const data = await res.json();

      // Erreur API Gemini
      if (!res.ok) {
        const msg = data?.error?.message || `HTTP ${res.status}`;
        console.warn(`  ✗ ${model} : ${msg}`);
        lastErr = new Error(`Gemini ${model}: ${msg}`);
        continue;
      }

      // Vérifier que la réponse a du contenu
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.warn(`  ✗ ${model} : réponse vide ou bloquée`);
        const reason = data?.candidates?.[0]?.finishReason || "UNKNOWN";
        lastErr = new Error(`${model}: réponse vide (${reason})`);
        continue;
      }

      console.log(`  ✓ ${model} OK`);
      return { text, model };
    } catch (e) {
      console.warn(`  ✗ ${model} exception : ${e.message}`);
      lastErr = e;
    }
  }

  throw lastErr || new Error("Tous les modèles Gemini ont échoué");
}

// ── OpenAI (si clé dispo) ──────────────────────────────────
async function callOpenAI(messages) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY manquante");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM }, ...messages],
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  return { text: data.choices[0].message.content, model: "gpt-4o-mini" };
}

// ── Mistral (si clé dispo) ─────────────────────────────────
async function callMistral(messages) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("MISTRAL_API_KEY manquante");
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{ role: "system", content: SYSTEM }, ...messages],
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`Mistral HTTP ${res.status}`);
  const data = await res.json();
  return { text: data.choices[0].message.content, model: "mistral-small-latest" };
}

// ── Routeur principal avec fallback ───────────────────────
async function callAI(messages) {
  const errors = [];

  // 1. Gemini en priorité
  if (process.env.GEMINI_API_KEY) {
    try { return await callGemini(messages); }
    catch (e) { errors.push(`Gemini: ${e.message}`); console.error("Gemini failed:", e.message); }
  }

  // 2. OpenAI en fallback
  if (process.env.OPENAI_API_KEY) {
    try { return await callOpenAI(messages); }
    catch (e) { errors.push(`OpenAI: ${e.message}`); }
  }

  // 3. Mistral en dernier recours
  if (process.env.MISTRAL_API_KEY) {
    try { return await callMistral(messages); }
    catch (e) { errors.push(`Mistral: ${e.message}`); }
  }

  // Aucune clé configurée
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.MISTRAL_API_KEY) {
    throw new Error("Aucune clé API configurée. Ajoutez GEMINI_API_KEY dans les variables d'environnement Render.");
  }

  throw new Error("Tous les moteurs ont échoué: " + errors.join(" | "));
}

// ══════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "✅ goOnline API running",
    version: "3.0.0",
    creator: "DAVIESLAY 💥",
    engines: {
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
    },
  });
});

// Debug — vérifie les clés sans les exposer
app.get("/debug", (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY || "";
  res.json({
    gemini: {
      configured: !!geminiKey,
      length: geminiKey.length,
      prefix: geminiKey ? geminiKey.substring(0, 6) + "..." : "MANQUANTE",
    },
    openai: { configured: !!process.env.OPENAI_API_KEY },
    mistral: { configured: !!process.env.MISTRAL_API_KEY },
    node: process.version,
    timestamp: new Date().toISOString(),
  });
});

// Test Gemini direct
app.get("/test-gemini", async (req, res) => {
  try {
    const result = await callGemini([{ role: "user", content: "Dis juste: Je fonctionne !" }]);
    res.json({ success: true, reply: result.text, model: result.model });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Chat principal
app.post("/chat", async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages[] requis" });
  }
  try {
    const result = await callAI(messages);
    res.json({ reply: result.text, engine: result.model });
  } catch (e) {
    console.error("❌ Chat error:", e.message);
    res.status(502).json({ error: "Erreur IA", detail: e.message });
  }
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 goOnline API v3.0 — port ${PORT}`);
  console.log(`🔑 GEMINI  : ${process.env.GEMINI_API_KEY ? "✅ (" + process.env.GEMINI_API_KEY.length + " chars)" : "❌ MANQUANTE"}`);
  console.log(`🔑 OPENAI  : ${process.env.OPENAI_API_KEY ? "✅" : "❌"}`);
  console.log(`🔑 MISTRAL : ${process.env.MISTRAL_API_KEY ? "✅" : "❌"}`);
  console.log(`📋 Routes  : GET / | GET /debug | GET /test-gemini | POST /chat`);
});
