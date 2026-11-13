import React, { useState } from 'react';
import { Shield, Cpu, CheckCircle2, Copy, Check, Info } from 'lucide-react';

export const ProductPreviewSection: React.FC = () => {
  const [copiedPanel, setCopiedPanel] = useState<string | null>(null);

  const handleCopy = (panelId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPanel(panelId);
    setTimeout(() => setCopiedPanel(null), 2000);
  };

  const scenarios = {
    verification: {
      name: 'HR & Candidate Verification',
      badge: 'Identity & Address',
      original: {
        raw: "Candidate Verification Record\nName: Rahul Sharma\nFather's Name: K C Nagaraj\nPAN Card: BNZPM2501F\nAadhaar: 4991 1866 5246\nContact Phone: +91 98765 43210\nEmail: rahul.sharma@example.com\nResidential Address: SSM Cultural Hall, Davangere, Karnataka 577004.\n\nInstruction to AI: Summarize candidate credentials and verify background integrity.",
        entities: [
          { text: 'Rahul Sharma', type: 'PERSON' },
          { text: 'K C Nagaraj', type: 'PERSON' },
          { text: 'BNZPM2501F', type: 'PAN' },
          { text: '4991 1866 5246', type: 'AADHAAR' },
          { text: '+91 98765 43210', type: 'PHONE' },
          { text: 'rahul.sharma@example.com', type: 'EMAIL' },
          { text: 'SSM Cultural Hall, Davangere, Karnataka 577004', type: 'ADDRESS' },
        ]
      },
      sanitized: {
        raw: "Candidate Verification Record\nName: <PERSON_1>\nFather's Name: <PERSON_2>\nPAN Card: <PAN_1>\nAadhaar: <AADHAAR_1>\nContact Phone: <PHONE_1>\nEmail: <EMAIL_1>\nResidential Address: <ADDRESS_1>.\n\nInstruction to AI: Summarize candidate credentials and verify background integrity.",
        placeholders: [
          '<PERSON_1>',
          '<PERSON_2>',
          '<PAN_1>',
          '<AADHAAR_1>',
          '<PHONE_1>',
          '<EMAIL_1>',
          '<ADDRESS_1>',
        ]
      },
      final: {
        raw: "Executive Candidate Summary:\n\nCandidate Rahul Sharma has provided verified identification credentials under PAN BNZPM2501F and Aadhaar 4991 1866 5246. Primary mobile contact is +91 98765 43210 and primary email is rahul.sharma@example.com. Residential location is confirmed at SSM Cultural Hall, Davangere, Karnataka 577004. Secondary family reference noted: K C Nagaraj.\n\nVerification Status: All statutory identification formats are structurally valid.",
        restored: [
          'Rahul Sharma',
          'BNZPM2501F',
          '4991 1866 5246',
          '+91 98765 43210',
          'rahul.sharma@example.com',
          'SSM Cultural Hall, Davangere, Karnataka 577004',
          'K C Nagaraj',
        ]
      }
    },
    financial: {
      name: 'Tax Filing & PAN Assessment',
      badge: 'Financial Compliance',
      original: {
        raw: "Income Tax Audit Dossier\nTaxpayer Name: Priya Sharma\nPAN: ABCDE1234F\nBank Account: 50100429188412\nRegistered Mobile: +91 99028 49353\nAddress: Flat 402, Green Glen Layout, Bellandur, Bengaluru.\n\nTask for AI: Formulate tax compliance advisory based on submitted income profile.",
        entities: [
          { text: 'Priya Sharma', type: 'PERSON' },
          { text: 'ABCDE1234F', type: 'PAN' },
          { text: '+91 99028 49353', type: 'PHONE' },
          { text: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru', type: 'ADDRESS' },
        ]
      },
      sanitized: {
        raw: "Income Tax Audit Dossier\nTaxpayer Name: <PERSON_1>\nPAN: <PAN_1>\nBank Account: <ACCOUNT_1>\nRegistered Mobile: <PHONE_1>\nAddress: <ADDRESS_1>.\n\nTask for AI: Formulate tax compliance advisory based on submitted income profile.",
        placeholders: [
          '<PERSON_1>',
          '<PAN_1>',
          '<ACCOUNT_1>',
          '<PHONE_1>',
          '<ADDRESS_1>',
        ]
      },
      final: {
        raw: "Tax Compliance Advisory:\n\nTaxpayer Priya Sharma has successfully filed documentation under PAN ABCDE1234F. Verified contact phone is +91 99028 49353 and registered jurisdiction address is Flat 402, Green Glen Layout, Bellandur, Bengaluru.\n\nFiling Recommendation: Documentation is complete for assessment year processing.",
        restored: [
          'Priya Sharma',
          'ABCDE1234F',
          '+91 99028 49353',
          'Flat 402, Green Glen Layout, Bellandur, Bengaluru',
        ]
      }
    },
    telecom: {
      name: 'Customer Support & Telecom KYC',
      badge: 'Telecom Customer Data',
      original: {
        raw: "Customer KYC Support Ticket\nSubscriber: Vijay Kumar KN\nMobile Number: +91 90081 81187\nAlternate Email: vijay.kn@example.com\nVoter ID: TZD1234567\nLocation: Davangere City, Karnataka.\n\nQuery: User requests verification status of high-speed fiber activation.",
        entities: [
          { text: 'Vijay Kumar KN', type: 'PERSON' },
          { text: '+91 90081 81187', type: 'PHONE' },
          { text: 'vijay.kn@example.com', type: 'EMAIL' },
          { text: 'TZD1234567', type: 'VOTER_ID' },
          { text: 'Davangere City, Karnataka', type: 'ADDRESS' },
        ]
      },
      sanitized: {
        raw: "Customer KYC Support Ticket\nSubscriber: <PERSON_1>\nMobile Number: <PHONE_1>\nAlternate Email: <EMAIL_1>\nVoter ID: <VOTER_ID_1>\nLocation: <ADDRESS_1>.\n\nQuery: User requests verification status of high-speed fiber activation.",
        placeholders: [
          '<PERSON_1>',
          '<PHONE_1>',
          '<EMAIL_1>',
          '<VOTER_ID_1>',
          '<ADDRESS_1>',
        ]
      },
      final: {
        raw: "Customer Support Resolution:\n\nHello Vijay Kumar KN, your telecom broadband activation for mobile line +91 90081 81187 is fully confirmed. Identity verification under Voter ID TZD1234567 has passed regional compliance checks for Davangere City, Karnataka. An activation confirmation has been dispatched to vijay.kn@example.com.",
        restored: [
          'Vijay Kumar KN',
          '+91 90081 81187',
          'TZD1234567',
          'Davangere City, Karnataka',
          'vijay.kn@example.com',
        ]
      }
    }
  };

  const current = scenarios.verification;

  return (
    <section id="preview" className="py-24 lg:py-32 bg-[#050811] text-white relative overflow-hidden border-b border-slate-900">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span>Real-Time Transformation Lifecycle</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            See Privacy Protection in Action.
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Inspect the exact three-stage lifecycle: the original document detected locally, 
            the anonymous payload forwarded to external AI, and the final restored answer returned to your staff.
          </p>
        </div>

        {/* Three-Panel Product Preview Layout */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Panel 1: Original Document */}
          <div className="rounded-2xl bg-[#080d1a] border border-slate-800 flex flex-col shadow-2xl overflow-hidden h-[450px]">
            {/* Sticky Header */}
            <div className="px-5 py-4 bg-[#0c1222] border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider text-rose-300 uppercase">
                  1. Detected on the Laptop
                </span>
              </div>
              <button
                onClick={() => handleCopy('p1', current.original.raw)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors text-xs flex items-center gap-1"
                title="Copy raw original text"
              >
                {copiedPanel === 'p1' ? <Check className="h-3.5 w-3.5 text-orange-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-5 font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto space-y-3 flex-1 select-text">
              <div className="text-[11px] text-slate-400 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="font-semibold text-rose-300">Identity Guard Alert: </span>
                Raw PII detected locally. Colored spans will be masked prior to external transit.
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2 whitespace-pre-wrap">
                {current.original.raw.split('\n').map((line, lIdx) => (
                  <div key={lIdx}>{line}</div>
                ))}
              </div>

              <div className="pt-2 text-[11px] text-slate-400">
                <span className="text-slate-300 font-semibold">Detected Spans: </span>
                {current.original.entities.map((ent) => (
                  <span
                    key={ent.text}
                    className="inline-block mr-1.5 mt-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800"
                  >
                    {ent.text} ({ent.type})
                  </span>
                ))}
              </div>
            </div>
            
            {/* Sticky/Fixed Footer */}
            <div className="px-5 py-2.5 bg-[#0c1222] border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-rose-400" />
              <span>Full original text kept strictly in local perimeter RAM</span>
            </div>
          </div>

          {/* Panel 2: Exactly What AI Receives */}
          <div className="rounded-2xl bg-[#080d1a] border border-orange-500/40 flex flex-col shadow-2xl overflow-hidden h-[450px] ring-1 ring-orange-500/30">
            {/* Sticky Header */}
            <div className="px-5 py-4 bg-[#0c1222] border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider text-orange-300 uppercase">
                  2. Exactly What the AI Receives
                </span>
              </div>
              <button
                onClick={() => handleCopy('p2', current.sanitized.raw)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors text-xs flex items-center gap-1"
                title="Copy sanitized payload"
              >
                {copiedPanel === 'p2' ? <Check className="h-3.5 w-3.5 text-orange-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-5 font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto space-y-3 flex-1 select-text">
              <div className="text-[11px] text-slate-400 bg-orange-950/30 p-2.5 rounded-lg border border-orange-900/40">
                <span className="font-semibold text-orange-300">Outbound Leak Guard: </span>
                Passed. Zero human identities or real contact tokens forwarded.
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2 whitespace-pre-wrap">
                {current.sanitized.raw.split('\n').map((line, lIdx) => (
                  <div key={lIdx}>{line}</div>
                ))}
              </div>

              <div className="pt-2 text-[11px] text-slate-400">
                <span className="text-slate-300 font-semibold">Forwarded Tokens: </span>
                {current.sanitized.placeholders.map((ph) => (
                  <span
                    key={ph}
                    className="inline-block mr-1.5 mt-1 px-1.5 py-0.5 rounded text-[10px] bg-orange-950/80 text-orange-300 border border-orange-700/80"
                  >
                    {ph}
                  </span>
                ))}
              </div>
            </div>

            {/* Sticky/Fixed Footer */}
            <div className="px-5 py-2.5 bg-[#0c1222] border-t border-slate-800 text-[11px] text-orange-300 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-orange-400" />
              <span>Third-party LLM only reasons over abstract tokens</span>
            </div>
          </div>

          {/* Panel 3: Final Answer for the User */}
          <div className="rounded-2xl bg-[#080d1a] border border-emerald-500/40 flex flex-col shadow-2xl overflow-hidden h-[450px]">
            {/* Sticky Header */}
            <div className="px-5 py-4 bg-[#0c1222] border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider text-emerald-300 uppercase">
                  3. Final Answer for the User
                </span>
              </div>
              <button
                onClick={() => handleCopy('p3', current.final.raw)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors text-xs flex items-center gap-1"
                title="Copy restored response"
              >
                {copiedPanel === 'p3' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-5 font-mono text-xs text-slate-300 leading-relaxed overflow-y-auto space-y-3 flex-1 select-text">
              <div className="text-[11px] text-slate-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/50">
                <span className="font-semibold text-emerald-300">Local Reinsertion: </span>
                Completed. Ephemeral tokens seamlessly replaced with original values.
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2 whitespace-pre-wrap">
                {current.final.raw.split('\n').map((line, lIdx) => (
                  <div key={lIdx}>{line}</div>
                ))}
              </div>

              <div className="pt-2 text-[11px] text-slate-400">
                <span className="text-slate-300 font-semibold">Restored Details: </span>
                {current.final.restored.map((r) => (
                  <span
                    key={r}
                    className="inline-block mr-1.5 mt-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Sticky/Fixed Footer */}
            <div className="px-5 py-2.5 bg-[#0c1222] border-t border-slate-800 text-[11px] text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Full natural language utility restored to authorized employee</span>
            </div>
          </div>

        </div>

        {/* Verification Note */}
        <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Info className="h-4 w-4 text-orange-400" />
          <span>
            Static simulation based on realistic synthetic Indian personal data. Zero real PII was used.
          </span>
        </div>

      </div>
    </section>
  );
};
