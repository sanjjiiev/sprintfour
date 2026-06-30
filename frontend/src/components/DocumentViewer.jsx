import React from 'react';

// Entity type → accent color mapping
const ENTITY_COLORS = {
  EMAIL:          { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  text: '#3b82f6',  darkText: '#93c5fd', label: 'bg-blue-500'   },
  PHONE_NUMBER:   { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.28)', text: '#059669',  darkText: '#6ee7b7', label: 'bg-emerald-500' },
  PERSON:         { bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.28)', text: '#7c3aed',  darkText: '#c4b5fd', label: 'bg-violet-500'  },
  LOCATION:       { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.28)', text: '#d97706',  darkText: '#fcd34d', label: 'bg-amber-500'   },
  ORGANIZATION:   { bg: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.28)', text: '#db2777',  darkText: '#f9a8d4', label: 'bg-pink-500'    },
  DATE_TIME:      { bg: 'rgba(14,165,233,0.10)',  border: 'rgba(14,165,233,0.28)', text: '#0284c7',  darkText: '#7dd3fc', label: 'bg-sky-500'     },
  NRP:            { bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.28)', text: '#ea580c',  darkText: '#fdba74', label: 'bg-orange-500'  },
  IP_ADDRESS:     { bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.28)', text: '#4f46e5',  darkText: '#a5b4fc', label: 'bg-indigo-500'  },
  CREDIT_CARD:    { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.28)',  text: '#dc2626',  darkText: '#fca5a5', label: 'bg-red-500'     },
  US_SSN:         { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.28)',  text: '#dc2626',  darkText: '#fca5a5', label: 'bg-red-500'     },
  SAFE_TEXT:      { bg: 'transparent',            border: 'transparent',           text: 'inherit',  darkText: 'inherit', label: 'bg-gray-400'   },
};

function getEntityStyle(entityType) {
  return ENTITY_COLORS[entityType] || {
    bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)',
    text: '#64748b', darkText: '#94a3b8', label: 'bg-slate-500',
  };
}

function DocumentViewer({ spans, getSpanAction, onSpanClick, selectedSpanId, filterType, darkMode }) {
  if (!spans.length) return null;

  const filteredSpans = filterType
    ? spans.filter(span => span.entity_type === filterType)
    : spans;

  if (filteredSpans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center anim-fade-in">
        <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          No spans of type <span className="font-semibold text-brand-500 dark:text-brand-400">{filterType}</span> found.
        </p>
      </div>
    );
  }

  return (
    <div className="leading-relaxed text-[0.93rem] anim-fade-in text-slate-800 dark:text-slate-200">
      {filteredSpans.map((span) => {
        const action     = getSpanAction(span.id);
        const isSelected = span.id === selectedSpanId;
        const isRedacted = action === 'REDACTED';
        const isSafe     = span.entity_type === 'SAFE_TEXT';

        if (isSafe) {
          return (
            <span key={span.id} className="whitespace-pre-wrap">
              {span.text_segment}
            </span>
          );
        }

        return (
          <span
            key={span.id}
            onClick={() => onSpanClick(span.id)}
            title={span.logic_reason}
            className={[
              isRedacted ? 'span-redacted' : 'span-visible',
              isSelected ? 'span-selected' : '',
            ].join(' ')}
          >
            {isRedacted ? (
              <>
                <span className="font-mono text-[0.78rem] opacity-60 mr-1">▋</span>
                {span.text_segment}
              </>
            ) : (
              span.text_segment
            )}
          </span>
        );
      })}
    </div>
  );
}

export default DocumentViewer;