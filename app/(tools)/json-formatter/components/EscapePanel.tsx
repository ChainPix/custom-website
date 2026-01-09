type EscapePanelProps = {
  onEscape: () => void;
  onUnescape: () => void;
};

export function EscapePanel({ onEscape, onUnescape }: EscapePanelProps) {
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold text-slate-700">String Escape/Unescape</p>
      <div className="flex gap-2">
        <button
          onClick={onEscape}
          className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          Escape
        </button>
        <button
          onClick={onUnescape}
          className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          Unescape
        </button>
      </div>
      <p className="text-xs text-slate-600">Convert special characters like \n, \t, and Unicode escapes</p>
    </div>
  );
}
