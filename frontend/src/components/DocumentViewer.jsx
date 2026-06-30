import React from 'react';

function DocumentViewer({ spans, getSpanAction, onSpanClick, selectedSpanId, filterType }) {
  if (!spans.length) return null;

  // When a filter is active, show only matching PII spans but keep safe-text
  // spans in between so the document reads coherently; purely-filtered views
  // (no safe text) only happen when filterType is set and we drop unmatched PII.
  const filteredSpans = filterType
    ? spans.filter(span => span.entity_type === filterType || span.entity_type === 'SAFE_TEXT')
    : spans;

  const hasMatchingPII = filterType
    ? spans.some(span => span.entity_type === filterType)
    : true;

  if (!hasMatchingPII) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center anim-fade-in">
        <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          No spans of type{' '}
          <span className="font-semibold text-brand-500 dark:text-brand-400">{filterType}</span>{' '}
          found.
        </p>
      </div>
    );
  }

  return (
    <div className="leading-relaxed text-[0.93rem] anim-fade-in text-slate-800 dark:text-slate-200 select-text">
      {filteredSpans.map((span) => {
        const action     = getSpanAction(span.id);
        const isSelected = span.id === selectedSpanId;
        const isRedacted = action === 'REDACTED';
        const isSafe     = span.entity_type === 'SAFE_TEXT';

        // ── SAFE TEXT ─────────────────────────────────────────────
        // Always make safe-text spans clickable so users can manually
        // redact any word. If it has been overridden to REDACTED, render
        // it with the same red glow style as a PII redaction.
        if (isSafe) {
          if (isRedacted) {
            // User manually redacted this safe-text span
            return (
              <span
                key={span.id}
                onClick={() => onSpanClick(span.id)}
                title="Manually redacted — click to inspect / unredact"
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

          // Normal safe-text: subtle hover so users know every word is interactive
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

        // ── PII / ENTITY SPANS ────────────────────────────────────
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