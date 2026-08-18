import type { DashboardVisualSpec, ReyfinDashboardSpec } from '../shared/types.js';

export interface ReyfinWidgetAdapterResult {
  widgetCount: number;
  widgetTitles: string[];
  adapterNotes: string[];
}

interface KqlDashboardDefinition {
  pages?: Array<{ id: string; name?: string }>;
  tiles?: KqlTile[];
  queries?: KqlQuery[];
  [key: string]: unknown;
}

interface KqlTile {
  id: string;
  title: string;
  visualType: string;
  pageId?: string;
  layout?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  queryRef?: {
    kind: string;
    queryId: string;
  };
  [key: string]: unknown;
}

interface KqlQuery {
  id: string;
  displayName?: string | null;
  text: string;
  [key: string]: unknown;
}

const visualTypeMap: Record<DashboardVisualSpec['type'], string> = {
  kpi: 'table',
  bar: 'barchart',
  line: 'timechart',
  table: 'table',
  'agent-summary': 'table'
};

export function adaptSemanticDashboardToKqlDashboard(
  currentDefinition: unknown,
  dashboardSpec: ReyfinDashboardSpec
): { definition: unknown; result: ReyfinWidgetAdapterResult } {
  const definition = currentDefinition as KqlDashboardDefinition;
  const currentTiles = definition.tiles ?? [];
  const currentQueries = definition.queries ?? [];
  const pageId = definition.pages?.[0]?.id ?? currentTiles[0]?.pageId ?? crypto.randomUUID();
  const visuals = dashboardSpec.visuals.slice(0, 8);

  if (definition.pages?.[0]) {
    definition.pages[0].name = dashboardSpec.title;
  }

  definition.tiles = visuals.map((visual, index) => {
    const baseTile = currentTiles[index] ?? currentTiles[0] ?? {
      id: crypto.randomUUID(),
      queryRef: { kind: 'query', queryId: crypto.randomUUID() },
      layout: {}
    };
    const queryId = currentQueries[index]?.id ?? baseTile.queryRef?.queryId ?? crypto.randomUUID();
    return {
      ...baseTile,
      id: baseTile.id ?? crypto.randomUUID(),
      title: visual.title,
      visualType: visualTypeMap[visual.type],
      pageId,
      layout: layoutFor(index, visual.type),
      queryRef: {
        kind: 'query',
        queryId
      }
    };
  });

  definition.queries = visuals.map((visual, index) => {
    const queryId = definition.tiles?.[index]?.queryRef?.queryId ?? currentQueries[index]?.id ?? crypto.randomUUID();
    return {
      ...(currentQueries[index] ?? {}),
      id: queryId,
      displayName: visual.title,
      text: buildKqlForVisual(visual, dashboardSpec)
    };
  });

  return {
    definition,
    result: {
      widgetCount: visuals.length,
      widgetTitles: visuals.map((visual) => visual.title),
      adapterNotes: [
        'KQL dashboard tiles are generated from the Reyfin semantic dashboard spec.',
        'Each tile preserves the selected semantic metric, dimension, and source DAX as metadata in the KQL result.',
        'Replace the placeholder KQL bridge with a native Reyfin semantic visual renderer when that Fabric API is available.'
      ]
    }
  };
}

function layoutFor(index: number, type: DashboardVisualSpec['type']) {
  if (index === 0 && type === 'kpi') return { x: 0, y: 0, width: 8, height: 6 };
  if (index === 1) return { x: 8, y: 0, width: 16, height: 6 };
  const row = Math.floor((index - 2) / 2);
  const col = (index - 2) % 2;
  return { x: col * 12, y: 6 + row * 7, width: 12, height: 7 };
}

function buildKqlForVisual(visual: DashboardVisualSpec, dashboardSpec: ReyfinDashboardSpec): string {
  const metric = visual.metric ?? 'agentSummary';
  const dimension = visual.dimension ?? 'none';
  const escapedTitle = escapeKqlString(visual.title);
  const escapedMetric = escapeKqlString(metric);
  const escapedDimension = escapeKqlString(dimension);
  const escapedModel = escapeKqlString(dashboardSpec.modelBinding.semanticModelName);
  const escapedDax = escapeKqlString(visual.dax ?? 'n/a');

  if (visual.type === 'bar' || visual.type === 'line') {
    return `// Reyfin semantic visual adapter\n// Source DAX: ${visual.dax ?? 'n/a'}\ndatatable(['${dimension}']:string, ['${visual.title}']:long, Metric:string, SemanticModel:string)\n[\n  'Lobby', 42, '${escapedMetric}', '${escapedModel}',\n  'Restaurant', 35, '${escapedMetric}', '${escapedModel}',\n  'Bar', 18, '${escapedMetric}', '${escapedModel}',\n  'Room Service', 12, '${escapedMetric}', '${escapedModel}'\n]`;
  }

  if (visual.type === 'agent-summary') {
    return `// Reyfin semantic visual adapter\nprint Title='${escapedTitle}', Summary='${escapeKqlString(dashboardSpec.agentSummary.narrative)}', SemanticModel='${escapedModel}'`;
  }

  return `// Reyfin semantic visual adapter\nprint Title='${escapedTitle}', Metric='${escapedMetric}', Dimension='${escapedDimension}', Value=1, SemanticModel='${escapedModel}', SourceDax='${escapedDax}'`;
}

function escapeKqlString(value: string) {
  return value.replace(/'/g, "''");
}
