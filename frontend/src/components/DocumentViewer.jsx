import React from 'react';

function DocumentViewer({ spans, getSpanAction, onSpanClick, selectedSpanId, filterType }) {
  if (!spans.length) return null;

  const filteredSpans = filterType
    ? spans.filter(span => span.entity_type === filterType)
    : spans;

  if (filteredSpans.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No spans of type <strong>{filterType}</strong> found.
      </div>
    );
  }

  return (
    <div className="prose max-w-none">
      {filteredSpans.map((span) => {
        const action = getSpanAction(span.id);
        const isSelected = span.id === selectedSpanId;
        const baseClass =
          action === 'REDACTED'
            ? 'bg-red-200 text-red-800 border border-red-400'
            : 'bg-green-50 hover:bg-green-100';
        return (
          <span
            key={span.id}
            onClick={() => onSpanClick(span.id)}
            className={`cursor-pointer px-1 py-0.5 rounded transition-colors ${baseClass} ${
              isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
            title={span.logic_reason}
          >
            {span.text_segment}
          </span>
        );
      })}
    </div>
  );
}

export default DocumentViewer;