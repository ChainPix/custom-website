type OptionsBarProps = {
  indentSize: number;
  sortKeys: boolean;
  sortScope: "recursive" | "top";
  useJSON5: boolean;
  formatOnPaste: boolean;
  formatOnType: boolean;
  preserveNumberFormat: boolean;
  onIndentChange: (value: number) => void;
  onSortKeysChange: (value: boolean) => void;
  onSortScopeChange: (value: "recursive" | "top") => void;
  onJSON5Change: (value: boolean) => void;
  onFormatOnPasteChange: (value: boolean) => void;
  onFormatOnTypeChange: (value: boolean) => void;
  onPreserveNumberFormatChange: (value: boolean) => void;
};

export function OptionsBar({
  indentSize,
  sortKeys,
  sortScope,
  useJSON5,
  formatOnPaste,
  formatOnType,
  preserveNumberFormat,
  onIndentChange,
  onSortKeysChange,
  onSortScopeChange,
  onJSON5Change,
  onFormatOnPasteChange,
  onFormatOnTypeChange,
  onPreserveNumberFormatChange,
}: OptionsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3">
      <div className="flex items-center gap-2">
        <label htmlFor="indent-size" className="text-xs font-medium text-slate-600">
          Indent:
        </label>
        <select
          id="indent-size"
          value={indentSize}
          onChange={(event) => onIndentChange(Number(event.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value={2}>2 spaces</option>
          <option value={4}>4 spaces</option>
          <option value={8}>8 spaces</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          checked={sortKeys}
          onChange={(event) => onSortKeysChange(event.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
        />
        Sort keys
      </label>
      {sortKeys && (
        <select
          value={sortScope}
          onChange={(event) => onSortScopeChange(event.target.value as "recursive" | "top")}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="recursive">Recursive</option>
          <option value="top">Top-level only</option>
        </select>
      )}
      <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          checked={useJSON5}
          onChange={(event) => onJSON5Change(event.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
        />
        JSON5 mode
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          checked={formatOnPaste}
          onChange={(event) => onFormatOnPasteChange(event.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
        />
        Format on paste
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          checked={formatOnType}
          onChange={(event) => onFormatOnTypeChange(event.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
        />
        Format on type
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          checked={preserveNumberFormat}
          onChange={(event) => onPreserveNumberFormatChange(event.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
        />
        Preserve number formatting
      </label>
    </div>
  );
}
