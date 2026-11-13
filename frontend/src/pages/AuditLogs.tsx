import React, { useState, useEffect } from 'react';
import { 
  fetchRecentAudits, 
  fetchAuditSummary, 
  AuditRow, 
  AuditSummaryResponse 
} from '../services/api';
import { 
  ShieldCheck, 
  RefreshCw, 
  Download
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [summary, setSummary] = useState<AuditSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const [l, s] = await Promise.all([
        fetchRecentAudits(100),
        fetchAuditSummary(),
      ]);
      setLogs(l);
      setSummary(s);
    } catch {
      setLogs([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (selectedTypeFilter === 'all') return true;
    return Object.keys(log.entity_counts).includes(selectedTypeFilter);
  });

  const exportCsv = () => {
    if (logs.length === 0) return;
    const headers = ['Request ID', 'Timestamp (UTC)', 'Status', 'Model', 'Total Entities', 'Entity Counts', 'Gateway MS', 'LLM MS'];
    const rows = logs.map(l => [
      l.request_id,
      l.ts_utc,
      l.status,
      l.model || l.backend,
      l.entity_total,
      JSON.stringify(l.entity_counts),
      l.gateway_ms,
      l.llm_ms,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `privacy_gateway_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Tamper-Evident Audit Logs
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Immutable, zero-PII compliance logs aligned with India DPDP Act and ISO 27001 data integrity standards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Audit CSV</span>
          </button>

          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="p-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Stats Banner */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#090e1a] border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Logged In Database</span>
            <span className="text-2xl font-black text-white font-mono">{summary.total_requests}</span>
            <span className="text-[10px] text-slate-500 block mt-1 font-mono">SQLite (audit.db)</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#090e1a] border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Clean Egress</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{summary.by_status.ok || 0}</span>
            <span className="text-[10px] text-slate-500 block mt-1 font-mono">100% Restored</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#090e1a] border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Leaks Intercepted</span>
            <span className="text-2xl font-black text-orange-400 font-mono">{summary.by_status.blocked || 0}</span>
            <span className="text-[10px] text-slate-500 block mt-1 font-mono">Fail-Closed Gate</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#090e1a] border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Dropped by LLM</span>
            <span className="text-2xl font-black text-amber-400 font-mono">{summary.placeholders_dropped_by_llm}</span>
            <span className="text-[10px] text-slate-500 block mt-1 font-mono">Audit Flagged</span>
          </div>
        </div>
      )}

      {/* Strict Privacy Guarantee Box */}
      <div className="p-4 rounded-2xl bg-[#080d1a] border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong>Zero Raw PII Storage Guarantee:</strong> The audit log records cryptographic hashes, latency, entity counts, and sanitized payloads only. Original names, phone numbers, and statutory IDs are NEVER persisted to the audit database.
          </span>
        </div>
      </div>

      {/* Filter by Detected Type */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-mono text-[11px] uppercase mr-1">Filter Entity:</span>
        {['all', 'PERSON', 'AADHAAR', 'PAN', 'PHONE', 'EMAIL', 'PASSPORT', 'VOTER_ID'].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTypeFilter(t)}
            className={`px-3 py-1 rounded-full font-mono text-xs transition-colors ${
              selectedTypeFilter === t
                ? 'bg-orange-500 text-white font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#090e1a] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Request Hash</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Detected Types</th>
                <th className="py-3 px-4">Sanitized Outbound Prompt</th>
                <th className="py-3 px-4 text-right">Timings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    Loading audit records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    No audit records matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.request_id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-orange-400">
                      {log.request_id.slice(0, 12)}...
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {log.ts_utc}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        log.status === 'blocked' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {Object.entries(log.entity_counts).map(([k, v]) => (
                        <span key={k} className="inline-block mr-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-950 text-slate-300 border border-slate-800">
                          {k}: {v}
                        </span>
                      ))}
                      {log.entity_total === 0 && <span className="text-slate-600">None</span>}
                    </td>
                    <td className="py-3 px-4 text-[11px] max-w-xs truncate text-slate-400" title={log.sanitized_payload}>
                      {log.sanitized_payload || <span className="text-rose-400 italic">[Blocked: zero bytes sent]</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-slate-400">
                      {log.gateway_ms + log.llm_ms}ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
