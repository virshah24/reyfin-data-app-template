import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { DashboardRequest, ReyfinDashboardSpec } from '../shared/types.js';
import { generateDashboardSpec, mcpTools, prepareReyfinAppManifest } from './dashboardAgent.js';
import { executeDaxQuery } from './fabric.js';
import { semanticContract } from './semanticContract.js';

const clientDist = path.join(process.cwd(), 'dist', 'client');
const indexHtml = path.join(clientDist, 'index.html');

let lastDashboardSpec: ReyfinDashboardSpec | undefined;

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/readyz', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      checks: [
        { name: 'semantic-model-binding', passed: Boolean(semanticContract.binding.semanticModelId) },
        { name: 'mcp-tools', passed: mcpTools.length > 0 }
      ]
    });
  });

  app.get('/api/model', (_req: Request, res: Response) => {
    res.json(semanticContract);
  });

  app.get('/api/tools', (_req: Request, res: Response) => {
    res.json({ tools: mcpTools });
  });

  app.post('/api/tools/generate-dashboard', (req: Request, res: Response) => {
    const body = req.body as Partial<DashboardRequest>;
    const spec = generateDashboardSpec({
      prompt: body.prompt ?? 'Build a hospitality POS dashboard.',
      audience: body.audience ?? 'executive',
      metricNames: body.metricNames ?? [],
      dimensionNames: body.dimensionNames ?? []
    });
    lastDashboardSpec = spec;
    res.status(201).json({ dashboardSpec: spec });
  });

  app.post('/api/tools/execute-dax', async (req: Request, res: Response) => {
    try {
      const body = req.body as { query?: string };
      const result = await executeDaxQuery(body.query ?? 'EVALUATE ROW("Status", "ok")');
      res.json({ result });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'DAX query failed' });
    }
  });

  app.post('/api/tools/prepare-reyfin-app', (req: Request, res: Response) => {
    const appName = String((req.body as { appName?: string }).appName ?? 'reyfin-pos-hospitality');
    const dashboardSpec = lastDashboardSpec ?? generateDashboardSpec({
      prompt: 'Build a hospitality POS dashboard.',
      audience: 'executive',
      metricNames: [],
      dimensionNames: []
    });
    res.status(201).json({ manifest: prepareReyfinAppManifest(appName, dashboardSpec) });
  });

  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
  }

  app.get('*', (_req: Request, res: Response) => {
    if (existsSync(indexHtml)) {
      res.sendFile(indexHtml);
      return;
    }
    res.status(200).json({ name: 'Reyfin Data App Template API' });
  });

  return app;
}
