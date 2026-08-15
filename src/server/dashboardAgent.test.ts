import assert from 'node:assert/strict';
import test from 'node:test';
import { generateDashboardSpec, mcpTools, prepareReyfinAppManifest } from './dashboardAgent.js';
import { semanticContract } from './semanticContract.js';

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
