import React from 'react';

function InspectorPanel({ span, onToggleOverride, currentAction }) {
  if (!span) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col items-center justify-center text-gray-400">
        <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p className="text-sm">Click any token to inspect</p>
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
    <div className="bg-white rounded-xl shadow-lg p-6 h-full overflow-y-auto transition-all">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        Inspector
      </h2>

      <div className="mt-4 space-y-4">
        {/* Confidence / Risk */}
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${riskColor} shadow-sm`}></div>
          <div>
            <p className="text-sm font-medium text-gray-600">Confidence</p>
            <p className="text-lg font-semibold text-gray-800">{(span.confidence * 100).toFixed(0)}%</p>
          </div>
        </div>

        {/* Entity Type */}
        <div>
          <p className="text-sm font-medium text-gray-600">Entity Type</p>
          <p className="text-base font-mono text-gray-800">{span.entity_type}</p>
        </div>

        {/* Action */}
        <div>
          <p className="text-sm font-medium text-gray-600">Action</p>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              currentAction === 'REDACTED'
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {currentAction}
          </span>
        </div>

        {/* Reason */}
        <div>
          <p className="text-sm font-medium text-gray-600">Reason</p>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
            {span.logic_reason}
          </p>
        </div>

        {/* Context */}
        {span.context_tokens && span.context_tokens.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-600">Context</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {span.context_tokens.map((token, i) => (
                <span key={i} className="bg-gray-200 px-2.5 py-1 rounded-full text-xs text-gray-700">
                  {token}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Override Button */}
        <button
          onClick={onToggleOverride}
          className={`w-full mt-2 px-4 py-2.5 rounded-lg transition duration-200 text-white font-medium ${
            currentAction === 'REDACTED'
              ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
              : 'bg-amber-500 hover:bg-amber-600 shadow-md hover:shadow-lg'
          }`}
        >
          {currentAction === 'REDACTED' ? '🔓 Unredact' : '🔒 Redact'}
        </button>
      </div>
    </div>
  );
}

export default InspectorPanel;