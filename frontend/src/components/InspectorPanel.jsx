import React from 'react';

function InspectorPanel({ span, onToggleOverride, currentAction }) {
  if (!span) {
    return (
      <div className="text-gray-500 text-center mt-10">
        Click any token to inspect
      </div>
    );
  }

  const riskColor =
    span.confidence >= 0.8
      ? 'bg-red-500'
      : span.confidence >= 0.5
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <div>
      <h2 className="text-lg font-bold border-b pb-2">Inspector</h2>
      <div className="mt-4 space-y-3">
        <div className="flex items-center">
          <span className={`w-4 h-4 rounded-full ${riskColor}`}></span>
          <span className="ml-2 text-sm">
            Confidence: {(span.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div>
          <span className="font-semibold">Type:</span> {span.entity_type}
        </div>
        <div>
          <span className="font-semibold">Action:</span>{' '}
          <span
            className={`px-2 py-0.5 rounded text-sm ${
              currentAction === 'REDACTED'
                ? 'bg-red-200 text-red-800'
                : 'bg-green-200 text-green-800'
            }`}
          >
            {currentAction}
          </span>
        </div>
        <div>
          <span className="font-semibold">Reason:</span>
          <p className="text-sm text-gray-700 mt-1">{span.logic_reason}</p>
        </div>
        {span.context_tokens.length > 0 && (
          <div>
            <span className="font-semibold">Context:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {span.context_tokens.map((token, i) => (
                <span key={i} className="bg-gray-200 px-2 py-0.5 rounded text-sm">
                  {token}
                </span>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={onToggleOverride}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          {currentAction === 'REDACTED' ? 'Unredact' : 'Redact'} this span
        </button>
      </div>
    </div>
  );
}

export default InspectorPanel;