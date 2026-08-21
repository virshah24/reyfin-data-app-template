import type { DashboardRequest, TenantEntitlement, TenantUsage } from '../shared/types.js';

const defaultTenant: TenantEntitlement = {
  tenantId: 'hospitality-demo-client',
  displayName: 'Hospitality Demo Client',
  plan: 'growth',
  monthlyDashboardLimit: 250,
  monthlyDaxQueryLimit: 1000,
  allowedMetrics: ['transactionCount', 'salesAmount', 'fraudSignals', 'averageTicket'],
  allowedDimensions: ['location', 'time', 'paymentType', 'productCategory']
};

const tenants = new Map<string, TenantEntitlement>([
  [defaultTenant.tenantId, defaultTenant],
  [
    'starter-client',
    {
      tenantId: 'starter-client',
      displayName: 'Starter Tier Client',
      plan: 'starter',
      monthlyDashboardLimit: 25,
      monthlyDaxQueryLimit: 100,
      allowedMetrics: ['transactionCount', 'salesAmount'],
      allowedDimensions: ['location', 'time']
    }
  ],
  [
    'enterprise-client',
    {
      tenantId: 'enterprise-client',
      displayName: 'Enterprise Tier Client',
      plan: 'enterprise',
      monthlyDashboardLimit: 5000,
      monthlyDaxQueryLimit: 20000,
      allowedMetrics: ['transactionCount', 'salesAmount', 'fraudSignals', 'averageTicket'],
      allowedDimensions: ['location', 'time', 'paymentType', 'productCategory']
    }
  ]
]);

const usage = new Map<string, TenantUsage>();

export function listTenants(): TenantEntitlement[] {
  return Array.from(tenants.values());
}

export function resolveTenant(tenantId?: string): TenantEntitlement {
  return tenants.get(tenantId ?? defaultTenant.tenantId) ?? defaultTenant;
}

export function getUsage(tenantId: string): TenantUsage {
  const current = usage.get(tenantId) ?? {
    tenantId,
    dashboardsGenerated: 0,
    daxQueriesExecuted: 0,
    manifestsPublished: 0
  };
  usage.set(tenantId, current);
  return current;
}

export function authorizeDashboardRequest(tenant: TenantEntitlement, request: DashboardRequest): DashboardRequest {
  const current = getUsage(tenant.tenantId);
  if (current.dashboardsGenerated >= tenant.monthlyDashboardLimit) {
    throw new Error(`Dashboard quota exceeded for ${tenant.displayName}. Upgrade plan or wait for next billing period.`);
  }

  const metricNames = request.metricNames.filter((metric) => tenant.allowedMetrics.includes(metric));
  const dimensionNames = request.dimensionNames.filter((dimension) => tenant.allowedDimensions.includes(dimension));
  if (request.metricNames.length > 0 && metricNames.length === 0) {
    throw new Error(`No requested metrics are allowed for ${tenant.displayName}.`);
  }
  if (request.dimensionNames.length > 0 && dimensionNames.length === 0) {
    throw new Error(`No requested dimensions are allowed for ${tenant.displayName}.`);
  }
  return {
    ...request,
    metricNames,
    dimensionNames
  };
}

export function recordUsage(tenantId: string, kind: 'dashboard' | 'dax' | 'publish'): TenantUsage {
  const current = getUsage(tenantId);
  if (kind === 'dashboard') current.dashboardsGenerated += 1;
  if (kind === 'dax') current.daxQueriesExecuted += 1;
  if (kind === 'publish') current.manifestsPublished += 1;
  usage.set(tenantId, current);
  return current;
}
