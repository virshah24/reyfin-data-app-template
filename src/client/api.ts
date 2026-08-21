import type { DashboardRequest, McpToolDescriptor, PublishResult, ReyfinAppManifest, ReyfinDashboardSpec, SemanticContract, TenantEntitlement, TenantUsage } from '../shared/types';

const jsonHeaders = { 'Content-Type': 'application/json' };

export async function fetchModel(): Promise<SemanticContract> {
  const response = await fetch('/api/model');
  if (!response.ok) throw new Error('Unable to load semantic model contract');
  return response.json();
}

export async function fetchTools(): Promise<McpToolDescriptor[]> {
  const response = await fetch('/api/tools');
  if (!response.ok) throw new Error('Unable to load MCP tools');
  return (await response.json()).tools;
}

export async function fetchTenants(): Promise<Array<TenantEntitlement & { usage: TenantUsage }>> {
  const response = await fetch('/api/tenants');
  if (!response.ok) throw new Error('Unable to load tenant plans');
  return (await response.json()).tenants;
}

export async function generateDashboard(request: DashboardRequest): Promise<ReyfinDashboardSpec> {
  const response = await fetch('/api/tools/generate-dashboard', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error('Unable to generate dashboard');
  return (await response.json()).dashboardSpec;
}

export async function executeDax(query: string): Promise<unknown> {
  const response = await fetch('/api/tools/execute-dax', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ query })
  });
  return response.json();
}

export async function prepareManifest(appName: string): Promise<ReyfinAppManifest> {
  const response = await fetch('/api/tools/prepare-reyfin-app', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ appName })
  });
  if (!response.ok) throw new Error('Unable to prepare app manifest');
  return (await response.json()).manifest;
}

export async function publishApp(tenantId: string, appName: string, dashboardSpec: ReyfinDashboardSpec): Promise<PublishResult> {
  const response = await fetch('/api/tools/publish-reyfin-app', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ tenantId, appName, dashboardSpec })
  });
  if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to publish app');
  return (await response.json()).result;
}
