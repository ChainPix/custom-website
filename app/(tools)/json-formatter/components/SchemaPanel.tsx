type ValidationResult = {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
};

type SchemaPanelProps = {
  schemaInput: string;
  onSchemaChange: (value: string) => void;
  onValidate: () => void;
  validationResult: ValidationResult | null;
};

export function SchemaPanel({
  schemaInput,
  onSchemaChange,
  onValidate,
  validationResult,
}: SchemaPanelProps) {
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold text-slate-700">JSON Schema Validation</p>
      <textarea
        value={schemaInput}
        onChange={(event) => onSchemaChange(event.target.value)}
        placeholder='Paste JSON Schema here e.g. {"type":"object","required":["name"]}'
        className="h-24 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />
      <button
        onClick={onValidate}
        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        Validate Against Schema
      </button>
      {validationResult && (
        <div
          className={`rounded-lg p-2 text-xs ${
            validationResult.valid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {validationResult.valid ? (
            <p className="font-semibold">✓ Valid JSON - matches schema</p>
          ) : (
            <div>
              <p className="mb-1 font-semibold">✗ Validation Errors:</p>
              <ul className="list-disc space-y-1 pl-4">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>
                    <span className="font-medium">{error.path || "root"}:</span> {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
