import React from 'react';

// Entity type → accent color mapping (updated to use correct Presidio keys)
const ENTITY_COLORS = {
  EMAIL_ADDRESS:  { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  text: '#3b82f6',  darkText: '#93c5fd', label: 'bg-blue-500'   },
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

function DocumentViewer({ spans, getSpanAction, onSpanClick, selectedSpanId, filterType }) {
  if (!spans.length) return null;

  // We ALWAYS render all spans so the document remains fully readable
  // and context is never lost. The filter will visually highlight only
  // the selected entity type while muting/dimming all others.

  return (
    <div className="leading-relaxed text-[0.93rem] anim-fade-in text-slate-800 dark:text-slate-200 select-text">
      {spans.map((span) => {
        const action     = getSpanAction(span.id);
        const isSelected = span.id === selectedSpanId;
        const isRedacted = action === 'REDACTED';
        const isSafe     = span.entity_type === 'SAFE_TEXT';

        // Check if this span matches the currently active filter (if any)
        const isFilterMatch = !filterType || span.entity_type === filterType;

        // ── SAFE TEXT OR NON-MATCHING VISIBLE SPANS ───────────────────
        // If it's safe text, or if it's a PII span that doesn't match the filter
        // and is kept visible, we display it as plain unhighlighted text.
        if (isSafe || (!isFilterMatch && !isRedacted)) {
          if (isSafe && isRedacted) {
            // Safe text overridden to redacted
            return (
              <span
                key={span.id}
                onClick={() => onSpanClick(span.id)}
                title="Manually redacted — click to inspect"
                className={[
                  'span-redacted',
                  isSelected ? 'span-selected' : '',
                ].join(' ')}
              >
                <span className="font-mono text-[0.78rem] opacity-60 mr-1">▋</span>
                {span.text_segment}
              </span>
            );
          }

          // Normal plain text look
          return (
            <span
              key={span.id}
              onClick={() => onSpanClick(span.id)}
              title="Click to inspect or redact this text"
              className={[
                'cursor-pointer rounded whitespace-pre-wrap transition-all duration-150',
                'hover:bg-slate-100 dark:hover:bg-slate-700/50',
                isSelected
                  ? 'bg-slate-100 dark:bg-slate-700/40 ring-2 ring-brand-400/60 ring-offset-1 dark:ring-offset-navy-900'
                  : '',
              ].join(' ')}
            >
              {span.text_segment}
            </span>
          );
        }

        // ── NON-MATCHING REDACTED SPANS ──────────────────────────────
        // If a span is redacted but doesn't match the filter, we show it
        // as redacted but in a muted/dimmed style so it doesn't distract.
        if (!isFilterMatch && isRedacted) {
          return (
            <span
              key={span.id}
              onClick={() => onSpanClick(span.id)}
              title={`${span.entity_type} (Redacted) — click to inspect`}
              className={[
                'cursor-pointer px-1 rounded transition-colors',
                'bg-slate-200 text-slate-500 dark:bg-slate-800/80 dark:text-slate-500 line-through decoration-slate-400 dark:decoration-slate-600',
                isSelected ? 'ring-2 ring-slate-400 dark:ring-slate-600' : '',
              ].join(' ')}
            >
              <span className="font-mono text-[0.7rem] opacity-40 mr-1">▋</span>
              {span.text_segment}
            </span>
          );
        }

        // ── MATCHING PII SPANS (HIGHLIGHTED) ─────────────────────────
        return (
          <span
            key={span.id}
            onClick={() => onSpanClick(span.id)}
            title={span.logic_reason || 'Click to inspect'}
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