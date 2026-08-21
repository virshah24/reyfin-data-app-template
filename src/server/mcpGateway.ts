import type { Request, Response } from 'express';
import type { DashboardRequest } from '../shared/types.js';
import { generateDashboardSpec, mcpTools, prepareReyfinAppManifest } from './dashboardAgent.js';
import { executeDaxQuery, publishAppBackend } from './fabric.js';
import { authorizeDashboardRequest, getUsage, recordUsage, resolveTenant } from './monetization.js';
import { semanticContract } from './semanticContract.js';

type JsonRpcRequest = {
  jsonrpc?: '2.0';
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

export async function handleMcpRequest(req: Request, res: Response) {
  const body = req.body as JsonRpcRequest;
  const id = body.id ?? null;
  try {
    if (body.method === 'tools/list') {
      res.json({ jsonrpc: '2.0', id, result: { tools: mcpTools } });
      return;
    }
    if (body.method !== 'tools/call') {
      throw new Error(`Unsupported MCP method: ${body.method ?? 'missing'}`);
    }

    const toolName = String(body.params?.name ?? '');
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    const tenant = resolveTenant(String(args.tenantId ?? req.header('x-tenant-id') ?? 'hospitality-demo-client'));
    const result = await callTool(toolName, args, tenant.tenantId);
    res.json({ jsonrpc: '2.0', id, result });
  } catch (error) {
    res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'MCP call failed'
      }
    });
  }
}

async function callTool(toolName: string, args: Record<string, unknown>, tenantId: string) {
  const tenant = resolveTenant(tenantId);
  if (toolName === 'get_semantic_contract') {
    return { content: [{ type: 'json', json: { tenant, usage: getUsage(tenant.tenantId), semanticContract } }] };
  }
  if (toolName === 'generate_dashboard_spec') {
    const request = authorizeDashboardRequest(tenant, {
      prompt: String(args.prompt ?? 'Build a hospitality POS dashboard.'),
      audience: (args.audience as DashboardRequest['audience']) ?? 'executive',
      metricNames: Array.isArray(args.metricNames) ? args.metricNames.map(String) : [],
      dimensionNames: Array.isArray(args.dimensionNames) ? args.dimensionNames.map(String) : []
    });
    const spec = generateDashboardSpec(request);
    const usage = recordUsage(tenant.tenantId, 'dashboard');
    return { content: [{ type: 'json', json: { tenant, usage, dashboardSpec: spec } }] };
  }
  if (toolName === 'execute_dax_query') {
    const result = await executeDaxQuery(String(args.query ?? 'EVALUATE ROW("Status", "ok")'));
    const usage = recordUsage(tenant.tenantId, 'dax');
    return { content: [{ type: 'json', json: { tenant, usage, result } }] };
  }
  if (toolName === 'prepare_reyfin_app_manifest') {
    const spec = generateDashboardSpec({
      prompt: String(args.prompt ?? 'Build a hospitality POS dashboard.'),
      audience: 'executive',
      metricNames: Array.isArray(args.metricNames) ? args.metricNames.map(String) : [],
      dimensionNames: Array.isArray(args.dimensionNames) ? args.dimensionNames.map(String) : []
    });
    const manifest = prepareReyfinAppManifest(String(args.appName ?? 'reyfin-pos-hospitality'), spec);
    return { content: [{ type: 'json', json: { tenant, usage: getUsage(tenant.tenantId), manifest } }] };
  }
  if (toolName === 'publish_reyfin_app') {
    const spec = generateDashboardSpec({
      prompt: String(args.prompt ?? 'Build a hospitality POS dashboard.'),
      audience: 'executive',
      metricNames: Array.isArray(args.metricNames) ? args.metricNames.map(String) : [],
      dimensionNames: Array.isArray(args.dimensionNames) ? args.dimensionNames.map(String) : []
    });
    const appName = String(args.appName ?? 'reyfin-pos-hospitality');
    const manifest = prepareReyfinAppManifest(appName, spec);
    const publish = await publishAppBackend({ tenantId: tenant.tenantId, appName, dashboardSpec: spec }, manifest);
    const usage = recordUsage(tenant.tenantId, 'publish');
    return { content: [{ type: 'json', json: { tenant, usage, publish } }] };
  }
  throw new Error(`Unknown tool: ${toolName}`);
}
