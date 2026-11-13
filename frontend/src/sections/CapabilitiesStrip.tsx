import React from 'react';
import { Search, ShieldAlert, Cpu, RefreshCw, FileSearch } from 'lucide-react';

export const CapabilitiesStrip: React.FC = () => {
  const capabilities = [
    {
      title: 'Local PII Detection',
      desc: 'Presidio & GLiNER scanning in-memory',
      icon: Search,
      tag: 'Local NER',
    },
    {
      title: 'Consistent Data Masking',
      desc: 'Deterministic typed <TYPE_N> tokens',
      icon: Cpu,
      tag: 'Typed Placeholders',
    },
    {
      title: 'Outbound Leak Protection',
      desc: 'Active guard blocking unmasked transmission',
      icon: ShieldAlert,
      tag: 'Pre-flight Gate',
    },
    {
      title: 'Local Data Reinsertion',
      desc: 'Safe response reconstruction on perimeter',
      icon: RefreshCw,
      tag: 'Client Restoration',
    },
    {
      title: 'Audit Traceability',
      desc: 'Request hashes logged without raw PII',
      icon: FileSearch,
      tag: 'Zero-PII Logs',
    },
  ];

  return (
    <section className="relative z-10 py-6 border-y border-slate-800/90 bg-[#070b14] text-slate-300 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className={`flex flex-col pt-3 md:pt-0 ${
                  idx > 0 ? 'md:pl-5 lg:pl-6' : ''
                } group text-left`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded-md bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors flex-shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    {cap.tag}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 tracking-tight group-hover:text-orange-400 transition-colors">
                  {cap.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                  {cap.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
