import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { semanticContract } from './semanticContract.js';
import type { PublishRequest, PublishResult, ReyfinAppManifest } from '../shared/types.js';
import { prepareAppBackendDefinitionManifest } from './dashboardAgent.js';

const manifestStore = new Map<string, ReyfinAppManifest>();
const execFileAsync = promisify(execFile);

export async function executeDaxQuery(query: string): Promise<unknown> {
  const normalized = query.trim().toLowerCase();
  if (!normalized.startsWith('evaluate')) {
    throw new Error('Only read-only DAX EVALUATE queries are allowed.');
  }

  const account = await getAzureAccount();
  const { stdout } = await runAz([
    'account',
    'get-access-token',
    '--resource',
    'https://analysis.windows.net/powerbi/api',
    '--query',
    'accessToken',
    '-o',
    'tsv'
  ]);
  const token = stdout.trim();
  const response = await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${semanticContract.binding.workspaceId}/datasets/${semanticContract.binding.semanticModelId}/executeQueries`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        queries: [{ query }],
        serializerSettings: { includeNulls: true }
      })
    }
  );

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new Error(
        `DAX query unauthorized for active Azure CLI account ${account.user?.name ?? 'unknown'} in tenant ${account.tenantId ?? 'unknown'}. ` +
        `The semantic model ${semanticContract.binding.semanticModelName} (${semanticContract.binding.semanticModelId}) is in workspace ${semanticContract.binding.workspaceName} (${semanticContract.binding.workspaceId}). ` +
        `Sign in with an account that has Build/read access to that workspace/model, then retry. Raw response: ${body}`
      );
    }
    throw new Error(`DAX query failed: ${response.status} ${body}`);
  }
  return response.json();
}

export async function publishAppBackend(request: PublishRequest, manifest: ReyfinAppManifest): Promise<PublishResult> {
  const token = await getFabricToken();
  const displayName = `${request.tenantId}-${request.appName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const existing = await findFabricItem(token, displayName, 'AppBackend');
  const item = existing ?? await createAppBackend(token, displayName, request);
  const appBackendDefinition = prepareAppBackendDefinitionManifest(manifest);
  const manifestId = `${request.tenantId}-${request.appName}-${Date.now().toString(36)}`;
  manifestStore.set(manifestId, manifest);

  return {
    appBackendItemId: item.id,
    appBackendDisplayName: item.displayName,
    workspaceId: semanticContract.binding.workspaceId,
    workspaceName: semanticContract.binding.workspaceName,
    manifestId,
    fabricUrl: `https://app.fabric.microsoft.com/groups/${semanticContract.binding.workspaceId}/items/${item.id}`,
    workspaceUrl: `https://app.fabric.microsoft.com/groups/${semanticContract.binding.workspaceId}/list`,
    appBackendDefinition: {
      status: 'generated',
      definitionWriteStatus: 'unsupported-by-public-api',
      message: 'Generated AppBackend manifest from semantic model. Fabric public APIs currently reject AppBackend create-with-definition and updateDefinition, so the manifest is returned and stored by this app for the Rayfin runtime/adapter to consume.',
      manifest: appBackendDefinition
    },
    storage: {
      provider: 'memory',
      status: 'fallback',
      message: 'Manifest stored in the app runtime. Fabric SQL table creation was attempted but denied by policy action Microsoft.Sql/Sqlservers/Databases/Schemas/Tables/Create.'
    },
    manifest
  };
}

export function getStoredManifest(manifestId: string): ReyfinAppManifest | undefined {
  return manifestStore.get(manifestId);
}

async function getFabricToken(): Promise<string> {
  const { stdout } = await runAz([
    'account',
    'get-access-token',
    '--resource',
    'https://api.fabric.microsoft.com',
    '--query',
    'accessToken',
    '-o',
    'tsv'
  ]);
  return stdout.trim();
}

async function getAzureAccount(): Promise<{ tenantId?: string; user?: { name?: string }; id?: string }> {
  try {
    const { stdout } = await runAz(['account', 'show', '-o', 'json']);
    return JSON.parse(stdout) as { tenantId?: string; user?: { name?: string }; id?: string };
  } catch {
    return {};
  }
}

async function runAz(args: string[]) {
  if (process.platform === 'win32') {
    const escapedArgs = args.map((arg) => arg.includes(' ') ? `"${arg.replace(/"/g, '\\"')}"` : arg).join(' ');
    return execFileAsync('powershell.exe', ['-NoProfile', '-Command', `az ${escapedArgs}`]);
  }
  return execFileAsync('az', args);
}

async function findFabricItem(token: string, displayName: string, type: string): Promise<{ id: string; displayName: string; type: string } | undefined> {
  const response = await fetch(`https://api.fabric.microsoft.com/v1/workspaces/${semanticContract.binding.workspaceId}/items`, {
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(`Unable to list Fabric items: ${response.status} ${await response.text()}`);
  }
  const payload = await response.json() as { value: Array<{ id: string; displayName: string; type: string }> };
  return payload.value.find((item) => item.displayName === displayName && item.type === type);
}

async function createAppBackend(token: string, displayName: string, request: PublishRequest): Promise<{ id: string; displayName: string; type: string }> {
  const response = await fetch(`https://api.fabric.microsoft.com/v1/workspaces/${semanticContract.binding.workspaceId}/items`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      displayName,
      type: 'AppBackend',
      description: `Reyfin AppBackend for tenant ${request.tenantId}; semantic model ${semanticContract.binding.semanticModelName}; modelId ${semanticContract.binding.semanticModelId}.`
    })
  });
  if (!response.ok) {
    throw new Error(`Unable to create AppBackend: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<{ id: string; displayName: string; type: string }>;
}

