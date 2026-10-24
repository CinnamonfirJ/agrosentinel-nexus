export type Receipt = {
  id: string;
  scan_id: string;
  kind: string;
  query: string;
  url: string;
  title: string;
  content: string;
  retrieved: number;
  provider: string;
};
export type Decision = {
  verdict: string;
  rationale: string;
  severity: "unknown" | "caution" | "stop" | "act";
  steps: { action: string; source_ids: string[] }[];
  source_ids: string[];
  warnings: string[];
  spray_deferred: boolean;
  model: string;
  created: number;
  grounded: boolean;
  diagnosis: {
    crop: string;
    disease: string;
    confidence: number;
    observations: string[];
    is_leaf: boolean;
    model: string;
  };
  economics: null | {
    default_cost: number;
    plan_cost: number;
    saving: number;
    currency: string;
    method: string;
  };
  weather: unknown;
};
export type Scan = {
  revision_id?: string;
  id: string;
  client_id: string;
  created: number;
  updated: number;
  region: string;
  crop: string;
  note: string;
  lat: number | null;
  lon: number | null;
  status: string;
  stage: number;
  attempts: number;
  error: string | null;
  result: Decision | null;
  image_url: string;
  sources?: Receipt[];
  events?: {
    id: number;
    kind: string;
    created: number;
    payload: Record<string, unknown>;
  }[];
};
export type LedgerRow = {
  id: string;
  scan_id: string;
  created: number;
  query: string;
  result: string;
  impact: string;
  saving: number | null;
  currency: string;
  type: string;
  source_ids: string[];
};
export type Member = { id: string; name: string; email: string; role: string };
export type Workspace = {
  bounds?:number[];
  region: string;
  updated: number;
  clusters: {
    id: number;
    key: string;
    name: string;
    country: string;
    disease: string;
    crop: string;
    count: number;
    lat: number;
    lon: number;
    x: number;
    y: number;
    level: 1 | 2 | 3 | 4;
    scan_ids: string[];
    verdict: string;
  }[];
  scans: Scan[];
  ledger: LedgerRow[];
  kpis: {
    detections: number;
    clusters: number;
    prevented: number;
    savings: Record<string, number>;
    checks: number;
  };
  assignments: {
    id: string;
    cluster_key: string;
    assignee: string;
    note: string;
    status: string;
  }[];
};
