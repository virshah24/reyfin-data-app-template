import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { semanticContract } from './semanticContract.js';

const execFileAsync = promisify(execFile);

export async function executeDaxQuery(query: string): Promise<unknown> {
  const normalized = query.trim().toLowerCase();
  if (!normalized.startsWith('evaluate')) {
    throw new Error('Only read-only DAX EVALUATE queries are allowed.');
  }

  const { stdout } = process.platform === 'win32'
    ? await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      'az account get-access-token --resource https://analysis.windows.net/powerbi/api --query accessToken -o tsv'
    ])
    : await execFileAsync('az', [
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
    throw new Error(`DAX query failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}
