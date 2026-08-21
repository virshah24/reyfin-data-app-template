# Reyfin Data App Template

This is a focused Reyfin data app scaffold and MCP/container gateway bound to the Fabric semantic model:

- Workspace: `rayfin-apps-ws`
- Workspace ID: `7409c81f-4e8d-4c5c-84b6-a1f2d24a0221`
- Semantic model: `raymodel-POS-Hospitality`
- Semantic model ID: `02b15314-4009-423c-8e4c-7c0458d4d076`

The app exposes MCP-style tools that an agent or ISV SaaS product can use to:

1. inspect the semantic contract,
2. generate interactive dashboard specs,
3. execute safe DAX queries against the model,
4. prepare a Reyfin/Fabric app manifest.
5. meter tenant usage for monetization.

## Local development

```powershell
npm install
npm run build
npm test
npm run dev
```

Open the UI at `http://localhost:3000` after `npm run dev`, or use Vite with `npm run dev:client`.

## API / MCP-style tools

- `POST /mcp` JSON-RPC endpoint (`tools/list`, `tools/call`)
- `GET /api/model`
- `GET /api/tools`
- `GET /api/tenants`
- `POST /api/tools/generate-dashboard`
- `POST /api/tools/execute-dax`
- `POST /api/tools/prepare-reyfin-app`
- `POST /api/tools/publish-reyfin-app`

`execute-dax` uses the signed-in Azure CLI identity to acquire a Power BI API token.

If DAX returns `401`, the active Azure CLI user does not have access to the Fabric semantic model. Run `az account show` and sign in with an account that has Build/read access to `raymodel-POS-Hospitality` in `rayfin-apps-ws`.

`publish-reyfin-app` creates or reuses a Fabric `AppBackend` item in `rayfin-apps-ws` and stores the generated dashboard manifest in the app runtime. Fabric SQL manifest table creation was tested but blocked by database policy (`Microsoft.Sql/Sqlservers/Databases/Schemas/Tables/Create` denied), so SQL persistence is left as a follow-up once policy/RBAC permits DDL.

Fabric `AppBackend` items are backend artifacts and may appear visually blank in the Fabric UX. The app now generates an `AppBackendManifest` from the semantic model and selected dashboard spec. Fabric public APIs currently reject AppBackend create-with-definition and updateDefinition, so the manifest is returned in the publish response and stored in the app runtime for the Rayfin runtime/adapter to consume.

## Container deployment

```powershell
docker build -t reyfin-data-app-template .
docker run -p 8080:8080 `
  -e FABRIC_WORKSPACE_ID=7409c81f-4e8d-4c5c-84b6-a1f2d24a0221 `
  -e FABRIC_SEMANTIC_MODEL_ID=02b15314-4009-423c-8e4c-7c0458d4d076 `
  reyfin-data-app-template
```

The container exposes:

- `/healthz`
- `/readyz`
- `/mcp`
- `/api/*`
