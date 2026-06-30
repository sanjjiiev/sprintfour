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

  // Helper to get action for a span
  const getSpanAction = useCallback((spanId) => {
    const span = spans.find((s) => s.id === spanId);
    if (!span) return null;
    if (overrides[spanId]) return overrides[spanId];
    return span.action;
  }, [spans, overrides]);

  // Compute current redacted text (for text downloads)
  const currentRedactedText = useMemo(() => {
    if (!spans.length) return '';
    return spans.map(span => {
      const action = getSpanAction(span.id);
      if (action === 'REDACTED') return '[REDACTED]';
      return span.text_segment;
    }).join('');
  }, [spans, overrides, getSpanAction]);

  // Auto‑anonymize on text change
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
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
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
        e.target.value = '';
        return;
      }

      if (!extractedText.trim()) {
        alert('No text could be extracted. Please use a text‑based file.');
        setIsUploading(false);
        e.target.value = '';
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
      e.target.value = '';
    }
  };

  // --- Download Redacted ---
  const downloadRedacted = async () => {
    // If we have a stored PDF or DOCX file, download redacted version with overrides
    if (uploadedFile && (uploadedFileType === 'pdf' || uploadedFileType === 'docx')) {
      // Build override map: text_segment -> action
      const overrideMap = {};
      spans.forEach(span => {
        if (overrides[span.id] && overrides[span.id] !== span.action) {
          overrideMap[span.text_segment] = overrides[span.id];
        }
      });
      // If no overrides, we can still proceed
      const formData = new FormData();
      formData.append('file', uploadedFile);
      if (Object.keys(overrideMap).length > 0) {
        formData.append('overrides', JSON.stringify(overrideMap));
        // Optional: confirm with user that overrides will be applied
        if (!window.confirm('Your manual overrides will be applied to the downloaded file. Continue?')) {
          return;
        }
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

    // For text content (pasted or .txt), use currentRedactedText with overrides
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-md flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">Glassbox</h1>
          <p className="text-gray-600">Trust through transparency</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            {isUploading ? 'Uploading...' : '📄 Upload Document'}
            <input
              type="file"
              accept=".txt,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
          <button
            onClick={downloadRedacted}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!spans.length}
          >
            ⬇️ Download Redacted
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
            <DocumentViewer
              spans={spans}
              getSpanAction={getSpanAction}
              onSpanClick={handleSpanClick}
              selectedSpanId={selectedSpanId}
            />
          </div>
          <div className="mt-4 max-w-4xl mx-auto">
            <textarea
              className="w-full p-2 border rounded"
              rows={4}
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste your document here, or upload a file..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload .txt, .docx, or text‑based .pdf – you'll see a preview and can download the redacted file with your manual overrides applied.
            </p>
            {uploadedFile && (
              <p className="text-sm text-green-600 mt-1">
                ✓ File ready for download: <strong>{uploadedFile.name}</strong> (with overrides applied)
              </p>
            )}
            {Object.keys(overrides).length > 0 && (
              <p className="text-sm text-amber-600 mt-1">
                ⚠️ Overrides will be applied to all downloads (text, DOCX, and PDF).
              </p>
            )}
          </div>
        </div>
        <div className="w-80 bg-gray-100 border-l overflow-y-auto p-4">
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