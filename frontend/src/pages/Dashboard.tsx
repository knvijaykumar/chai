import React, { useState, useEffect } from 'react';
import { 
  fetchAuditSummary, 
  fetchRecentAudits, 
  fetchHealth,
  AuditSummaryResponse, 
  AuditRow 
} from '../services/api';
import { SecurityStatusGrid } from '../components/dashboard/SecurityStatusGrid';
import { RecentRequestsTable } from '../components/dashboard/RecentRequestsTable';
import { PlusCircle, ShieldAlert, RefreshCw } from 'lucide-react';
import { Link } from '../services/router';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<AuditSummaryResponse | null>(null);
  const [recentRequests, setRecentRequests] = useState<AuditRow[]>([]);
  const [nerBackend, setNerBackend] = useState<string>('presidio+gliner');
  const [isHealthy, setIsHealthy] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Health
      try {
        const h = await fetchHealth();
        setIsHealthy(h.status === 'ok');
        if (h.ner) setNerBackend(h.ner);
      } catch {
        setIsHealthy(false);
      }

      // 2. Audit Summary
      try {
        const s = await fetchAuditSummary();
        setSummary(s);
      } catch {
        setSummary(null);
      }

      // 3. Recent Audits
      try {
        const r = await fetchRecentAudits(10);
        setRecentRequests(r);
      } catch {
        setRecentRequests([]);
      }
    } catch {
      // Backend unreachable; status card will report offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const leaksBlockedCount = summary?.by_status?.blocked || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* ========================================================
          1. WELCOME SECTION
      ======================================================== */}
      <div className="rounded-3xl bg-gradient-to-r from-[#090e1a] via-[#0b1222] to-[#090e1a] border border-slate-800 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden text-left">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span>Perimeter Operations Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Privacy Gateway Overview
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
            Monitor your privacy operations and manage secure AI requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          </button>

          <Link
            to="/app/new-request"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all hover:scale-105"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create New Request</span>
          </Link>
        </div>
      </div>

      {/* Backend connection warning if offline */}
      {!isHealthy && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center justify-between text-left">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>
              Backend API at <code>http://127.0.0.1:8000</code> is currently offline or unreachable. Please start the Uvicorn server to load live operational statistics.
            </span>
          </div>
          <span className="font-mono text-[11px] bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700">
            OFFLINE
          </span>
        </div>
      )}

      {/* ========================================================
          2. SECURITY ENGINE OVERVIEW
      ======================================================== */}
      <SecurityStatusGrid
        nerBackend={nerBackend}
        isHealthy={isHealthy}
        leaksBlockedCount={leaksBlockedCount}
      />

      {/* ========================================================
          3. RECENT REQUESTS TABLE
      ======================================================== */}
      <RecentRequestsTable
        requests={recentRequests}
        isLoading={isLoading}
        onRefresh={loadDashboardData}
      />

    </div>
  );
};
