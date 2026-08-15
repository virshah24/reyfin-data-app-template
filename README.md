# Reyfin Data App Template

This is a focused Reyfin data app scaffold bound to the Fabric semantic model:

- Workspace: `rayfin-apps-ws`
- Workspace ID: `7409c81f-4e8d-4c5c-84b6-a1f2d24a0221`
- Semantic model: `raymodel-POS-Hospitality`
- Semantic model ID: `02b15314-4009-423c-8e4c-7c0458d4d076`

The app exposes MCP-style tools that an agent can use to:

1. inspect the semantic contract,
2. generate interactive dashboard specs,
3. execute safe DAX queries against the model,
4. prepare a Reyfin/Fabric app manifest.

## Local development

```powershell
npm install
npm run build
npm test
npm run dev
```

Open the UI at `http://localhost:3000` after `npm run dev`, or use Vite with `npm run dev:client`.

## API / MCP-style tools

- `GET /api/model`
- `GET /api/tools`
- `POST /api/tools/generate-dashboard`
- `POST /api/tools/execute-dax`
- `POST /api/tools/prepare-reyfin-app`

`execute-dax` uses the signed-in Azure CLI identity to acquire a Power BI API token.
