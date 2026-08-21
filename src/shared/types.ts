export type VisualType = 'kpi' | 'bar' | 'line' | 'table' | 'agent-summary';

export interface FabricModelBinding {
  workspaceId: string;
  workspaceName: string;
  semanticModelId: string;
  semanticModelName: string;
  modelUrl: string;
}

export interface SemanticMetric {
  name: string;
  displayName: string;
  description: string;
  defaultDax: string;
  allowedVisuals: VisualType[];
}

export interface SemanticDimension {
  name: string;
  displayName: string;
  description: string;
}

export interface SemanticContract {
  binding: FabricModelBinding;
  metrics: SemanticMetric[];
  dimensions: SemanticDimension[];
  assumptions: string[];
}

export interface DashboardRequest {
  prompt: string;
  audience: 'executive' | 'operations' | 'analyst';
  metricNames: string[];
  dimensionNames: string[];
}

export interface DashboardVisualSpec {
  id: string;
  type: VisualType;
  title: string;
  metric?: string;
  dimension?: string;
  dax?: string;
  color: string;
}

export interface ReyfinDashboardSpec {
  schema: 'reyfin.dashboard.v1';
  title: string;
  description: string;
  modelBinding: FabricModelBinding;
  visuals: DashboardVisualSpec[];
  layout: {
    columns: number;
    theme: 'hospitality-dark' | 'fabric-light';
  };
  agentSummary: {
    headline: string;
    narrative: string;
    suggestedFollowUps: string[];
  };
  governance: {
    status: 'ready' | 'needs-review';
    notes: string[];
  };
}

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ReyfinAppManifest {
  appName: string;
  fabricItemType: 'AppBackend';
  targetWorkspaceId: string;
  targetWorkspaceName: string;
  semanticModelId: string;
  dashboardSpec: ReyfinDashboardSpec;
  mcpTools: string[];
}

export interface AppBackendDefinitionManifest {
  format: 'AppBackendManifest';
  parts: Array<{
    path: string;
    payloadType: 'InlineBase64';
    payload: string;
  }>;
  decodedJson: {
    schema: 'reyfin.appBackend.v1';
    appName: string;
    semanticModel: FabricModelBinding;
    dashboard: ReyfinDashboardSpec;
    tools: string[];
  };
}

export interface PublishRequest {
  tenantId: string;
  appName: string;
  dashboardSpec: ReyfinDashboardSpec;
}

export interface PublishResult {
  appBackendItemId: string;
  appBackendDisplayName: string;
  workspaceId: string;
  workspaceName: string;
  manifestId: string;
  fabricUrl: string;
  workspaceUrl: string;
  appBackendDefinition: {
    status: 'generated';
    definitionWriteStatus: 'unsupported-by-public-api';
    message: string;
    manifest: AppBackendDefinitionManifest;
  };
  storage: {
    provider: 'memory' | 'fabric-sql';
    status: 'stored' | 'fallback';
    message: string;
  };
  manifest: ReyfinAppManifest;
}

export type TenantPlan = 'starter' | 'growth' | 'enterprise';

export interface TenantEntitlement {
  tenantId: string;
  displayName: string;
  plan: TenantPlan;
  monthlyDashboardLimit: number;
  monthlyDaxQueryLimit: number;
  allowedMetrics: string[];
  allowedDimensions: string[];
}

export interface TenantUsage {
  tenantId: string;
  dashboardsGenerated: number;
  daxQueriesExecuted: number;
  manifestsPublished: number;
}

export interface MeteredToolResult<T> {
  tenant: TenantEntitlement;
  usage: TenantUsage;
  result: T;
}
