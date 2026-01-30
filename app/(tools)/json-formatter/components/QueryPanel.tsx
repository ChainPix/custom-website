type QueryPanelProps = {
  queryInput: string;
  queryResult: string;
  queryCount: number;
  queryError: string;
  onQueryChange: (value: string) => void;
  onRunQuery: () => void;
  onCopyResult: () => void;
};

export function QueryPanel({
  queryInput,
  queryResult,
  queryCount,
  queryError,
  onQueryChange,
  onRunQuery,
  onCopyResult,
}: QueryPanelProps) {
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">JSONPath / jq-lite query</p>
        <span className="text-[11px] text-slate-500">Matches: {queryCount}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={queryInput}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="$.data.items[0].name"
          className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none"
        />
        <button
          onClick={onRunQuery}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Run
        </button>
        <button
          onClick={onCopyResult}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Copy result
        </button>
      </div>
      {queryError ? (
        <p className="text-xs font-medium text-amber-600">{queryError}</p>
      ) : (
        <pre className="max-h-40 overflow-auto rounded-lg bg-white px-3 py-2 text-xs text-slate-800 shadow-inner ring-1 ring-slate-200">
          {queryResult || "Run a query to see results."}
        </pre>
      )}
    </div>
  );
}
