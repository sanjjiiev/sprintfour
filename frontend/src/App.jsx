import { useState, useEffect, useMemo, useCallback } from 'react';
import DocumentViewer from './components/DocumentViewer';
import InspectorPanel from './components/InspectorPanel';
import mammoth from 'mammoth';

// ─── Entity type → display label map ────────────────────────────
const ENTITY_LABELS = {
  EMAIL_ADDRESS: 'Email', PHONE_NUMBER: 'Phone', PERSON: 'Person',
  LOCATION: 'Location', ORGANIZATION: 'Org', DATE_TIME: 'Date/Time',
  NRP: 'NRP', IP_ADDRESS: 'IP', CREDIT_CARD: 'Credit Card', US_SSN: 'SSN',
};

// ─── Icon helpers ────────────────────────────────────────────────
function ShieldIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function UploadIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}
function DownloadIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
function CopyIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  );
}
function SpinnerIcon({ className }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
function SunIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  );
}
function MoonIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard({ label, value, dotColor, valueClass }) {
  return (
    <div className="stat-pill min-w-[72px]">
      <div className="flex items-center gap-1.5">
        {dotColor && <span className={`w-2 h-2 rounded-full ${dotColor}`} />}
        <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </span>
      </div>
      <span className={`text-xl font-bold tabular-nums ${valueClass || 'text-slate-800 dark:text-slate-100'}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
function App() {
  const [documentText, setDocumentText] = useState(
    'My email is john.doe@example.com and my phone is 555-123-4567. Also, my name is John Doe.'
  );
  const [spans, setSpans] = useState([]);
  const [sanitized, setSanitized] = useState('');
  const [selectedSpanId, setSelectedSpanId] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileType, setUploadedFileType] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  // Apply dark/light class to <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ── Helper ─────────────────────────────────────────────────────
  const getSpanAction = useCallback((spanId) => {
    const span = spans.find((s) => s.id === spanId);
    if (!span) return null;
    if (overrides[spanId]) return overrides[spanId];
    return span.action;
  }, [spans, overrides]);

  // ── Current redacted text (with overrides) ─────────────────────
  const currentRedactedText = useMemo(() => {
    if (!spans.length) return '';
    return spans.map(span => {
      const action = getSpanAction(span.id);
      if (action === 'REDACTED') return '[REDACTED]';
      return span.text_segment;
    }).join('');
  }, [spans, overrides, getSpanAction]);

  // ── Summary statistics ─────────────────────────────────────────
  const summary = useMemo(() => {
    if (!spans.length) return null;
    
    // We only count actual PII spans OR plain text spans that the user manually redacted
    const piiSpans = spans.filter(span => span.entity_type !== 'SAFE_TEXT' || overrides[span.id] === 'REDACTED');
    
    let redacted = 0, visible = 0, overridden = 0, totalConfidence = 0, detectedCount = 0;
    
    spans.forEach(span => {
      if (overrides[span.id]) overridden++;
    });

    piiSpans.forEach(span => {
      const action = getSpanAction(span.id);
      if (action === 'REDACTED') redacted++;
      else visible++;
      
      // Calculate avg confidence only for auto-detected PII to avoid skews from safe text
      if (span.entity_type !== 'SAFE_TEXT') {
        totalConfidence += span.confidence;
        detectedCount++;
      }
    });

    return {
      total: piiSpans.length,
      redacted,
      visible,
      overridden,
      avgConfidence: detectedCount > 0 ? (totalConfidence / detectedCount) : 0,
    };
  }, [spans, overrides, getSpanAction]);

  // ── Unique entity types for filter ─────────────────────────────
  const entityTypes = useMemo(() => {
    const types = new Set();
    spans.forEach(span => {
      if (span.entity_type && span.entity_type !== 'SAFE_TEXT') {
        types.add(span.entity_type);
      }
    });
    return Array.from(types).sort();
  }, [spans]);

  // ── Auto-anonymize on text change ──────────────────────────────
  useEffect(() => {
    if (!documentText.trim()) return;
    fetch('/api/v1/anonymize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: documentText }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSpans(data.spans);
        setSanitized(data.sanitized_text);
        setOverrides({});
        setFilterType(null);
      })
      .catch(console.error);
  }, [documentText]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleSpanClick = (spanId) => setSelectedSpanId(spanId);

  const toggleOverride = (spanId) => {
    setOverrides((prev) => {
      const currentAction = getSpanAction(spanId);
      const newAction = currentAction === 'REDACTED' ? 'KEPT_VISIBLE' : 'REDACTED';
      return { ...prev, [spanId]: newAction };
    });
  };

  const selectedSpan = spans.find((s) => s.id === selectedSpanId);

  // ── File Upload ────────────────────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      let extractedText = '';
      let fileType = '';

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        fileType = 'pdf';
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/v1/extract-pdf-text', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Backend extraction failed: ${errText}`);
        }
        const data = await response.json();
        extractedText = data.text;
        if (!extractedText.trim()) throw new Error('Backend returned empty text');
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.docx')
      ) {
        fileType = 'docx';
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        fileType = 'txt';
        const text = await file.text();
        extractedText = text;
      } else {
        alert('Unsupported file type. Please upload .txt, .docx, or .pdf');
        setIsUploading(false);
        return;
      }

      if (!extractedText.trim()) {
        alert('No text could be extracted. Please use a text‑based file.');
        setIsUploading(false);
        return;
      }

      setDocumentText(extractedText);
      if (fileType === 'pdf' || fileType === 'docx') {
        setUploadedFile(file);
        setUploadedFileType(fileType);
      } else {
        setUploadedFile(null);
        setUploadedFileType('');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Failed to process file: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Download Redacted ──────────────────────────────────────────
  const downloadRedacted = async () => {
    if (uploadedFile && (uploadedFileType === 'pdf' || uploadedFileType === 'docx')) {
      const overrideMap = {};
      spans.forEach(span => {
        if (overrides[span.id] && overrides[span.id] !== span.action) {
          overrideMap[span.text_segment] = overrides[span.id];
        }
      });
      const formData = new FormData();
      formData.append('file', uploadedFile);
      if (Object.keys(overrideMap).length > 0) {
        formData.append('overrides', JSON.stringify(overrideMap));
        if (!window.confirm('Your manual overrides will be applied to the downloaded file. Continue?')) return;
      }
      const endpoint = uploadedFileType === 'pdf' ? '/api/v1/redact-pdf' : '/api/v1/redact-docx';
      try {
        const response = await fetch(endpoint, { method: 'POST', body: formData });
        if (!response.ok) {
          const errText = await response.text();
          alert(`Redaction failed: ${errText}`);
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redacted.${uploadedFileType}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download redacted file.');
      }
      return;
    }

    if (!currentRedactedText) {
      alert('No redacted document available.');
      return;
    }
    const blob = new Blob([currentRedactedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'redacted_document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Copy Redacted ──────────────────────────────────────────────
  const copyRedactedText = async () => {
    if (!currentRedactedText) {
      alert('No redacted text available.');
      return;
    }
    try {
      await navigator.clipboard.writeText(currentRedactedText);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = currentRedactedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // ── Drag & drop handlers ───────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  // ──────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col min-h-screen font-sans transition-colors duration-300
      ${darkMode
        ? 'bg-navy-900 bg-mesh-dark text-slate-100'
        : 'bg-slate-50 bg-mesh-light text-slate-900'
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/30 flex-shrink-0">
              <ShieldIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                Glassbox
              </h1>
              <p className="text-[0.65rem] font-medium tracking-widest uppercase text-brand-500 dark:text-brand-400 mt-0.5">
                Trust through transparency
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
                bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700
                text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200
                border border-slate-200 dark:border-slate-700"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>

            {/* Upload */}
            <label className="btn-primary cursor-pointer">
              {isUploading ? (
                <>
                  <SpinnerIcon className="w-4 h-4" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <UploadIcon className="w-4 h-4" />
                  <span>Upload</span>
                </>
              )}
              <input
                type="file"
                accept=".txt,.docx,.pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
                className="hidden"
                disabled={isUploading}
              />
            </label>

            {/* Download */}
            <button
              onClick={downloadRedacted}
              className="btn-success"
              disabled={!spans.length}
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-5">

        {/* ── Left column ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Input / drop zone */}
          <div
            className={`glass-card rounded-2xl p-4 transition-all duration-200
              ${isDragging ? 'drag-active border-2 border-brand-500' : 'border border-transparent'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <svg className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-[0.72rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Input Document
              </span>
            </div>
            <textarea
              className="w-full bg-transparent resize-none text-sm leading-relaxed
                text-slate-700 dark:text-slate-300
                placeholder-slate-300 dark:placeholder-slate-600
                focus:outline-none focus:ring-0
                border border-slate-200 dark:border-slate-700/60
                rounded-xl px-3.5 py-2.5 transition-colors duration-150
                focus:border-brand-400 dark:focus:border-brand-500"
              rows={4}
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste your document here, or drag & drop a .txt, .docx, or .pdf file…"
            />

            {/* Footer row */}
            <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                {['TXT', 'DOCX', 'PDF'].map(ext => (
                  <span key={ext} className="text-[0.65rem] px-1.5 py-0.5 rounded font-mono font-medium
                    bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500
                    border border-slate-200 dark:border-slate-700/50">
                    .{ext.toLowerCase()}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {uploadedFile && (
                  <span className="text-[0.72rem] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    {uploadedFile.name}
                  </span>
                )}
                {Object.keys(overrides).length > 0 && (
                  <span className="text-[0.72rem] font-medium text-amber-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {Object.keys(overrides).length} override{Object.keys(overrides).length > 1 ? 's' : ''} active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          {summary && (
            <div className="glass-card rounded-2xl px-4 py-3 anim-slide-up">
              <div className="flex flex-wrap items-center justify-between gap-3">

                {/* Metrics */}
                <div className="flex items-center gap-2 flex-wrap">
                  <StatCard label="Total" value={summary.total} />
                  <StatCard
                    label="Redacted"
                    value={summary.redacted}
                    dotColor="bg-red-500"
                    valueClass="text-red-600 dark:text-red-400"
                  />
                  <StatCard
                    label="Visible"
                    value={summary.visible}
                    dotColor="bg-emerald-500"
                    valueClass="text-emerald-600 dark:text-emerald-400"
                  />
                  {summary.overridden > 0 && (
                    <StatCard
                      label="Overrides"
                      value={summary.overridden}
                      dotColor="bg-amber-400"
                      valueClass="text-amber-600 dark:text-amber-400"
                    />
                  )}
                  <StatCard
                    label="Avg Confidence"
                    value={`${(summary.avgConfidence * 100).toFixed(0)}%`}
                    valueClass="text-brand-600 dark:text-brand-400"
                  />
                </div>

                {/* Copy button */}
                <button onClick={copyRedactedText} className="btn-ghost">
                  {copySuccess ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5" />
                      Copy Redacted
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Filter pills */}
          {entityTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 anim-fade-in">
              <span className="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">
                Filter
              </span>
              <button
                className={`filter-pill ${filterType === null ? 'filter-pill-active' : ''}`}
                onClick={() => setFilterType(null)}
              >
                All
              </button>
              {entityTypes.map(type => (
                <button
                  key={type}
                  className={`filter-pill ${filterType === type ? 'filter-pill-active' : ''}`}
                  onClick={() => setFilterType(type)}
                >
                  {ENTITY_LABELS[type] || type}
                </button>
              ))}
              {filterType !== null && (
                <button
                  className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs"
                  onClick={() => setFilterType(null)}
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Document Viewer */}
          <div className="glass-card rounded-2xl p-5 flex-1 overflow-y-auto min-h-[280px] anim-fade-in">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/50">
              <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[0.72rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Document Preview
              </span>
              {spans.length > 0 && (
                <span className="ml-auto text-[0.65rem] font-medium px-2 py-0.5 rounded-full
                  bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400
                  border border-brand-100 dark:border-brand-800/40">
                  {spans.filter(s => s.entity_type !== 'SAFE_TEXT').length} entities
                </span>
              )}
            </div>

            {spans.length > 0 ? (
              <DocumentViewer
                spans={spans}
                getSpanAction={getSpanAction}
                onSpanClick={handleSpanClick}
                selectedSpanId={selectedSpanId}
                filterType={filterType}
                darkMode={darkMode}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  Upload or paste a document to see redactions
                </p>
                <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
                  PII will be automatically detected and highlighted
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Inspector Panel ────────────────────────────────────── */}
        <aside className="lg:w-72 xl:w-80 w-full flex-shrink-0">
          <InspectorPanel
            span={selectedSpan}
            onToggleOverride={() => selectedSpan && toggleOverride(selectedSpan.id)}
            currentAction={selectedSpan ? getSpanAction(selectedSpan.id) : null}
          />
        </aside>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800/60 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <p className="text-[0.68rem] text-slate-400 dark:text-slate-600">
            © 2025 Glassbox · AI-powered PII redaction
          </p>
          <div className="flex items-center gap-1.5 text-[0.68rem] text-slate-400 dark:text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            All processing happens locally · No data stored
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;