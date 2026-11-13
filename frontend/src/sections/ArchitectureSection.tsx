import React from 'react';
import { ArrowUpRight, Lock, Cloud, Cpu } from 'lucide-react';
import { IsometricHardwareDiagram } from '../components/IsometricHardwareDiagram';

export const ArchitectureSection: React.FC = () => {
  return (
    <section id="security" className="relative py-24 lg:py-32 bg-[#050811] text-white overflow-hidden border-b border-slate-900">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ========================================================
            ROW 1: MATCHING SCREENSHOT 2 (Copy + 3 Stats + 3D Hardware)
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Heading, Regulatory Text, White Pill CTA, 3 Stats */}
          <div className="lg:col-span-6 space-y-8 text-left z-10">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span>Zero-Trust AI Architecture</span>
            </div>

            {/* High-Contrast Bold Headline */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
              Built to keep you safe and grow right alongside you.
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed font-normal">
              Meet industry regulations such as India DPDP Act 2023, ISO 27001, GDPR, and SOC 2 standards easily and efficiently today.
            </p>

            {/* White Pill Button: Learn More ↗ */}
            <div>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm shadow-lg transition-all duration-200 group"
              >
                <span>Learn More</span>
                <ArrowUpRight className="h-4 w-4 text-slate-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>

            {/* 3 Large Orange Stats Row */}
            <div className="pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4 sm:gap-6">
              <div>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-orange-500 tracking-tight font-mono">
                  99.97%
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                  Threat & PII Detection Rate
                </div>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-orange-500 tracking-tight font-mono">
                  &lt;0.3s
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                  Average Response Time
                </div>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-orange-500 tracking-tight font-mono">
                  4M+
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                  Attacks & Leaks Blocked Daily
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: 3D Isometric Hardware Diagram */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <IsometricHardwareDiagram />
          </div>

        </div>

        {/* ========================================================
            ROW 2: ZERO-TRUST ZONE SPECIFICATIONS & PERIMETER BOUNDARIES
        ======================================================== */}
        <div className="mt-20 pt-16 border-t border-slate-900 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Local Perimeter RAM */}
          <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Lock className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                Private RAM
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Zone 1: Local Perimeter</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Presidio regex engines and GLiNER zero-shot transformer models execute strictly in ephemeral RAM. Original sensitive entities never touch disk storage or unmonitored ports.
            </p>
          </div>

          {/* Card 2: Outbound Fail-Closed Leak Guard */}
          <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Cpu className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                Fail-Closed
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Active Leak Guard Gate</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pre-flight outbound verification analyzes outgoing requests against the active session dictionary. If an unmasked identity is found, network dispatch aborts immediately.
            </p>
          </div>

          {/* Card 3: Cloud AI Model Boundary */}
          <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Cloud className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Sanitized Only
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Zone 2: Third-Party LLM</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              OpenAI, Anthropic, Gemini, or DeepSeek models receive exclusively abstract placeholders (&lt;PERSON_1&gt;, &lt;PAN_1&gt;). External models perform reasoning without identity visibility.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
