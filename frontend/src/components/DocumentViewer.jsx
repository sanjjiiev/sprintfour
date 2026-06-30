import React from 'react';

function DocumentViewer({ spans, getSpanAction, onSpanClick, selectedSpanId }) {
  if (!spans.length) return <p>No document loaded.</p>;

  return (
    <div className="prose max-w-none">
      {spans.map((span) => {
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