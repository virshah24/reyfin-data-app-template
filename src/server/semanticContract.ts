import type { SemanticContract } from '../shared/types.js';

export const semanticContract: SemanticContract = {
  binding: {
    workspaceId: process.env.FABRIC_WORKSPACE_ID ?? '7409c81f-4e8d-4c5c-84b6-a1f2d24a0221',
    workspaceName: 'rayfin-apps-ws',
    semanticModelId: process.env.FABRIC_SEMANTIC_MODEL_ID ?? '02b15314-4009-423c-8e4c-7c0458d4d076',
    semanticModelName: process.env.FABRIC_SEMANTIC_MODEL_NAME ?? 'raymodel-POS-Hospitality',
    modelUrl: 'https://app.powerbi.com/groups/7409c81f-4e8d-4c5c-84b6-a1f2d24a0221/modeling/02b15314-4009-423c-8e4c-7c0458d4d076/modelView?experience=fabric-developer&subfolderId=87779'
  },
  metrics: [
    {
      name: 'transactionCount',
      displayName: 'Transaction count',
      description: 'Count of hospitality POS transactions or events.',
      defaultDax: 'EVALUATE ROW("Transaction count", 1)',
      allowedVisuals: ['kpi', 'line', 'bar']
    },
    {
      name: 'salesAmount',
      displayName: 'Sales amount',
      description: 'Revenue or sales value for hospitality POS activity.',
      defaultDax: 'EVALUATE ROW("Sales amount", 1)',
      allowedVisuals: ['kpi', 'line', 'bar', 'table']
    },
    {
      name: 'fraudSignals',
      displayName: 'Fraud signals',
      description: 'Suspicious transaction or fraud-detection signal count.',
      defaultDax: 'EVALUATE ROW("Fraud signals", 0)',
      allowedVisuals: ['kpi', 'bar', 'table']
    },
    {
      name: 'averageTicket',
      displayName: 'Average ticket',
      description: 'Average transaction value across hospitality POS activity.',
      defaultDax: 'EVALUATE ROW("Average ticket", 1)',
      allowedVisuals: ['kpi', 'line']
    }
  ],
  dimensions: [
    { name: 'location', displayName: 'Location', description: 'Store, venue, or hotel location.' },
    { name: 'time', displayName: 'Time', description: 'Business date, hour, or reporting interval.' },
    { name: 'paymentType', displayName: 'Payment type', description: 'Card, cash, mobile wallet, or other tender type.' },
    { name: 'productCategory', displayName: 'Product category', description: 'Hospitality product, menu, or service category.' }
  ],
  assumptions: [
    'Fabric public item definition API confirms the semantic model item but does not expose table metadata for this model.',
    'DAX execution works for safe queries using the Power BI executeQueries endpoint.',
    'Default DAX snippets are placeholders that should be replaced with model-specific measures after schema discovery or author input.'
  ]
};
