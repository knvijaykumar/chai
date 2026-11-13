/**
 * Privacy Gateway API Service
 * Connects directly to the verified FastAPI backend running on http://127.0.0.1:8000
 */

export const API_BASE = 'http://127.0.0.1:8000';

export interface HealthResponse {
  status: string;
  ner: string;
  app_name: string;
  version: string;
}

export interface AuditSummaryResponse {
  total_requests: number;
  by_status: {
    ok?: number;
    flagged?: number;
    rejected?: number;
    blocked?: number;
    error?: number;
    [key: string]: number | undefined;
  };
  leaks_blocked_by_type: Record<string, number>;
  placeholders_dropped_by_llm: number;
  placeholders_invented_by_llm: number;
  llm_errors_by_type: Record<string, number>;
}

export interface AuditRow {
  request_id: string;
  ts_utc: string;
  backend: string;
  model: string;
  entity_counts: Record<string, number>;
  entity_total: number;
  sanitized_payload: string;
  blocked: boolean;
  leaked_types: string[];
  restored: number;
  dropped: number;
  unknown: number;
  gateway_ms: number;
  llm_ms: number;
  status: 'ok' | 'flagged' | 'rejected' | 'blocked' | 'error';
  error: string;
}

export interface DetectedEntity {
  text: string;
  type: string;
  start?: number;
  end?: number;
  page?: number;
}

export interface ProcessTextRequest {
  text: string;
  backend?: 'mock' | 'gemini';
  mock_mode?: 'echo' | 'paraphrase' | 'reorder' | 'drop' | 'fake';
  task?: string;
  simulate?: 'none' | 'detector_miss' | 'llm_outage';
  validate_ids?: boolean;
}

export interface ProcessResponse {
  request_id: string;
  status: 'ok' | 'flagged' | 'rejected' | 'blocked' | 'error' | string;
  original_text?: string;
  sanitized_text?: string;
  outbound_payload?: string;
  llm_output?: string;
  final_text?: string;
  sanitized_prompt?: string;
  llm_response?: string;
  final_response?: string;
  entities_detected?: DetectedEntity[];
  entities?: DetectedEntity[];
  placeholders?: Record<string, string>;
  gateway_ms?: number;
  llm_ms?: number;
  blocked?: boolean;
  needs_correction?: boolean;
  invalid_ids?: Array<{
    type: string;
    value: string;
    reason: string;
    message?: string;
  }>;
  leak_check?: {
    passed: boolean;
    leaked_types: string[];
  };
  reports?: {
    internal_url?: string;
    risk_score?: number;
    risk_level?: string;
    available?: boolean;
  };
  document?: {
    filename: string;
    format: string;
    page_count: number;
    extraction_method: string;
  };
  reinsertion?: {
    restored: string[];
    dropped: string[];
    unknown: string[];
  };
}

function normalizeProcessResponse(data: any): ProcessResponse {
  const sanitized = data.sanitized_prompt || data.outbound_payload || data.sanitized_text || '';
  const finalResp = data.final_response || data.final_text || data.llm_output || '';
  const llmResp = data.llm_response || data.llm_output || '';
  const entities = data.entities_detected || data.entities || [];

  return {
    ...data,
    sanitized_prompt: sanitized,
    sanitized_text: data.sanitized_text || sanitized,
    outbound_payload: data.outbound_payload || '',
    final_response: finalResp,
    final_text: data.final_text || finalResp,
    llm_response: llmResp,
    llm_output: data.llm_output || llmResp,
    entities_detected: entities,
    entities: entities,
  };
}

export interface ExtractDocumentResponse {
  filename: string;
  format: string;
  page_count: number;
  text: string;
  extraction_method: string;
  images?: Array<{ page: number; width: number; height: number; format: string }>;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAuditSummary(): Promise<AuditSummaryResponse> {
  const res = await fetch(`${API_BASE}/audit/summary`);
  if (!res.ok) {
    throw new Error(`Audit summary failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRecentAudits(limit = 50): Promise<AuditRow[]> {
  const res = await fetch(`${API_BASE}/audit?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`Recent audit logs failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function processText(req: ProcessTextRequest): Promise<ProcessResponse> {
  const res = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backend: 'mock',
      mock_mode: 'echo',
      task: 'Summarize key entities and assess background compliance.',
      simulate: 'none',
      validate_ids: true,
      ...req,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Processing failed with status ${res.status}`);
  }
  const data = await res.json();
  return normalizeProcessResponse(data);
}

export async function extractDocument(file: File): Promise<ExtractDocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/extract-document`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Extraction failed with status ${res.status}`);
  }
  return res.json();
}

export async function processDocument(
  file: File,
  options: {
    backend?: 'mock' | 'gemini';
    mock_mode?: 'echo' | 'paraphrase' | 'reorder' | 'drop' | 'fake';
    task?: string;
    validate_ids?: boolean;
  } = {}
): Promise<ProcessResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('backend', options.backend || 'mock');
  formData.append('mock_mode', options.mock_mode || 'echo');
  formData.append('task', options.task || 'Summarize key entities and assess background compliance.');
  formData.append('validate_ids', String(options.validate_ids !== false));

  const res = await fetch(`${API_BASE}/process-document`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Document processing failed with status ${res.status}`);
  }
  const data = await res.json();
  return normalizeProcessResponse(data);
}

export function getInternalReportDownloadUrl(requestId: string, role = 'authorized'): string {
  return `${API_BASE}/reports/internal/${encodeURIComponent(requestId)}?role=${encodeURIComponent(role)}`;
}

