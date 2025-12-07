# JSON Table Viewer – Manual Test Checklist

## Scenarios
1) **Valid render**
   - Paste a valid JSON array of objects → rows/columns render; counts show.
2) **Invalid input**
   - Malformed JSON or non-array shows inline error; status announces it.
3) **Samples & reset**
   - Load flat and nested samples; table updates. Reset restores defaults.
   - Swap button updates input (demo reverse) without breaking parse.
4) **Copy/Download**
   - Copy JSON/CSV; Save JSON/CSV → content matches visible columns; status updates.
5) **Filtering/sorting**
   - Enter a filter term; rows narrow. Click headers to sort asc/desc; toggles show arrows.
6) **Row limit/truncation**
   - Set a small row limit; warning shows “Showing first N rows.” Large input triggers 40k-char warning.
7) **Columns visibility**
   - Toggle columns on/off; table and exports respect visibility.
8) **Accessibility**
   - aria-live announces status; table region labeled; controls have aria-labels/focus states.
