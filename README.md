# goOnline Assistant API 🌐

Serveur backend pour l'assistant IA de **goOnline** — by **DAVIESLAY 💥**

## Stack
- **Node.js** + **Express**
- **Google Gemini API** (gemini-1.5-flash)
- Déployé sur **Render**

## Endpoints

| Méthode | Route | Description |
|--------|-------|-------------|
| GET | `/` | Health check |
| POST | `/chat` | Envoyer un message à l'IA |

### POST `/chat`

**Body JSON :**
```json
{
  "messages": [
    { "role": "user", "content": "C'est quoi goOnline ?" }
  ]
}
```

**Réponse :**
```json
{
  "reply": "goOnline est une agence digitale créée par DAVIESLAY 💥..."
}
```

## Déploiement sur Render

1. Pusher ce repo sur GitHub
2. Créer un **Web Service** sur [render.com](https://render.com)
3. Connecter le dépôt GitHub
4. Ajouter la variable d'environnement :
   - `GEMINI_API_KEY` = votre clé Google Gemini
5. Render génère automatiquement une URL publique

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Votre clé API Google Gemini |
| `PORT` | Port du serveur (Render le fournit automatiquement) |

---
*goOnline — Le digital, simplement.* 🚀
