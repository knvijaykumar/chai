import React from 'react';
import { ArrowUpRight, ChevronRight, CheckCircle2 } from 'lucide-react';
import { CyberShieldHub } from '../components/CyberShieldHub';
import { Link } from '../services/router';

export const HeroSection: React.FC = () => {
  return (
    <section id="overview" className="relative pt-32 pb-20 lg:pt-36 lg:pb-28 overflow-hidden bg-cyber-dark text-white">
      {/* Background ambient lighting and subtle circuit grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      {/* Radiant amber/orange spot glow matching reference */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-80 h-80 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-6 space-y-7 text-left z-10">
            {/* Pill Tag: Built for Modern Security / Enterprise AI Intermediary */}
            <div className="inline-flex">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-slate-300 shadow-inner backdrop-blur-sm">
                <img src="/logo-mark.png" alt="Cybrix" className="w-4 h-4 object-contain drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                <span>Enterprise AI Intermediary · India DPDP Ready</span>
              </div>
            </div>

            {/* High-Contrast Bold Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
              Let AI Read the Document.{' '}
              <span className="block mt-1 text-slate-100">
                Not the Identity.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl font-semibold text-slate-200 tracking-tight">
              Your data stays protected. Your AI stays productive.
            </p>

            {/* Description Paragraph */}
            <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed font-normal">
              Privacy Gateway detects and masks Indian personal information before it reaches AI,
              then restores the original values in the final response.
            </p>

            {/* Action Buttons (Orange Pill CTA + Dark Glass Secondary) */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                to="/app"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-base shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
              >
                <span>Explore Privacy Gateway</span>
                <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-base border border-slate-700/80 shadow-sm hover:border-slate-600 transition-all duration-200"
              >
                <span>See How It Works</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </a>
            </div>

            {/* Micro Feature Proof Points */}
            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-3 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <span>Zero AI PII Exposure</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <span>Local Reinsertion</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <span>DPDP Act Aligned</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Isometric Cyber Defense Hub */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <CyberShieldHub />
          </div>

        </div>
      </div>
    </section>
  );
};
