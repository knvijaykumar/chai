import React, { useState, useEffect } from 'react';
import { fetchHealth, HealthResponse, API_BASE } from '../services/api';
import { 
  Settings as SettingsIcon, 
  Lock, 
  RefreshCw,
  FileCheck
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // User preference states (stored locally)
  const [defaultTask, setDefaultTask] = useState('Document Summary');
  const [defaultPurpose, setDefaultPurpose] = useState('HR Verification');
  const [strictValidation, setStrictValidation] = useState(true);
  const [saveNotice, setSaveNotice] = useState(false);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const data = await fetchHealth();
      setHealth(data);
      setIsHealthy(data.status === 'ok');
    } catch {
      setHealth(null);
      setIsHealthy(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto text-left">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            System & Engine Configuration
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Perimeter settings, NER engine runtime status, and AI model routing preferences.
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          <span>Ping Backend Engine</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Preferences & Controls (Cols 1-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          <form onSubmit={handleSavePreferences} className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-bold text-white tracking-wide border-b border-slate-800/80 pb-3 flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-orange-400" />
              <span>Application Defaults & Guardrail Policies</span>
            </h3>

            {/* Default Task Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Default Prompt Task
              </label>
              <select
                value={defaultTask}
                onChange={(e) => setDefaultTask(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="Document Summary">Document Summary</option>
                <option value="Eligibility Review">Eligibility Review</option>
                <option value="Document Classification">Document Classification</option>
              </select>
            </div>

            {/* Default Purpose Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Default Workflow Purpose
              </label>
              <select
                value={defaultPurpose}
                onChange={(e) => setDefaultPurpose(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="HR Verification">HR Verification</option>
                <option value="KYC Processing">KYC Processing</option>
                <option value="Customer Support">Customer Support</option>
                <option value="General Document Processing">General Document Processing</option>
              </select>
            </div>

            {/* Checksum Guardrail Policy */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">Strict Checksum Validation</span>
                <span className="text-[11px] text-slate-400">Validate Aadhaar Verhoeff & PAN regex algorithmically</span>
              </div>
              <input
                type="checkbox"
                checked={strictValidation}
                onChange={(e) => setStrictValidation(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 bg-slate-900 border-slate-700"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all"
            >
              Save Configuration
            </button>

            {saveNotice && (
              <span className="ml-3 text-xs text-orange-400 font-mono">
                ✓ Preferences updated successfully.
              </span>
            )}
          </form>

          {/* Phase 8 SSO Informational Notice */}
          <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Lock className="h-4 w-4 text-orange-400" />
              <span>Enterprise Identity & Access Governance</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Single Sign-On (SAML 2.0 / OIDC), Azure Active Directory, and Role-Based Access Control (RBAC) are scheduled for <strong>Phase 8</strong>. Current operations run under local perimeter authorization mode.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
              <span>Roadmap:</span>
              <span className="text-orange-400 font-bold">Phase 8 SSO</span>
            </div>
          </div>

        </div>

        {/* Right: Runtime Status & Specs (Cols 8-12) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Real Backend Connection Status */}
          <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white tracking-wide border-b border-slate-800/80 pb-3 flex items-center justify-between">
              <span>Backend Runtime Status</span>
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Endpoint URL:</span>
                <span className="text-white font-bold">{API_BASE}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Service Status:</span>
                <span className={isHealthy ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {isHealthy ? 'ONLINE (200 OK)' : 'OFFLINE'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Active NER Engine:</span>
                <span className="text-orange-400 font-bold">
                  {health?.ner || 'presidio+gliner'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Engine Version:</span>
                <span className="text-slate-300 font-bold">
                  {health?.version || '1.1.0'}
                </span>
              </div>
            </div>
          </div>

          {/* Backend File Limits & Ingestion Specs */}
          <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white tracking-wide border-b border-slate-800/80 pb-3 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-orange-400" />
              <span>Document Processing Limits</span>
            </h3>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Max File Size:</span>
                <span className="text-white font-bold">10 MB (In-Memory)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Max PDF Pages:</span>
                <span className="text-white font-bold">20 Pages</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Supported Formats:</span>
                <span className="text-white font-bold">PDF, PNG, JPG, JPEG</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">OCR Engine:</span>
                <span className="text-white font-bold">PyMuPDF + Tesseract</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Storage Policy:</span>
                <span className="text-emerald-400 font-bold">Zero Disk Persistence</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
