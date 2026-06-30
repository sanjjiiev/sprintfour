import { useState, useEffect } from 'react';
import DocumentViewer from './components/DocumentViewer';
import InspectorPanel from './components/InspectorPanel';

function App() {
  const [documentText, setDocumentText] = useState(
    'My email is john.doe@example.com and my phone is 555-123-4567. Also, my name is John Doe.'
  );
  const [spans, setSpans] = useState([]);
  const [sanitized, setSanitized] = useState('');
  const [selectedSpanId, setSelectedSpanId] = useState(null);
  const [overrides, setOverrides] = useState({}); // spanId -> new action

  useEffect(() => {
    fetch('/api/v1/anonymize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: documentText }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSpans(data.spans);
        setSanitized(data.sanitized_text);
        // Clear overrides when new text is processed
        setOverrides({});
      })
      .catch(console.error);
  }, [documentText]);

  const handleSpanClick = (spanId) => {
    setSelectedSpanId(spanId);
  };

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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-md">
        <h1 className="text-2xl font-bold text-blue-700">Glassbox</h1>
        <p className="text-gray-600">Trust through transparency</p>
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
              rows={2}
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste your document here..."
            />
            <button
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => {
                // Force re-fetch by updating text state (already done via onChange)
              }}
            >
              Anonymize
            </button>
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