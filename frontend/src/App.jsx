import { useState, useEffect, useMemo, useCallback } from 'react';
import DocumentViewer from './components/DocumentViewer';
import InspectorPanel from './components/InspectorPanel';
import mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';

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
  const [filterType, setFilterType] = useState(null); // null = show all

  // Helper
  const getSpanAction = useCallback((spanId) => {
    const span = spans.find((s) => s.id === spanId);
    if (!span) return null;
    if (overrides[spanId]) return overrides[spanId];
    return span.action;
  }, [spans, overrides]);

  // Current redacted text (with overrides)
  const currentRedactedText = useMemo(() => {
    if (!spans.length) return '';
    return spans.map(span => {
      const action = getSpanAction(span.id);
      if (action === 'REDACTED') return '[REDACTED]';
      return span.text_segment;
    }).join('');
  }, [spans, overrides, getSpanAction]);

  // Summary statistics
  const summary = useMemo(() => {
    if (!spans.length) return null;
    let redacted = 0, visible = 0, overridden = 0, totalConfidence = 0;
    spans.forEach(span => {
      const action = getSpanAction(span.id);
      if (action === 'REDACTED') redacted++;
      else visible++;
      if (overrides[span.id]) overridden++;
      totalConfidence += span.confidence;
    });
    return {
      total: spans.length,
      redacted,
      visible,
      overridden,
      avgConfidence: (totalConfidence / spans.length) || 0
    };
  }, [spans, overrides, getSpanAction]);

  // Get unique entity types for filter
  const entityTypes = useMemo(() => {
    const types = new Set();
    spans.forEach(span => {
      if (span.entity_type && span.entity_type !== 'SAFE_TEXT') {
        types.add(span.entity_type);
      }
    });
    return Array.from(types).sort();
  }, [spans]);

  // Auto-anonymize on text change
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
        setFilterType(null); // reset filter on new doc
      })
      .catch(console.error);
  }, [documentText]);

  // Handlers
  const handleSpanClick = (spanId) => setSelectedSpanId(spanId);

  const toggleOverride = (spanId) => {
    setOverrides((prev) => {
      const currentAction = getSpanAction(spanId);
      const newAction = currentAction === 'REDACTED' ? 'KEPT_VISIBLE' : 'REDACTED';
      return { ...prev, [spanId]: newAction };
    });
  };

  const selectedSpan = spans.find((s) => s.id === selectedSpanId);

  // --- File Upload ---
  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      let extractedText = '';
      let fileType = '';

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        fileType = 'pdf';
        let arrayBuffer = await file.arrayBuffer();
        try {
          const pdf = await pdfParse(arrayBuffer);
          extractedText = pdf.text;
          if (!extractedText.trim()) throw new Error('Empty text');
        } catch (pdfError) {
          console.warn('pdf-parse failed, trying backend extraction...', pdfError);
          const formData = new FormData();
          const fileBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
          formData.append('file', fileBlob, file.name);
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
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) {
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

  // --- Download Redacted ---
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
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
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

  // --- Copy Redacted ---
  const copyRedactedText = async () => {
    if (!currentRedactedText) {
      alert('No redacted text available.');
      return;
    }
    try {
      await navigator.clipboard.writeText(currentRedactedText);
      alert('✅ Redacted text copied to clipboard!');
    } catch (err) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = currentRedactedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('✅ Redacted text copied to clipboard!');
    }
  };

  // Drag & drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
              Glassbox
            </h1>
            <p className="text-sm text-gray-500">Trust through transparency</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition duration-200 shadow-md hover:shadow-lg flex items-center gap-2">
              {isUploading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  Upload
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
            <button
              onClick={downloadRedacted}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg transition duration-200 shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!spans.length}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Download
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          {/* Upload / Paste */}
          <div
            className={`bg-white rounded-xl shadow-lg p-4 transition-all duration-200 ${isDragging ? 'ring-4 ring-blue-400 ring-opacity-50 border-blue-400' : 'border border-gray-200'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <textarea
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none text-gray-700"
              rows={3}
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste your document here, or drag & drop a file..."
            />
            <div className="flex justify-between items-center mt-2 text-xs text-gray-400 flex-wrap gap-2">
              <span>Supports .txt, .docx, .pdf (text‑based)</span>
              {uploadedFile && (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  {uploadedFile.name}
                </span>
              )}
              {Object.keys(overrides).length > 0 && (
                <span className="text-amber-500 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  Overrides active
                </span>
              )}
            </div>
          </div>

          {/* Risk Summary + Copy + Filter */}
          {summary && (
            <div className="bg-white rounded-xl shadow-lg p-4 flex flex-wrap items-center justify-between gap-3 border border-gray-100">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="font-semibold text-gray-800">{summary.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-sm text-gray-500">Redacted</span>
                  <span className="font-semibold text-gray-800">{summary.redacted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-sm text-gray-500">Visible</span>
                  <span className="font-semibold text-gray-800">{summary.visible}</span>
                </div>
                {summary.overridden > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                    <span className="text-sm text-gray-500">Overrides</span>
                    <span className="font-semibold text-amber-600">{summary.overridden}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Avg confidence</span>
                  <span className="font-semibold text-gray-800">{(summary.avgConfidence * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyRedactedText}
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-1.5 rounded-lg transition text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Redacted
                </button>
              </div>
            </div>
          )}

          {/* Entity Type Filter Pills */}
          {entityTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-500 mr-1">Filter:</span>
              <button
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  filterType === null
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setFilterType(null)}
              >
                All
              </button>
              {entityTypes.map(type => (
                <button
                  key={type}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    filterType === type
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setFilterType(type)}
                >
                  {type}
                </button>
              ))}
              {filterType !== null && (
                <button
                  className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                  onClick={() => setFilterType(null)}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Document Viewer */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex-1 overflow-y-auto min-h-[300px]">
            <DocumentViewer
              spans={spans}
              getSpanAction={getSpanAction}
              onSpanClick={handleSpanClick}
              selectedSpanId={selectedSpanId}
              filterType={filterType}
            />
            {!spans.length && (
              <div className="flex items-center justify-center h-full text-gray-400 text-center">
                <p>Upload or paste a document to see redactions</p>
              </div>
            )}
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="lg:w-80 w-full">
          <InspectorPanel
            span={selectedSpan}
            onToggleOverride={() => selectedSpan && toggleOverride(selectedSpan.id)}
            currentAction={selectedSpan ? getSpanAction(selectedSpan.id) : null}
          />
        </div>
      </div>
    </div>
  );
}

export default App;