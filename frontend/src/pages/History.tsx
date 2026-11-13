import React, { useState, useEffect } from 'react';
import { 
  fetchRecentAudits, 
  AuditRow, 
  getInternalReportDownloadUrl 
} from '../services/api';
import { 
  Search, 
  FileDown, 
  Clock, 
  RefreshCw, 
  Eye, 
  X, 
  Layers,
  Inbox
} from 'lucide-react';

export const History: React.FC = () => {
  const [requests, setRequests] = useState<AuditRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [backendFilter, setBackendFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<AuditRow | null>(null);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRecentAudits(200);
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Filter requests
  const filtered = requests.filter((r) => {
    const matchesSearch = 
      r.request_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.sanitized_payload.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Object.keys(r.entity_counts).some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesBackend = backendFilter === 'all' || r.backend.toLowerCase().includes(backendFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesBackend;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">SUCCESS (OK)</span>;
      case 'blocked':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">LEAK BLOCKED</span>;
      case 'flagged':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">FLAGGED</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">REJECTED</span>;
      case 'error':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">ERROR</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Request History & Audit Log
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Searchable, tamper-evident audit logs of all processed requests. Raw personal data is never retained.
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#090e1a] p-4 rounded-2xl border border-slate-800">
        {/* Search Input */}
        <div className="sm:col-span-6 relative">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search request ID, entity type, sanitized payload..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors font-mono"
          >
            <option value="all">Status: All Outcomes</option>
            <option value="ok">Status: Success (OK)</option>
            <option value="blocked">Status: Leak Blocked</option>
            <option value="flagged">Status: Flagged</option>
            <option value="rejected">Status: Rejected ID</option>
            <option value="error">Status: LLM Error</option>
          </select>
        </div>

        {/* Backend Filter */}
        <div className="sm:col-span-3">
          <select
            value={backendFilter}
            onChange={(e) => setBackendFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors font-mono"
          >
            <option value="all">Backend: All Models</option>
            <option value="mock">Backend: Mock</option>
            <option value="gemini">Backend: Gemini</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-[#090e1a] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Entity Types</th>
                <th className="py-3 px-4">Model & Timings</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4 animate-spin text-orange-500" />
                      <span>Loading records from audit database...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Inbox className="h-8 w-8 text-slate-600" />
                      <span className="font-semibold text-slate-400">No Matching Audit Records Found</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchQuery || statusFilter !== 'all' || backendFilter !== 'all'
                          ? 'Try clearing your filters or search terms.'
                          : 'No requests have been logged yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.request_id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-orange-400/90 font-mono text-[11px]">
                      {row.request_id.slice(0, 14)}...
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {row.ts_utc}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-white font-bold mr-1">{row.entity_total}</span>
                      <span className="text-slate-500 text-[10px]">
                        ({Object.keys(row.entity_counts).join(', ') || 'None'})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-300">
                      <div>{row.model || row.backend}</div>
                      <div className="text-[10px] text-slate-500">
                        P: {row.gateway_ms}ms · L: {row.llm_ms}ms
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans font-semibold transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 text-left relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 uppercase">Audit Record:</span>
                  <span className="font-mono text-xs font-bold text-orange-400">
                    {selectedRecord.request_id}
                  </span>
                </div>
                <div className="mt-1">
                  {getStatusBadge(selectedRecord.status)}
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Total Entities</span>
                <span className="text-sm font-bold text-white">{selectedRecord.entity_total}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Restored</span>
                <span className="text-sm font-bold text-emerald-400">{selectedRecord.restored}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Perimeter MS</span>
                <span className="text-sm font-bold text-white">{selectedRecord.gateway_ms}ms</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">LLM MS</span>
                <span className="text-sm font-bold text-white">{selectedRecord.llm_ms}ms</span>
              </div>
            </div>

            {/* Sanitized Outbound Payload */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-mono text-slate-300 uppercase flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-orange-400" />
                <span>Sanitized Payload (What Left The Perimeter)</span>
              </label>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {selectedRecord.sanitized_payload || (
                  <span className="text-rose-400 italic">
                    [EMPTY PAYLOAD] Request was blocked by fail-closed leak guard before any bytes left perimeter.
                  </span>
                )}
              </div>
            </div>

            {/* Download Internal Risk Assessment Report */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              {selectedRecord.status === 'ok' ? (
                <a
                  href={getInternalReportDownloadUrl(selectedRecord.request_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs shadow-md transition-colors"
                >
                  <FileDown className="h-4 w-4 text-slate-950" />
                  <span>Download Internal PII Risk Assessment PDF</span>
                </a>
              ) : (
                <span className="text-xs text-slate-500 italic">
                  Report unavailable for failed or blocked requests.
                </span>
              )}

              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-full border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
