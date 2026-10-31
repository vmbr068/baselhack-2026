# Guide & Tutoriel : Connecter n'importe quel Agent IA au MCP généré

Ce guide explique pas à pas comment connecter vos agents d'intelligence artificielle (**Claude Desktop**, **Cursor**, scripts **Codex / OpenAI**, agents **Luna**, etc.) au serveur MCP généré dynamiquement par **MCP Creator**.

---

## 1. Vue d'ensemble de l'Architecture

Lorsqu'un site web (ex: `Grand Hotel Basel`) est scanné par MCP Creator, un serveur MCP virtuel est instancié avec ses outils (`check_availability`, `reserve_room`, `get_current_status`).

Pour permettre aux agents de s'y connecter conformément aux standards de l'écosystème **Model Context Protocol (MCP)**, deux modes de transport sont mis à disposition :

| Mode de transport | Pour quels agents ? | Endpoint / Commande |
| :--- | :--- | :--- |
| **SSE (Server-Sent Events)** *(Standard MCP HTTP)* | Luna, Cursor, SDKs MCP officiels, Web Agents | `GET http://localhost:3000/api/v1/servers/latest/mcp/sse`<br>`POST http://localhost:3000/api/v1/servers/latest/mcp/messages` |
| **Stdio Bridge** *(Standard MCP CLI)* | Claude Desktop, Antigravity, CLIs locaux | `node <repo>/code/backend/bin/mcp-runner.mjs latest` |
| **REST / JSON API** *(Fallback direct)* | Codex, Custom Python / LangChain / AutoGen | `POST http://localhost:3000/api/v1/servers/latest/call` |

> 💡 **Astuce** : Vous pouvez remplacer `latest` par un ID de serveur spécifique (ex: `mcp_grand_hotel_basel_luxury_comfort_1793435670219`).

---

## 2. Connexion avec Claude Desktop (stdio)

Claude Desktop supporte nativement le protocole MCP via transport stdio.

### Étape 1 : Ouvrir le fichier de configuration de Claude Desktop
Sur macOS :
```bash
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```
Sur Windows :
```text
%APPDATA%\Claude\claude_desktop_config.json
```

### Étape 2 : Ajouter le serveur MCP généré
Ajoutez la configuration suivante dans le bloc `"mcpServers"` :

```json
{
  "mcpServers": {
    "hotel-basel": {
      "command": "node",
      "args": [
        "/Users/sacharamstein/Hackathon/baselhack-2026/code/backend/bin/mcp-runner.mjs",
        "latest"
      ],
      "env": {
        "MCP_BACKEND_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Étape 3 : Tester dans Claude Desktop
1. Relancez Claude Desktop.
2. L'icône de marteau 🔨 apparaît dans le chat avec les outils :
   - `check_availability`
   - `reserve_room`
   - `get_current_status`
3. Tapez simplement dans Claude :
   > *"Trouve-moi une chambre au Grand Hotel Basel du 5 au 8 novembre pour 2 personnes."*
4. Claude appelle automatiquement l'outil, analyse la réponse du site et vous affiche les suites disponibles !

---

## 3. Connexion avec Cursor / VS Code / Windsurf (SSE)

Si vous utilisez **Cursor** ou une extension MCP compatible SSE :

1. Ouvrez **Cursor Settings** > **Features** > **MCP Servers**.
2. Cliquez sur **Add New MCP Server** :
   - **Name** : `Hotel-Basel`
   - **Type** : `sse`
   - **URL** : `http://localhost:3000/api/v1/servers/latest/mcp/sse`
3. Sauvegardez. Cursor établit le handshake SSE, découvre les outils et les active dans le Composer (`Cmd+I` ou `Ctrl+I`).

---

## 4. Connexion avec Codex / OpenAI / Python

Si votre agent utilise l'API **OpenAI / Codex** ou un script Python personnalisé :

