import type { AppBackendDefinitionManifest, DashboardRequest, DashboardVisualSpec, McpToolDescriptor, ReyfinAppManifest, ReyfinDashboardSpec } from '../shared/types.js';
import { semanticContract } from './semanticContract.js';

const colors = ['#67e8f9', '#a78bfa', '#34d399', '#f59e0b', '#fb7185'];

export const mcpTools: McpToolDescriptor[] = [
  {
    name: 'get_semantic_contract',
    description: 'Return the configured Fabric semantic model binding, supported metrics, dimensions, and assumptions.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'generate_dashboard_spec',
    description: 'Build an interactive Reyfin dashboard spec from a user prompt and selected semantic metrics/dimensions.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        audience: { enum: ['executive', 'operations', 'analyst'] },
        metricNames: { type: 'array', items: { type: 'string' } },
        dimensionNames: { type: 'array', items: { type: 'string' } }
      },
      required: ['prompt']
    }
  },
  {
    name: 'execute_dax_query',
    description: 'Execute a read-only DAX query against the configured Fabric semantic model using the Power BI executeQueries API.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'prepare_reyfin_app_manifest',
    description: 'Package a dashboard spec and model binding as a Reyfin AppBackend manifest for Fabric publishing.',
    inputSchema: { type: 'object', properties: { appName: { type: 'string' } } }
  },
  {
    name: 'publish_reyfin_app',
    description: 'Create or update a tenant-specific Fabric AppBackend item and store the dashboard manifest.',
    inputSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        appName: { type: 'string' },
        dashboardSpec: { type: 'object' }
      },
      required: ['tenantId', 'appName']
    }
  }
];

export function generateDashboardSpec(request: DashboardRequest): ReyfinDashboardSpec {
  const metrics = request.metricNames.length
    ? semanticContract.metrics.filter((metric) => request.metricNames.includes(metric.name))
    : semanticContract.metrics.slice(0, 4);
  const dimensions = request.dimensionNames.length
    ? semanticContract.dimensions.filter((dimension) => request.dimensionNames.includes(dimension.name))
    : semanticContract.dimensions.slice(0, 3);

  const visuals: DashboardVisualSpec[] = metrics.flatMap((metric, index) => {
    const dimension = dimensions[index % Math.max(dimensions.length, 1)];
    return [
      {
        id: `${metric.name}-kpi`,
        type: 'kpi' as const,
        title: metric.displayName,
        metric: metric.name,
        dax: metric.defaultDax,
        color: colors[index % colors.length] ?? '#67e8f9'
      },
      {
        id: `${metric.name}-by-${dimension?.name ?? 'time'}`,
        type: index % 2 === 0 ? 'bar' as const : 'line' as const,
        title: `${metric.displayName} by ${dimension?.displayName ?? 'Time'}`,
        metric: metric.name,
        dimension: dimension?.name,
        dax: metric.defaultDax,
        color: colors[(index + 1) % colors.length] ?? '#a78bfa'
      }
    ];
  });

  visuals.push({
    id: 'agent-summary',
    type: 'agent-summary',
    title: 'Agent summary',
    color: '#22c55e'
  });

  return {
    schema: 'reyfin.dashboard.v1',
    title: request.audience === 'executive' ? 'Hospitality POS Executive Dashboard' : 'Hospitality POS Operations Dashboard',
    description: request.prompt,
    modelBinding: semanticContract.binding,
    visuals,
    layout: {
      columns: 12,
      theme: request.audience === 'executive' ? 'hospitality-dark' : 'fabric-light'
    },
    agentSummary: {
      headline: 'Reyfin dashboard generated from raymodel-POS-Hospitality',
      narrative: `The agent selected ${metrics.map((metric) => metric.displayName).join(', ')} and paired them with ${dimensions.map((dimension) => dimension.displayName).join(', ')} for ${request.audience} users.`,
      suggestedFollowUps: ['Run DAX smoke test', 'Replace placeholder DAX with certified measures', 'Publish as Fabric AppBackend']
    },
    governance: {
      status: 'ready',
      notes: ['Bound to a single Fabric semantic model.', 'Generated spec uses configured metric allow-list.', 'No raw SQL is exposed to the dashboard agent.']
    }
  };
}

export function prepareReyfinAppManifest(appName: string, dashboardSpec: ReyfinDashboardSpec): ReyfinAppManifest {
  return {
    appName,
    fabricItemType: 'AppBackend',
    targetWorkspaceId: semanticContract.binding.workspaceId,
    targetWorkspaceName: semanticContract.binding.workspaceName,
    semanticModelId: semanticContract.binding.semanticModelId,
    dashboardSpec,
    mcpTools: mcpTools.map((tool) => tool.name)
  };
}

export function prepareAppBackendDefinitionManifest(manifest: ReyfinAppManifest): AppBackendDefinitionManifest {
  const decodedJson = {
    schema: 'reyfin.appBackend.v1' as const,
    appName: manifest.appName,
    semanticModel: manifest.dashboardSpec.modelBinding,
    dashboard: manifest.dashboardSpec,
    tools: manifest.mcpTools
  };
  const payload = Buffer.from(JSON.stringify(decodedJson, null, 2), 'utf8').toString('base64');
  return {
    format: 'AppBackendManifest',
    parts: [
      {
        path: 'reyfin-app-manifest.json',
        payloadType: 'InlineBase64',
        payload
      }
    ],
    decodedJson
  };
}
