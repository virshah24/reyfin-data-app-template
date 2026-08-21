import { useEffect, useMemo, useState } from 'react';
import type { McpToolDescriptor, PublishResult, ReyfinAppManifest, ReyfinDashboardSpec, SemanticContract, TenantEntitlement, TenantUsage } from '../shared/types';
import { executeDax, fetchModel, fetchTenants, fetchTools, generateDashboard, prepareManifest, publishApp } from './api';

export default function App() {
  const [model, setModel] = useState<SemanticContract>();
  const [tools, setTools] = useState<McpToolDescriptor[]>([]);
  const [tenants, setTenants] = useState<Array<TenantEntitlement & { usage: TenantUsage }>>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['salesAmount', 'transactionCount', 'fraudSignals']);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['location', 'time']);
  const [prompt, setPrompt] = useState('Build an executive dashboard for hospitality POS sales, transaction trends, and fraud signals.');
  const [dashboard, setDashboard] = useState<ReyfinDashboardSpec>();
  const [manifest, setManifest] = useState<ReyfinAppManifest>();
  const [publishResult, setPublishResult] = useState<PublishResult>();
  const [daxResult, setDaxResult] = useState<unknown>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([fetchModel(), fetchTools(), fetchTenants()])
      .then(([contract, descriptors, tenantPlans]) => {
        setModel(contract);
        setTools(descriptors);
        setTenants(tenantPlans);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const selectedMetricSet = useMemo(() => new Set(selectedMetrics), [selectedMetrics]);
  const selectedDimensionSet = useMemo(() => new Set(selectedDimensions), [selectedDimensions]);

  const toggle = (value: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const build = async () => {
    setError(undefined);
    const spec = await generateDashboard({
      prompt,
      audience: 'executive',
      metricNames: selectedMetrics,
      dimensionNames: selectedDimensions
    });
    setDashboard(spec);
    setManifest(undefined);
    setPublishResult(undefined);
  };

  const runSmokeTest = async () => {
    setDaxResult(await executeDax('EVALUATE ROW("Status", "ok")'));
  };

  const packageApp = async () => {
    if (!dashboard) return;
    const prepared = await prepareManifest('reyfin-pos-hospitality');
    setManifest(prepared);
    setPublishResult(await publishApp('hospitality-demo-client', 'reyfin-pos-hospitality', dashboard));
  };

  return (
    <main>
      <section className="hero">
        <span className="eyebrow">Reyfin data app template</span>
        <h1>MCP-style dashboard builder for raymodel-POS-Hospitality.</h1>
        <p>Tenant-aware MCP/container gateway for ISVs to monetize on-demand Reyfin dashboards over a governed Fabric semantic model.</p>
      </section>

      {error && <p className="notice danger">{error}</p>}

      <section className="steps">
        <article className="card glow">
          <span className="step">1</span>
          <h2>Semantic model</h2>
          <p><strong>{model?.binding.semanticModelName}</strong></p>
          <p>{model?.binding.workspaceName}</p>
          <p className="small">{model?.binding.semanticModelId}</p>
          <button className="secondary" onClick={runSmokeTest}>Run DAX smoke test</button>
          {daxResult && <pre>{JSON.stringify(daxResult, null, 2)}</pre>}
        </article>

        <article className="card">
          <span className="step">2</span>
          <h2>Choose metrics and dimensions</h2>
          <textarea rows={4} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <h3>Metrics</h3>
          <div className="chips">
            {model?.metrics.map((metric) => (
              <button className={selectedMetricSet.has(metric.name) ? 'chip active' : 'chip'} key={metric.name} onClick={() => toggle(metric.name, selectedMetrics, setSelectedMetrics)}>
                {metric.displayName}
              </button>
            ))}
          </div>
          <h3>Dimensions</h3>
          <div className="chips">
            {model?.dimensions.map((dimension) => (
              <button className={selectedDimensionSet.has(dimension.name) ? 'chip active' : 'chip'} key={dimension.name} onClick={() => toggle(dimension.name, selectedDimensions, setSelectedDimensions)}>
                {dimension.displayName}
              </button>
            ))}
          </div>
          <button className="primary" onClick={build}>Generate dashboard</button>
        </article>

        <article className="card">
          <span className="step">3</span>
          <h2>Publish AppBackend</h2>
          <p>Create or update a tenant-specific Fabric AppBackend and store the dashboard manifest.</p>
          <button className="primary" disabled={!dashboard} onClick={packageApp}>Publish to Fabric</button>
          <p className="small">{tools.length} MCP-style tools available</p>
          {publishResult && (
            <div className="publish-result">
              <p><strong>Fabric item:</strong> {publishResult.appBackendDisplayName}</p>
              <p><strong>Item ID:</strong> {publishResult.appBackendItemId}</p>
              <p><strong>Manifest:</strong> {publishResult.manifestId}</p>
              <p><strong>Storage:</strong> {publishResult.storage.provider} ({publishResult.storage.status})</p>
              <p><strong>Definition:</strong> {publishResult.appBackendDefinition.status} ({publishResult.appBackendDefinition.definitionWriteStatus})</p>
              <a href={publishResult.workspaceUrl} target="_blank" rel="noreferrer">Open Fabric workspace</a>
              <small>Find item by name: {publishResult.appBackendDisplayName}</small>
            </div>
          )}
          {manifest && <details><summary>Manifest JSON</summary><pre>{JSON.stringify(manifest, null, 2)}</pre></details>}
        </article>
      </section>

      <section className="dashboard">
        <h2>ISV monetization gateway</h2>
        <div className="tenant-grid">
          {tenants.map((tenant) => (
            <div className="tenant-card" key={tenant.tenantId}>
              <strong>{tenant.displayName}</strong>
              <span>{tenant.plan} plan</span>
              <small>{tenant.usage.dashboardsGenerated}/{tenant.monthlyDashboardLimit} dashboards · {tenant.usage.daxQueriesExecuted}/{tenant.monthlyDaxQueryLimit} DAX</small>
            </div>
          ))}
        </div>
        <details>
          <summary>MCP endpoint</summary>
          <pre>{JSON.stringify({ endpoint: '/mcp', methods: ['tools/list', 'tools/call'], tenantHeader: 'x-tenant-id' }, null, 2)}</pre>
        </details>
      </section>

      {dashboard && (
        <section className="dashboard">
          <div>
            <h2>{dashboard.title}</h2>
            <p>{dashboard.agentSummary.narrative}</p>
          </div>
          <div className="visual-grid">
            {dashboard.visuals.map((visual) => (
              <div className="visual" style={{ background: `linear-gradient(135deg, ${visual.color}, #111827)` }} key={visual.id}>
                <strong>{visual.title}</strong>
                <span>{visual.type}</span>
                <small>{[visual.metric, visual.dimension].filter(Boolean).join(' · ')}</small>
              </div>
            ))}
          </div>
          <details>
            <summary>Dashboard JSON spec</summary>
            <pre>{JSON.stringify(dashboard, null, 2)}</pre>
          </details>
        </section>
      )}
    </main>
  );
}
