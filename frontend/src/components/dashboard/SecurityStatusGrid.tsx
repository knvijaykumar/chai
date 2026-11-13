import React from 'react';
import { ShieldCheck, Search, Cpu, ShieldAlert, Cloud, Database } from 'lucide-react';

interface SecurityStatusGridProps {
  nerBackend: string;
  isHealthy: boolean;
  leaksBlockedCount: number;
}

export const SecurityStatusGrid: React.FC<SecurityStatusGridProps> = ({
  nerBackend,
  isHealthy,
  leaksBlockedCount,
}) => {
  const securityEngines = [
    {
      name: 'PII Detection Engine',
      provider: isHealthy ? `Active (${nerBackend})` : 'Offline',
      detail: 'Presidio contextual rules + GLiNER zero-shot transformer in local RAM',
      icon: Search,
      status: isHealthy ? 'healthy' : 'disconnected',
      statusText: isHealthy ? 'Operational' : 'Unavailable',
    },
    {
      name: 'Consistent Masking Engine',
      provider: 'Deterministic <TYPE_N>',
      detail: 'Bi-directional token mapping isolated ephemerally per request session',
      icon: Cpu,
      status: 'healthy',
      statusText: 'Armed',
    },
    {
      name: 'Outbound Leak Guard',
      provider: 'Fail-Closed Gate',
      detail: `${leaksBlockedCount} outbound leak(s) intercepted; 0 raw values sent`,
      icon: ShieldAlert,
      status: 'healthy',
      statusText: 'Armed (Fail-Closed)',
    },
    {
      name: 'AI Model Connection',
      provider: 'Mock / Gemini Gateway',
      detail: 'Only sanitized payloads with abstract placeholders dispatched',
      icon: Cloud,
      status: isHealthy ? 'healthy' : 'disconnected',
      statusText: isHealthy ? 'Ready' : 'Not Connected',
    },
    {
      name: 'Tamper-Evident Audit DB',
      provider: 'SQLite (audit.db)',
      detail: 'Cryptographic request IDs logged without storing raw personal data',
      icon: Database,
      status: isHealthy ? 'healthy' : 'unknown',
      statusText: isHealthy ? 'Logging Active' : 'Check Database',
    },
  ];

  return (
    <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 shadow-xl text-left">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Perimeter Security Engine Status
            </h3>
            <p className="text-xs text-slate-400">
              Real-time operational verification across zero-trust privacy boundaries
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          Zero-Trust Boundary
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {securityEngines.map((engine) => {
          const Icon = engine.icon;
          const isOk = engine.status === 'healthy';

          return (
            <div
              key={engine.name}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      isOk
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    {engine.statusText}
                  </span>
                </div>

                <div className="text-xs font-bold text-white truncate">
                  {engine.name}
                </div>
                <div className="text-[11px] font-mono text-orange-400/90 font-medium mt-0.5">
                  {engine.provider}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800/80 leading-snug">
                {engine.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

