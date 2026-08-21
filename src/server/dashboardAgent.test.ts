import assert from 'node:assert/strict';
import test from 'node:test';
import { generateDashboardSpec, mcpTools, prepareAppBackendDefinitionManifest, prepareReyfinAppManifest } from './dashboardAgent.js';
import { semanticContract } from './semanticContract.js';
import { authorizeDashboardRequest, getUsage, recordUsage, resolveTenant } from './monetization.js';

test('semantic contract is bound to raymodel-POS-Hospitality', () => {
  assert.equal(semanticContract.binding.workspaceId, '7409c81f-4e8d-4c5c-84b6-a1f2d24a0221');
  assert.equal(semanticContract.binding.semanticModelId, '02b15314-4009-423c-8e4c-7c0458d4d076');
  assert.equal(semanticContract.binding.semanticModelName, 'raymodel-POS-Hospitality');
});

test('generates a dashboard spec with model binding and visuals', () => {
  const spec = generateDashboardSpec({
    prompt: 'Show POS sales, transactions, and fraud risk.',
    audience: 'operations',
    metricNames: ['salesAmount', 'fraudSignals'],
    dimensionNames: ['location', 'time']
  });

  assert.equal(spec.schema, 'reyfin.dashboard.v1');
  assert.equal(spec.modelBinding.semanticModelId, semanticContract.binding.semanticModelId);
  assert.ok(spec.visuals.length >= 4);
});

test('prepares an AppBackend manifest with MCP tool names', () => {
  const spec = generateDashboardSpec({
    prompt: 'Executive dashboard',
    audience: 'executive',
    metricNames: [],
    dimensionNames: []
  });
  const manifest = prepareReyfinAppManifest('reyfin-pos-hospitality', spec);
  assert.equal(manifest.fabricItemType, 'AppBackend');
  assert.ok(manifest.mcpTools.includes('generate_dashboard_spec'));
  assert.ok(manifest.mcpTools.includes('publish_reyfin_app'));
  assert.equal(mcpTools.length, 5);
});

test('generates an AppBackend definition manifest from semantic dashboard spec', () => {
  const spec = generateDashboardSpec({
    prompt: 'Executive dashboard',
    audience: 'executive',
    metricNames: ['transactionCount'],
    dimensionNames: ['location']
  });
  const manifest = prepareReyfinAppManifest('reyfin-pos-hospitality', spec);
  const appBackendManifest = prepareAppBackendDefinitionManifest(manifest);

  assert.equal(appBackendManifest.format, 'AppBackendManifest');
  assert.equal(appBackendManifest.parts[0]?.path, 'reyfin-app-manifest.json');
  assert.equal(appBackendManifest.decodedJson.semanticModel.semanticModelId, semanticContract.binding.semanticModelId);
  assert.equal(appBackendManifest.decodedJson.dashboard.visuals[0]?.title, 'Transaction count');
});

test('filters dashboard requests by tenant entitlements and meters usage', () => {
  const tenant = resolveTenant('starter-client');
  const request = authorizeDashboardRequest(tenant, {
    prompt: 'Starter dashboard',
    audience: 'executive',
    metricNames: ['transactionCount', 'fraudSignals'],
    dimensionNames: ['location', 'paymentType']
  });
  assert.deepEqual(request.metricNames, ['transactionCount']);
  assert.deepEqual(request.dimensionNames, ['location']);
  const before = getUsage(tenant.tenantId).dashboardsGenerated;
  const after = recordUsage(tenant.tenantId, 'dashboard').dashboardsGenerated;
  assert.equal(after, before + 1);
});
