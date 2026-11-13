import React from 'react';
import { AuditRow, getInternalReportDownloadUrl } from '../../services/api';
import { FileDown, ArrowRight, Clock, Inbox } from 'lucide-react';
import { Link } from '../../services/router';

interface RecentRequestsTableProps {
  requests: AuditRow[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export const RecentRequestsTable: React.FC<RecentRequestsTableProps> = ({
  requests,
  isLoading,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            SUCCESS (OK)
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            LEAK BLOCKED
          </span>
        );
      case 'flagged':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            FLAGGED (LLM DROPPED)
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            REJECTED (INVALID ID)
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            ERROR (OUTAGE)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="rounded-2xl bg-[#090e1a] border border-slate-800 shadow-xl overflow-hidden text-left">
      {/* Table Header Card */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">
            Recent Processed Requests
          </h3>
          <p className="text-xs text-slate-400">
            Real-time requests logged to immutable audit database (Zero raw PII stored)
          </p>
        </div>

        <Link
          to="/app/history"
          className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 transition-colors"
        >
          <span>View All in History</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800/80">
            <tr>
              <th className="py-3 px-4">Request ID</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Detected PII</th>
              <th className="py-3 px-4">Model & Latency</th>
              <th className="py-3 px-4">Timestamp (UTC)</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500 font-sans">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 animate-spin text-orange-500" />
                    <span>Loading audit records from database...</span>
                  </div>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Inbox className="h-8 w-8 text-slate-600" />
                    <span className="font-semibold text-slate-400">No Request Records Found</span>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Audit database is currently empty or awaiting requests. Create a new request to generate tamper-evident privacy logs.
                    </p>
                    <Link
                      to="/app/new-request"
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-bold hover:bg-orange-500 hover:text-white transition-colors"
                    >
                      Process First Request
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((row) => (
                <tr key={row.request_id} className="hover:bg-slate-900/50 transition-colors">
                  {/* Request ID */}
                  <td className="py-3.5 px-4 font-bold text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="text-orange-400/90 font-mono text-[11px]">
                        {row.request_id.slice(0, 10)}...
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(row.status)}
                  </td>

                  {/* Detected PII */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">
                        {row.entity_total}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        ({Object.entries(row.entity_counts).map(([k, v]) => `${k}:${v}`).join(', ') || 'None'})
                      </span>
                    </div>
                  </td>

                  {/* Model & Latency */}
                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="text-[11px] font-sans font-medium text-slate-200">
                      {row.model || row.backend}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Perimeter: {row.gateway_ms}ms · LLM: {row.llm_ms}ms
                    </div>
                  </td>

                  {/* Timestamp */}
                  <td className="py-3.5 px-4 text-[11px] text-slate-400">
                    {formatTimestamp(row.ts_utc)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {row.status === 'ok' ? (
                        <a
                          href={getInternalReportDownloadUrl(row.request_id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-orange-500 hover:text-white text-slate-300 text-[10px] font-sans font-bold transition-colors"
                          title="Download Confidential Risk Assessment PDF"
                        >
                          <FileDown className="h-3 w-3" />
                          <span>PDF Report</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-sans italic">
                          Report Restricted
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
