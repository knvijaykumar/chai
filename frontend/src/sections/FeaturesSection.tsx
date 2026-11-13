import React from 'react';
import { 
  ScanFace, 
  Binary, 
  ShieldAlert, 
  RefreshCw, 
  FileCheck2, 
  History,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      title: 'Intelligent PII Detection',
      category: 'Hybrid Recognition Engine',
      icon: ScanFace,
      iconColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      description:
        'Dual-layer recognition identifies Indian names, phone numbers, email addresses, residential addresses, and statutory tokens (Aadhaar, PAN, passport, and voter IDs) with Verhoeff algorithmic validation.',
      bulletPoints: [
        'Presidio contextual rule analyzers & regex',
        'GLiNER zero-shot transformer NER',
        'Strict format and checksum verification',
      ],
    },
    {
      title: 'Consistent Data Masking',
      category: 'Deterministic Pseudonymization',
      icon: Binary,
      iconColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      description:
        'Replaces detected sensitive values with deterministic, typed placeholders (<PERSON_1>, <PAN_1>). Co-referent entities across multi-paragraph documents map to the same token to maintain LLM context.',
      bulletPoints: [
        'Typed semantic placeholders (<TYPE_N>)',
        'Session-isolated in-memory translation table',
        'Preserves linguistic fluency and relationship logic',
      ],
    },
    {
      title: 'Outbound Leak Protection',
      category: 'Active Perimeter Defense',
      icon: ShieldAlert,
      iconColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      description:
        'Zero-trust outbound inspection analyzes outgoing payloads prior to external transmission. If an unmasked identity or placeholder mapping is detected, the request is immediately aborted.',
      bulletPoints: [
        'Pre-flight prompt scan before HTTP dispatch',
        'Strict failure-mode isolation (Fail Closed)',
        'Zero raw PII permitted in outbound payload',
      ],
    },
    {
      title: 'Secure Local Reinsertion',
      category: 'Client-Side Response Stitching',
      icon: RefreshCw,
      iconColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      description:
        'Once external AI model reasoning completes, the local gateway securely swaps placeholders back to their exact original values, ensuring authorized employees receive a complete and actionable answer.',
      bulletPoints: [
        'In-memory 1:1 token restoration',
        'Safely drops unrecognized or hallucinated tokens',
        'Client perimeter executes complete restoration',
      ],
    },
    {
      title: 'Internal Risk Assessment',
      category: 'Executive Compliance Audit',
      icon: FileCheck2,
      iconColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      description:
        'Generates confidential internal audit PDF reports featuring category risk scoring, executive natural-language summaries, exact bounding-box visual highlights, and official Indian government portal links.',
      bulletPoints: [
        'Risk severity scoring (Critical, High, Medium, Low)',
        'Visual PII bounding-box mapping with color legend',
        'Confidential report restricted to authorized personnel',
      ],
    },
    {
      title: 'Audit & Traceability',
      category: 'Governance & Accountability',
      icon: History,
      iconColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      description:
        'Maintains immutable request logs containing execution timestamps, processing latencies, entity counts, leak guard verification statuses, and sanitized payloads without storing raw personal information.',
      bulletPoints: [
        'Cryptographic request-level identifiers',
        'Zero-PII compliant audit database',
        'DPDP Act governance and verifiable accountability',
      ],
    },
  ];

  return (
    <section id="features" className="py-24 lg:py-32 bg-[#050811] text-white relative border-b border-slate-900">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-orange-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span>Enterprise Capabilities</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Engineered for Zero-Trust Privacy.
          </h2>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
            Architected to ensure sensitive human identities never traverse external networks, while enterprise developers retain full access to modern LLM intelligence.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-slate-800 bg-[#090e1a]/80 p-7 shadow-lg hover:shadow-2xl hover:border-orange-500/50 hover:bg-[#0c1222] transition-all duration-300 flex flex-col justify-between text-left"
              >
                <div>
                  {/* Top Icon & Category Tag */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${feature.iconColor} shadow-md group-hover:scale-105 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                      {feature.category}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed font-normal">
                    {feature.description}
                  </p>
                </div>

                {/* Bullet Points */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
                  {feature.bulletPoints.map((point) => (
                    <div key={point} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Callout Banner */}
        <div className="mt-14 rounded-2xl bg-[#090e1a] border border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-orange-400 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
              Confidential Enterprise Execution
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-white">
              Need to see how masking preserves LLM response accuracy?
            </h4>
            <p className="text-sm text-slate-400 max-w-xl">
              Inspect our side-by-side comparison below displaying the exact transformation between the original document, the AI payload, and final client answer.
            </p>
          </div>
          <a
            href="#preview"
            className="flex-shrink-0 px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm transition-colors flex items-center gap-2 shadow-md"
          >
            <span>View Transformation</span>
            <ChevronRight className="h-4 w-4 text-slate-950" />
          </a>
        </div>

      </div>
    </section>
  );
};
