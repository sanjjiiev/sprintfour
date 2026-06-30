import React from 'react';

// Entity type badge colors
const ENTITY_BADGE = {
  EMAIL:          'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700/40',
  PHONE_NUMBER:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/40',
  PERSON:         'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-700/40',
  LOCATION:       'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700/40',
  ORGANIZATION:   'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-700/40',
  DATE_TIME:      'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-700/40',
  NRP:            'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700/40',
  IP_ADDRESS:     'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/40',
  CREDIT_CARD:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700/40',
  US_SSN:         'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700/40',
};

function EntityBadge({ type }) {
  const cls = ENTITY_BADGE[type] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase ${cls}`}>
      {type?.replace(/_/g, ' ')}
    </span>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const colorClass = pct >= 80 ? 'conf-high' : pct >= 50 ? 'conf-medium' : 'conf-low';
  const ringColor  = pct >= 80 ? 'text-red-500 dark:text-red-400'
                   : pct >= 50 ? 'text-amber-500 dark:text-amber-400'
                   :             'text-emerald-500 dark:text-emerald-400';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className={`text-sm font-bold tabular-nums ${ringColor}`}>{pct}%</span>
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function InspectorPanel({ span, onToggleOverride, currentAction }) {
  if (!span) {
    return (
      <div className="glass-card rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center anim-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No token selected</p>
        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Click any highlighted span to inspect it</p>
      </div>
    );
  }

  const isRedacted = currentAction === 'REDACTED';

  return (
    <div className="glass-card rounded-2xl p-5 h-full overflow-y-auto anim-slide-up flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-700/50">
        <div className="w-8 h-8 rounded-xl bg-brand-500/10 dark:bg-brand-400/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">Inspector</h2>
          <p className="text-[0.7rem] text-slate-400 dark:text-slate-500 mt-0.5">Token details</p>
        </div>
      </div>

      {/* Token preview */}
      <InfoRow label="Token">
        <div className={`px-3 py-2 rounded-lg text-sm font-mono font-medium break-all
          ${isRedacted
            ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40'
            : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50'
          }`}>
          {span.text_segment}
        </div>
      </InfoRow>

      {/* Entity type */}
      <InfoRow label="Entity Type">
        <EntityBadge type={span.entity_type} />
      </InfoRow>

      {/* Confidence */}
      <InfoRow label="Confidence">
        <ConfidenceBar value={span.confidence} />
      </InfoRow>

      {/* Action status */}
      <InfoRow label="Current Action">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
          ${isRedacted
            ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/40'
            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isRedacted ? 'bg-red-500' : 'bg-emerald-500'}`} />
          {currentAction}
        </span>
      </InfoRow>

      {/* Reason */}
      <InfoRow label="Reason">
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700/40">
          {span.logic_reason}
        </p>
      </InfoRow>

      {/* Context tokens */}
      {span.context_tokens && span.context_tokens.length > 0 && (
        <InfoRow label="Context">
          <div className="flex flex-wrap gap-1.5">
            {span.context_tokens.map((token, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md text-[0.7rem] font-medium bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/40"
              >
                {token}
              </span>
            ))}
          </div>
        </InfoRow>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Override toggle */}
      <button
        onClick={onToggleOverride}
        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 border
          ${isRedacted
            ? 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white border-brand-600/50 shadow-md hover:shadow-brand-500/25 hover:-translate-y-0.5'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-amber-600/50 shadow-md hover:shadow-amber-500/25 hover:-translate-y-0.5'
          }`}
      >
        {isRedacted ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Unredact Token
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 11V7a4 4 0 118 0v4" />
            </svg>
            Redact Token
          </>
        )}
      </button>
    </div>
  );
}

export default InspectorPanel;