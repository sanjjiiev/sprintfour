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

  // --- File Upload Handlers ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);

    try {
      let extractedText = '';
      const reader = new FileReader();

      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfParse(arrayBuffer);
        extractedText = pdf.text;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (file.type === 'text/plain') {
        const text = await file.text();
        extractedText = text;
      } else {
        alert('Unsupported file type. Please upload .txt, .docx, or .pdf');
        setIsUploading(false);
        return;
      }

      setDocumentText(extractedText);
    } catch (error) {
      console.error('Error extracting text:', error);
      alert('Failed to extract text from file.');
    } finally {
      setIsUploading(false);
      e.target.value = ''; // reset input
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">Glassbox</h1>
          <p className="text-gray-600">Trust through transparency</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            {isUploading ? 'Uploading...' : 'Upload Document'}
            <input
              type="file"
              accept=".txt,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
          <span className="text-sm text-gray-500">.txt .docx .pdf</span>
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
              placeholder="Paste your document here..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Or upload a file (.txt, .docx, .pdf) – text will be extracted automatically.
            </p>
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