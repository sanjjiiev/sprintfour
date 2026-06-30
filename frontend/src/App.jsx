import { useState, useEffect } from 'react';
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

  // For format‑preserving download
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileType, setUploadedFileType] = useState(''); // 'pdf' or 'docx'

  // Auto-anonymize whenever documentText changes
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

  const handleSpanClick = (spanId) => setSelectedSpanId(spanId);

  const toggleOverride = (spanId) => {
    setOverrides((prev) => {
      const currentAction = getSpanAction(spanId);
      const newAction = currentAction === 'REDACTED' ? 'KEPT_VISIBLE' : 'REDACTED';
      return { ...prev, [spanId]: newAction };
    });
  };

  const getSpanAction = (spanId) => {
    const span = spans.find((s) => s.id === spanId);
    if (!span) return null;
    if (overrides[spanId]) return overrides[spanId];
    return span.action;
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

        // Try pdf-parse first (for text‑based PDFs)
        try {
          const pdf = await pdfParse(arrayBuffer);
          extractedText = pdf.text;
          if (!extractedText.trim()) {
            // If empty, fallback to backend extraction
            throw new Error('Empty text from pdf-parse');
          }
        } catch (pdfError) {
          console.warn('pdf-parse failed, trying backend extraction...', pdfError);
          // Fallback: send PDF to backend for text extraction using PyMuPDF
          const formData = new FormData();
          // Re‑construct the file as a Blob
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
          if (!extractedText.trim()) {
            throw new Error('Backend returned empty text');
          }
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
        alert('No text could be extracted from the file. Please ensure it contains readable text.');
        setIsUploading(false);
        e.target.value = '';
        return;
      }

      // Show the extracted text preview
      setDocumentText(extractedText);

      // Store the file and its type for later download (only for PDF/DOCX)
      if (fileType === 'pdf' || fileType === 'docx') {
        setUploadedFile(file);
        setUploadedFileType(fileType);
      } else {
        // For text, clear stored file so download uses text version
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
    // If we have a stored PDF or DOCX file, download the redacted version in that format
    if (uploadedFile && (uploadedFileType === 'pdf' || uploadedFileType === 'docx')) {
      const endpoint = uploadedFileType === 'pdf' ? '/api/v1/redact-pdf' : '/api/v1/redact-docx';
      const formData = new FormData();
      formData.append('file', uploadedFile);

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

    // Otherwise, fallback to text download (for pasted text or .txt files)
    if (!sanitized) {
      alert('No redacted document available. Please anonymize a document first.');
      return;
    }
    const blob = new Blob([sanitized], { type: 'text/plain;charset=utf-8' });
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
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            disabled={!sanitized}
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
              placeholder="Paste your document here, or upload a file for preview..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload .txt, .docx, or text‑based .pdf – you'll see a redacted preview and can download the redacted file.
            </p>
            {uploadedFile && (
              <p className="text-sm text-green-600 mt-1">
                ✓ File ready for download: <strong>{uploadedFile.name}</strong> (redacted version)
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