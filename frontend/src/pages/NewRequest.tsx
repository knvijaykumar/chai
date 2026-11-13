import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Cpu, 
  ShieldCheck, 
  ArrowRight, 
  FileDown, 
  AlertCircle, 
  CheckCircle2, 
  File, 
  Trash2,
  Lock,
  Layers,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { 
  processText, 
  processDocument, 
  ProcessResponse, 
  getInternalReportDownloadUrl 
} from '../services/api';

export const NewRequest: React.FC = () => {
  const [inputMode, setInputMode] = useState<'text' | 'file'>('file'); // Default to file upload
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Backend restrictions: 10 MB limit
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size exceeds the 10 MB maximum backend limit.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResult(null);

    if (inputMode === 'text' && !textInput.trim()) {
      setErrorMessage('Please enter text or choose file upload mode.');
      return;
    }
    if (inputMode === 'file' && !selectedFile) {
      setErrorMessage('Please select a PDF or image file (PNG/JPG).');
      return;
    }

    setIsProcessing(true);

    try {
      const taskPrompt = 'Summarize key credentials, identity entities, and document context.';

      let res: ProcessResponse;
      if (inputMode === 'file' && selectedFile) {
        res = await processDocument(selectedFile, {
          backend: 'mock',
          task: taskPrompt,
          validate_ids: true,
        });
      } else {
        res = await processText({
          text: textInput,
          backend: 'mock',
          task: taskPrompt,
          validate_ids: true,
        });
      }

      setResult(res);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Processing failed. Ensure backend server is running on port 8000.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = () => {
    setTextInput(
      "Candidate Onboarding Verification Record\n" +
      "Candidate Name: Rahul Sharma\n" +
      "Father's Name: K C Nagaraj\n" +
      "PAN Card: BNZPM2501F\n" +
      "Aadhaar Number: 4991 1866 5246\n" +
      "Mobile Contact: +91 98765 43210\n" +
      "Official Email: rahul.sharma@example.com\n" +
      "Permanent Address: SSM Cultural Hall, Davangere, Karnataka 577004.\n\n" +
      "Verify credential validity and structure an executive onboarding summary."
    );
    setInputMode('text');
    setSelectedFile(null);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto text-left">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            New Protected AI Request
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Intercept, detect, and mask Indian personal identifiers locally before cloud AI processing.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-orange-400 hover:bg-slate-800 hover:text-orange-300 transition-colors w-fit"
        >
          <span>Load Sample Document Data</span>
        </button>
      </div>

      <form onSubmit={handleProcess} className="space-y-6">
        
        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#090e1a] border border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setInputMode('file')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              inputMode === 'file'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Document Upload (PDF / Image)</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              inputMode === 'text'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Plain Text / Prompt</span>
          </button>
        </div>

        {/* Large Document Ingestion Area */}
        {inputMode === 'file' ? (
          <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <label className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
                Document Ingestion (PyMuPDF + Tesseract OCR)
              </label>
              <span className="text-[11px] font-mono text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/20">
                100% In-Memory
              </span>
            </div>

            {/* Expanded & Taller Drag and Drop Zone */}
            <div className="border-2 border-dashed border-slate-800 hover:border-orange-500/60 rounded-2xl py-16 sm:py-20 px-8 text-center transition-colors relative cursor-pointer group bg-slate-950/70 min-h-[300px] flex items-center justify-center">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              
              {selectedFile ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 max-w-lg w-full">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 flex-shrink-0">
                    <File className="h-6 w-6" />
                  </div>
                  <div className="text-center sm:text-left flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{selectedFile.name}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'Document'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Remove selected file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400 mx-auto group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                    <Upload className="h-8 w-8" />
                  </div>
                  <div className="text-base font-bold text-white">
                    Click or drag and drop document here
                  </div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Supported: PDF (scanned or native), PNG, JPG, JPEG
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">
                    Backend Limits: Max 10 MB · Max 20 Pages
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Expanded Text Input Box */
          <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-6 sm:p-8 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <label className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
                Input Text with Sensitive Indian Identifiers
              </label>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                In-Memory Local Scanning
              </span>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste document text or prompt containing names, Aadhaar, PAN, phone numbers, addresses..."
              rows={12}
              className="w-full rounded-xl bg-slate-950 p-4 text-xs font-mono text-slate-200 border border-slate-800 focus:outline-none focus:border-orange-500 transition-colors leading-relaxed"
              required
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
              <span>{textInput.length} / 50,000 characters</span>
              <span>Zero disk persistence</span>
            </div>
          </div>
        )}

        {/* Primary Action Button (Prominent & Full-Width) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 px-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-base shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.008] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Cpu className="h-5 w-5 animate-spin" />
                <span>Processing Through Privacy Gateway...</span>
              </>
            ) : (
              <>
                <span>Run Privacy Gateway Process</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Execution Interrupted:</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

      </form>

      {/* ========================================================
          EXECUTION RESULTS DISPLAY (When Process Completes)
      ======================================================== */}
      {result && (() => {
        const isBlocked = result.status === 'blocked' || Boolean(result.blocked);
        const isRejected = result.status === 'rejected' || Boolean(result.needs_correction);
        const isFlagged = result.status === 'flagged';

        return (
          <div className="space-y-6 pt-6 border-t border-slate-800 animate-fade-in">
            
            {/* Header Banner */}
            <div className={`p-5 rounded-2xl bg-[#090e1a] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isBlocked 
                ? 'border-rose-900/60 shadow-lg shadow-rose-950/20' 
                : isRejected 
                ? 'border-orange-900/60 shadow-lg shadow-orange-950/20' 
                : 'border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                  isBlocked
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : isRejected
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : isFlagged
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  {isBlocked ? (
                    <ShieldAlert className="h-5 w-5" />
                  ) : isRejected ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {isBlocked
                        ? `Perimeter Interception: ${result.request_id}`
                        : isRejected
                        ? `Validation Rejected: ${result.request_id}`
                        : `Request Completed: ${result.request_id}`}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      isBlocked
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : isRejected
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                        : isFlagged
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Perimeter Latency: {result.gateway_ms || 0}ms · LLM Latency: {result.llm_ms || 0}ms · Zero Raw PII Egress
                  </p>
                </div>
              </div>

              {/* Download Internal Risk Assessment PDF */}
              <a
                href={getInternalReportDownloadUrl(result.request_id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs shadow-md transition-all flex-shrink-0"
              >
                <FileDown className="h-4 w-4 text-slate-950" />
                <span>Download Internal Risk Assessment PDF</span>
              </a>
            </div>

            {/* Interception / Security Details Banner */}
            {isBlocked && (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-200">
                    Fail-Closed Perimeter Interception: Outbound AI Call Halted
                  </div>
                  <div className="text-slate-300 leading-relaxed text-[11px]">
                    The outbound leak guard detected residual sensitive entity type(s):{' '}
                    <span className="font-mono text-rose-400 font-bold">
                      {result.leak_check?.leaked_types?.length ? result.leak_check.leaked_types.join(', ') : 'Sensitive PII'}
                    </span>
                    . In accordance with zero-trust perimeter security, cloud transmission was immediately halted to prevent confidential data from leaving local RAM (0ms LLM round-trip latency).
                  </div>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="p-4 rounded-xl bg-orange-950/30 border border-orange-800/60 text-orange-300 text-xs flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-orange-200">
                    Indian Credential Checksum Failure
                  </div>
                  <div className="text-slate-300 leading-relaxed text-[11px]">
                    One or more official Indian identity numbers failed Verhoeff checksum or regex validation. Requests with invalid identifiers are rejected before AI processing.
                  </div>
                </div>
              </div>
            )}

            {/* 3 Result Comparison Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Panel 1: Detected Entities */}
              <div className="rounded-2xl bg-[#080d1a] border border-slate-800 flex flex-col shadow-xl overflow-hidden h-[420px]">
                <div className="px-5 py-3.5 bg-[#0c1222] border-b border-slate-800 flex items-center gap-2 font-mono text-xs font-bold text-rose-400 uppercase">
                  <Lock className="h-4 w-4" />
                  <span>1. Local PII Detected</span>
                </div>
                <div className="p-5 font-mono text-xs text-slate-300 overflow-y-auto space-y-3 flex-1 select-text">
                  <p className="text-[11px] text-slate-400">
                    Detected {(result.entities_detected || result.entities || []).length} sensitive personal entities in local RAM:
                  </p>
                  <div className="space-y-1.5">
                    {(result.entities_detected || result.entities || []).map((ent, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span className="text-white font-bold">{ent.text}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          {ent.type}
                        </span>
                      </div>
                    ))}
                    {(result.entities_detected || result.entities || []).length === 0 && (
                      <div className="text-slate-500 italic">No sensitive personal entities found in text.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Panel 2: Sanitized Outbound Payload */}
              <div className={`rounded-2xl bg-[#080d1a] border flex flex-col shadow-xl overflow-hidden h-[420px] ${
                isBlocked ? 'border-rose-500/40 ring-1 ring-rose-500/30' : 'border-orange-500/40 ring-1 ring-orange-500/30'
              }`}>
                <div className="px-5 py-3.5 bg-[#0c1222] border-b border-slate-800 flex items-center gap-2 font-mono text-xs font-bold uppercase">
                  <Layers className="h-4 w-4 text-orange-400" />
                  <span className={isBlocked ? 'text-rose-400' : 'text-orange-400'}>
                    2. Outbound AI Payload (Zero PII)
                  </span>
                </div>
                <div className="p-5 font-mono text-xs text-slate-300 overflow-y-auto space-y-3 flex-1 select-text bg-slate-950/60 whitespace-pre-wrap">
                  {isBlocked ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-[11px]">
                        <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                          <span>Transmission Halted by Leak Guard</span>
                        </div>
                        Outbound payload withheld from cloud AI. Residual entity detected in text:{' '}
                        <span className="font-bold text-rose-200">
                          {result.leak_check?.leaked_types?.join(', ') || 'Sensitive PII'}
                        </span>
                      </div>
                      {result.sanitized_text && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Local Sanitized Draft (Never Transmitted):
                          </div>
                          <div className="text-slate-300">{result.sanitized_text}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    result.outbound_payload || result.sanitized_text || result.sanitized_prompt || 'No payload generated'
                  )}
                </div>
              </div>

              {/* Panel 3: Final Answer for User */}
              <div className={`rounded-2xl bg-[#080d1a] border flex flex-col shadow-xl overflow-hidden h-[420px] ${
                isBlocked ? 'border-slate-800' : 'border-emerald-500/40 ring-1 ring-emerald-500/20'
              }`}>
                <div className="px-5 py-3.5 bg-[#0c1222] border-b border-slate-800 flex items-center gap-2 font-mono text-xs font-bold text-emerald-400 uppercase">
                  <ShieldCheck className="h-4 w-4" />
                  <span>3. Final Restored Response</span>
                </div>
                <div className="p-5 font-mono text-xs text-slate-300 overflow-y-auto space-y-3 flex-1 select-text bg-slate-950/60 whitespace-pre-wrap">
                  {isBlocked ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 text-[11px]">
                        <div className="font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-orange-400" />
                          <span>Cloud AI Call Suppressed</span>
                        </div>
                        Because the zero-trust leak guard intercepted the outbound payload, external AI invocation was skipped (LLM Latency: 0ms). No AI response exists to reinsert.
                      </div>
                      <div className="text-slate-400 text-xs leading-relaxed">
                        Click <span className="text-white font-bold">Download Internal Risk Assessment PDF</span> above for the full confidential perimeter audit, entity coordinates, and risk score.
                      </div>
                    </div>
                  ) : isRejected ? (
                    <div className="p-3 rounded-lg bg-orange-950/40 border border-orange-900/60 text-orange-300 text-[11px]">
                      <div className="font-bold uppercase tracking-wider mb-1">
                        Credential Validation Failed
                      </div>
                      Please verify invalid identifiers and submit a valid document.
                    </div>
                  ) : (
                    result.final_text || result.final_response || result.llm_output || result.llm_response || 'No response returned'
                  )}
                </div>
              </div>

            </div>

          </div>
        );
      })()}

    </div>
  );
};
