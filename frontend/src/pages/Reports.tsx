import React, { useState, useEffect } from 'react';
import { 
  fetchAuditSummary, 
  fetchRecentAudits, 
  AuditSummaryResponse, 
  AuditRow,
  getInternalReportDownloadUrl
} from '../services/api';
import { 
  BarChart3, 
  PieChart, 
  FileDown, 
  RefreshCw,
  Inbox
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [summary, setSummary] = useState<AuditSummaryResponse | null>(null);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [s, a] = await Promise.all([
        fetchAuditSummary(),
        fetchRecentAudits(100),
      ]);
      setSummary(s);
      setAudits(a);
    } catch {
      setSummary(null);
      setAudits([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Aggregate entity types from real audit rows
  const entityDistribution: Record<string, number> = {};
  audits.forEach((row) => {
    Object.entries(row.entity_counts).forEach(([type, count]) => {
      entityDistribution[type] = (entityDistribution[type] || 0) + count;
    });
  });

  const totalEntitiesDetected = Object.values(entityDistribution).reduce((a, b) => a + b, 0);

  // Success rate calculation
  const totalRequests = summary?.total_requests || 0;
  const okRequests = summary?.by_status?.ok || 0;
  const successRate = totalRequests > 0 ? ((okRequests / totalRequests) * 100).toFixed(1) : '100.0';

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Compliance Reports & Analytics
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Aggregated metrics derived exclusively from local SQLite audit trails and confidential internal PDF risk assessments.
          </p>
        </div>

        <button
          onClick={loadReportData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-[#090e1a] border border-slate-800">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Total Processed Volume</span>
          <div className="text-3xl font-black text-white font-mono mt-1">{totalRequests}</div>
          <span className="text-xs text-slate-400 mt-1 block">Lifetime requests processed</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#090e1a] border border-slate-800">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Compliance Success Rate</span>
          <div className="text-3xl font-black text-emerald-400 font-mono mt-1">{successRate}%</div>
          <span className="text-xs text-slate-400 mt-1 block">{okRequests} requests without anomalies</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#090e1a] border border-slate-800">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Total PII Entities Masked</span>
          <div className="text-3xl font-black text-orange-400 font-mono mt-1">{totalEntitiesDetected}</div>
          <span className="text-xs text-slate-400 mt-1 block">Aadhaar, PAN, names, contacts</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#090e1a] border border-slate-800">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Leaks Blocked (Fail-Closed)</span>
          <div className="text-3xl font-black text-rose-400 font-mono mt-1">{summary?.by_status?.blocked || 0}</div>
          <span className="text-xs text-slate-400 mt-1 block">Zero unauthorized transmissions</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Entity Distribution Breakdown (Cols 1-7) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#090e1a] border border-slate-800 p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Detected PII Entity Distribution
              </h3>
              <p className="text-xs text-slate-400">
                Breakdown of protected Indian statutory and contact identity categories
              </p>
            </div>
            <PieChart className="h-4 w-4 text-orange-400" />
          </div>

          {Object.keys(entityDistribution).length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Inbox className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <span className="text-xs font-semibold block text-slate-400">No Entity Data Available</span>
              <p className="text-[11px] text-slate-500">Process requests to view real-time category distributions.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {Object.entries(entityDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const pct = totalEntitiesDetected > 0 ? ((count / totalEntitiesDetected) * 100).toFixed(0) : 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-300 font-bold">{type}</span>
                        <span className="text-orange-400">{count} occurrences ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right: Processing Outcome Statuses (Cols 8-12) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#090e1a] border border-slate-800 p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Processing Outcomes
              </h3>
              <p className="text-xs text-slate-400">
                Real status breakdown from audit summary
              </p>
            </div>
            <BarChart3 className="h-4 w-4 text-orange-400" />
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-emerald-400 font-bold">SUCCESS (OK)</span>
              <span className="text-white font-bold">{summary?.by_status?.ok || 0}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-rose-400 font-bold">LEAK BLOCKED</span>
              <span className="text-white font-bold">{summary?.by_status?.blocked || 0}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-amber-400 font-bold">FLAGGED (DROPPED/UNKNOWN)</span>
              <span className="text-white font-bold">{summary?.by_status?.flagged || 0}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-amber-400 font-bold">REJECTED (INVALID ID)</span>
              <span className="text-white font-bold">{summary?.by_status?.rejected || 0}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-rose-400 font-bold">LLM ERRORS</span>
              <span className="text-white font-bold">{summary?.by_status?.error || 0}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Available Downloadable Confidential Risk Reports */}
      <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Confidential Internal Risk Assessment PDF Reports
            </h3>
            <p className="text-xs text-slate-400">
              Download official compliance PDF reports with natural language document summary and visual PII risk mapping
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
            Role: Authorized Employee
          </span>
        </div>

        {audits.filter(a => a.status === 'ok').length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No completed requests available for PDF generation yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {audits.filter(a => a.status === 'ok').slice(0, 6).map((req) => (
              <div
                key={req.request_id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-mono font-bold text-white truncate max-w-[180px]">
                    {req.request_id}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {req.entity_total} PII entities · {req.ts_utc.slice(0, 10)}
                  </div>
                </div>

                <a
                  href={getInternalReportDownloadUrl(req.request_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs shadow transition-colors"
                >
                  <FileDown className="h-3 w-3" />
                  <span>PDF</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
