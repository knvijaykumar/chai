import React from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Link } from '../services/router';

interface FinalCtaSectionProps {
  onOpenAuthModal?: (mode: 'signin' | 'getstarted') => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = () => {
  return (
    <section className="py-24 lg:py-32 bg-[#050811] relative overflow-hidden border-b border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-[#080d1a] p-8 sm:p-12 lg:p-16 text-white shadow-2xl overflow-hidden border border-slate-800">
          
          {/* Subtle decorative glow circles */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-orange-600/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span>Phase 1 Preview Edition</span>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Make Your AI Workflows{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                Privacy-Aware.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Protect sensitive information while enabling productive AI-powered workflows.
              Ensure that human identities stay within your perimeter while your teams unlock modern intelligence.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                to="/app"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-base shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-200 group"
              >
                <span>Get Started — Explore Preview</span>
                <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* Trust note */}
            <p className="text-xs text-slate-400 pt-4 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4 text-orange-400" />
              Built for India Digital Personal Data Protection (DPDP) Act compliance principles.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};
