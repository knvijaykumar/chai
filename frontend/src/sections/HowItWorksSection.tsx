import React, { useState } from 'react';

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1); // Step 02 active by default as in screenshot

  const steps = [
    {
      id: 0,
      stepNumber: 'Step - 01',
      title: 'Assess & Identify',
      description:
        'We perform a comprehensive in-memory security assessment across uploaded PDFs, scans, and text to detect Indian personal information, statutory IDs, and potential egress risks before anything leaves.',
      iconType: 'window',
    },
    {
      id: 1,
      stepNumber: 'Step - 02',
      title: 'Secure & Implement',
      description:
        'Our engine replaces identified entities with deterministic typed tokens (<AADHAAR_1>, <PAN_1>) and activates pre-flight outbound leak guards to fail-closed against unauthorized external data transmission.',
      iconType: 'server',
    },
    {
      id: 2,
      stepNumber: 'Step - 03',
      title: 'Monitor & Respond',
      description:
        'We continuously restore original personal values strictly on your local perimeter, present complete AI answers to authorized users, and log tamper-evident compliance audit hashes 24/7.',
      iconType: 'laptop',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 lg:py-32 bg-[#050811] text-white overflow-hidden border-b border-slate-900">
      {/* Background radial lighting */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-orange-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* ========================================================
              LEFT COLUMN: High-Contrast Bold Typography
          ======================================================== */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
              How We Keep<br />
              Your Enterprise Safe &<br />
              Secure Always
            </h2>

            <p className="text-base sm:text-lg text-slate-400 max-w-md leading-relaxed font-normal">
              Secure your AI interactions with cyber solutions that prevent leaks and protect vital data assets.
            </p>
          </div>

          {/* ========================================================
              RIGHT COLUMN: 3 Process Steps with Vertical Indicator Line
          ======================================================== */}
          <div className="lg:col-span-7 relative">
            <div className="relative pl-6 sm:pl-8 space-y-12 sm:space-y-16">
              
              {/* Vertical Continuous Line */}
              <div className="absolute top-4 bottom-4 left-0 w-[2px] bg-slate-800/80">
                {/* Active Orange Vertical Marker */}
                <div
                  className="w-full bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_12px_rgba(249,115,22,0.8)] transition-all duration-300 rounded-full"
                  style={{
                    height: '33.333%',
                    transform: `translateY(${activeStep * 100}%)`,
                  }}
                />
              </div>

              {/* Step Items */}
              {steps.map((step) => {
                const isActive = activeStep === step.id;

                return (
                  <div
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-8 items-start cursor-pointer group text-left"
                  >
                    {/* Sub-column 1: 3D Wireframe / Hardware Icon + Step Label */}
                    <div className="sm:col-span-4 flex flex-col items-start space-y-3">
                      
                      {/* Icon Container matching reference exactly */}
                      <div className="relative w-20 h-16 sm:w-24 sm:h-20 flex items-center justify-center">
                        {step.iconType === 'window' && (
                          <div className="relative w-16 h-14 rounded-lg bg-slate-900/90 border border-slate-700/80 p-2 shadow-inner group-hover:border-slate-600 transition-colors">
                            {/* Window header */}
                            <div className="flex items-center gap-1 mb-2 pb-1 border-b border-slate-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                            </div>
                            {/* Window content lines */}
                            <div className="space-y-1">
                              <div className="h-1 w-3/4 bg-slate-700 rounded-full" />
                              <div className="h-1 w-1/2 bg-slate-700 rounded-full" />
                            </div>
                            {/* Mini orange shield badge */}
                            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-600/30 border border-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                              <span className="text-[10px] text-orange-400 font-bold">✓</span>
                            </div>
                          </div>
                        )}

                        {step.iconType === 'server' && (
                          <div className="relative w-20 h-16 flex items-center justify-center">
                            {/* Server Stack graphic */}
                            <div className="w-16 h-14 rounded-lg bg-slate-900/90 border border-slate-700/80 p-1.5 flex flex-col justify-between shadow-inner">
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-800/80">
                                <div className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-orange-500" />
                                  <span className="w-4 h-0.5 bg-slate-600 rounded" />
                                </div>
                                <span className="text-[8px] font-mono text-slate-500">I</span>
                              </div>
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-800/80">
                                <div className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-orange-500" />
                                  <span className="w-4 h-0.5 bg-slate-600 rounded" />
                                </div>
                                <span className="text-[8px] font-mono text-slate-500">II</span>
                              </div>
                              <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-800/80">
                                <div className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-orange-500" />
                                  <span className="w-4 h-0.5 bg-slate-600 rounded" />
                                </div>
                                <span className="text-[8px] font-mono text-slate-500">III</span>
                              </div>
                            </div>
                            {/* 3D Glowing Orange Shield with Checkmark */}
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-8 h-9 rounded-md bg-gradient-to-b from-orange-500 to-orange-600 shadow-[0_0_16px_rgba(249,115,22,0.9)] border border-orange-300 flex items-center justify-center">
                              <span className="text-white text-xs font-black">✓</span>
                            </div>
                          </div>
                        )}

                        {step.iconType === 'laptop' && (
                          <div className="relative w-16 h-14 rounded-lg bg-slate-900/90 border border-slate-700/80 p-2 flex flex-col items-center justify-center group-hover:border-slate-600 transition-colors">
                            <div className="w-10 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
                              <span className="w-2 h-2 rounded-full bg-orange-500/80 animate-pulse" />
                            </div>
                            <div className="w-12 h-1 bg-slate-700 rounded-full mt-1" />
                          </div>
                        )}
                      </div>

                      {/* Step Number Label */}
                      <span
                        className={`text-sm font-mono tracking-wider transition-colors ${
                          isActive ? 'text-orange-500 font-bold' : 'text-slate-500 group-hover:text-slate-400'
                        }`}
                      >
                        {step.stepNumber}
                      </span>
                    </div>

                    {/* Sub-column 2: Step Heading & Detailed Description */}
                    <div className="sm:col-span-8 space-y-2">
                      <h3
                        className={`text-xl sm:text-2xl font-bold tracking-tight transition-colors ${
                          isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p
                        className={`text-sm sm:text-base leading-relaxed transition-colors ${
                          isActive ? 'text-slate-300 font-normal' : 'text-slate-500 group-hover:text-slate-400'
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>

                  </div>
                );
              })}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