### Option A : Via le SDK officiel Python MCP (`mcp`)
```python
import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client

async def main():
    async with sse_client("http://localhost:3000/api/v1/servers/latest/mcp/sse") as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # 1. Lister les outils disponibles
            tools = await session.list_tools()
            print("Outils découverts :", [t.name for t in tools.tools])
            
            # 2. Chercher des chambres
            result = await session.call_tool("check_availability", {
                "check_in": "2026-11-05",
                "check_out": "2026-11-08",
                "guests": 2
            })
            print("Résultats :", result.content[0].text)

asyncio.run(main())
```

### Option B : Via OpenAI Function Calling direct (sans SDK MCP)
Vous pouvez directement convertir le schéma JSON de notre backend vers le format `tools` d'OpenAI :

```python
import requests
import openai

# 1. Récupérer le schéma généré par le backend
mcp_data = requests.get("http://localhost:3000/api/v1/servers/latest").json()

# Convertir au format OpenAI
openai_tools = [
    {
        "type": "function",
        "function": {
            "name": tool["name"],
            "description": tool["description"],
            "parameters": tool["parameters"]
        }
    }
    for tool in mcp_data["tools"]
]

# 2. Donner les outils à GPT-4 / Codex
client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Quelles chambres sont disponibles pour 2 personnes du 5 au 8 novembre ?"}],
    tools=openai_tools
)

# 3. Quand l'agent choisit d'exécuter l'outil :
tool_call = response.choices[0].message.tool_calls[0]
call_result = requests.post(
    "http://localhost:3000/api/v1/servers/latest/call",
    json={
        "tool_name": tool_call.function.name,
        "arguments": eval(tool_call.function.arguments)
    }
).json()

print("Réponse du site :", call_result)
```

---

## 5. Connexion avec Luna

**Luna** (ou tout framework agentique moderne) supporte les protocoles standardisés :
1. **Si Luna supporte MCP SSE** : Renseignez simplement l'URL du serveur MCP :
   `http://localhost:3000/api/v1/servers/latest/mcp/sse`
2. **Si Luna utilise OpenAPI / Swagger** : Notre backend expose Swagger sur `http://localhost:3000/docs-json`. Luna peut importer directement les routes d'exécution.
3. **Si Luna utilise des Webhooks / Tool Endpoints** : Configurez la tool Luna pour faire un `POST http://localhost:3000/api/v1/servers/latest/call` avec `{ "tool_name": "...", "arguments": { ... } }`.

---

## 6. Sécurité & Confirmation Humaine (Human-in-the-Loop)

Conformément à la charte du projet ([AGENTS.md](../AGENTS.md)), toute action irréversible (telle qu'une réservation d'hôtel avec coordonnées) nécessite un accord humain explicite avant confirmation finale :

### Déroulement d'une réservation avec l'agent :
1. **Premier appel de l'agent** :
   L'agent tente d'exécuter `reserve_room` :
   ```json
   {
     "room_title": "Deluxe Rhine View Suite",
     "guest_name": "Sacha Ramstein",
     "guest_email": "sacha@baselhack.ch"
   }
   ```
2. **Réponse de garde-fou du MCP** :
   Le serveur **bloque** l'action réelle et renvoie :
   ```json
   {
     "success": false,
     "status": "pending_confirmation",
     "confirmation_required": true,
     "confirmation_details": {
       "token": "conf_tok_1730367800000_abc123",
       "summary": "Human approval required: Book Deluxe Rhine View Suite for Sacha Ramstein"
     }
   }
   ```
3. **Dialogue avec l'humain** :
   L'agent présente le récapitulatif à l'utilisateur :
   > *"Voulez-vous que je confirme la réservation de la Suite Deluxe pour 450 CHF au nom de Sacha Ramstein ?"*
4. **Validation et exécution finale** :
   L'utilisateur valide. L'agent renvoie l'appel avec le token et la confirmation :
   ```json
   {
     "room_title": "Deluxe Rhine View Suite",
     "guest_name": "Sacha Ramstein",
     "guest_email": "sacha@baselhack.ch",
     "confirmed_by_human": true,
     "confirmation_token": "conf_tok_1730367800000_abc123"
   }
   ```
5. **Succès** : La réservation est actée et confirmée sur le site par Playwright !
