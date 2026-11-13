import React, { useEffect } from 'react';
import { X, ShieldCheck, ArrowUpRight } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#050811]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl bg-[#090e1a] p-6 sm:p-8 shadow-2xl border border-slate-800 text-white z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center p-1.5">
              <img src="/logo-mark.png" alt="Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">
          {children || (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 text-sm text-slate-300 leading-relaxed">
                <div className="flex items-center gap-2 font-semibold text-white mb-1">
                  <ShieldCheck className="h-4 w-4 text-orange-400" />
                  Phase 1 Preview Mode Active
                </div>
                You are currently viewing the public-facing <strong>Privacy Gateway</strong> enterprise landing page.
                Single Sign-On (SSO / OIDC) and the Document Operations Dashboard are scheduled for <strong>Phase 2</strong>.
              </div>

              <div className="rounded-lg bg-orange-950/30 border border-orange-900/40 p-3 text-xs text-orange-300">
                Tip: You can explore the interactive live transformation in the <strong>Product Preview</strong> section below.
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <a
            href="#preview"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-sm font-semibold text-white hover:from-orange-600 hover:to-orange-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
          >
            <span>Explore Product Preview</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
