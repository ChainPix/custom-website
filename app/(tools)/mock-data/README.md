# Mock Data Generator Tool Documentation

## Primary Use Cases
- Create sample users for UI prototyping and demo screens
- Generate transaction records for QA and testing
- Produce CSV fixtures for spreadsheets and data imports
- Create SQL inserts for local database seeding
- Quick data for unit tests or integration tests
- Relational presets unlock API mock servers, database seeding workflows, and realistic frontend demos

---

## Features
- **Client-side generation** using browser JavaScript (no uploads)
- **Two schemas**: User profiles and transactions
- **Custom schema builder**: Define fields, types, and constraints with live preview
- **Seeded generation**: Same inputs + seed produce identical output for testing
- **Relational presets**: Link collections with mapping templates and multi-table CSV/SQL exports
- **Advanced outputs**: TypeScript interfaces, JSON Schema, OpenAPI examples, Prisma seeds, MongoDB insertMany(), SQL dialects
- **Performance mode**: Chunked large-scale generation with optional zip downloads
- **Saved templates**: LocalStorage persistence and JSON import/export with a preset gallery
- **Template search**: Tag and filter saved templates for quick reuse
- **UX polish**: Syntax highlighting, diff view, inline schema warnings, and keyboard shortcuts
- **Locale/domain packs**: Region-aware names, cities, dates, currency, and industry vocabularies
- **API & automation hooks**: Secure `/api/generate` endpoint with API key + rate limits, plus the `mockgen` CLI
- **Three formats**: JSON, CSV, and SQL insert statements
- **Pretty-print JSON** toggle for readable output
- **Record count control** with performance guard (max 500)
- **Copy and download** output with one click
- **Reset** options to defaults

---

## Supported Schemas

### 1) User Profile
Fields generated:
- `id` (8-char base36)
- `name` (first + last)
- `email` (example.com)
- `city`
- `jobTitle`
- `createdAt` (ISO 8601)

### 2) Transaction
Fields generated:
- `id` (8-char base36)
- `userId` (8-char base36)
- `amount` (0.00 - 500.00)
- `currency` (USD)
- `status` (pending, paid, failed, refunded)
- `createdAt` (ISO 8601)

---

## Output Formats

### JSON
- Array of objects
- Pretty-print option for human-readable output
- Suitable for mocks, fixtures, and API simulations

### CSV
- Header row generated from schema fields
- Values are quoted and escaped
- Ideal for spreadsheet imports or ETL tests

### SQL
- Generates a single `INSERT INTO` statement
- Table name matches schema (`user` or `transaction`)
- Values are SQL-escaped for single quotes
- Useful for local database seeding

---

## Quick Start
1. Choose a schema (User or Transaction).
2. Choose an output format (JSON, CSV, SQL).
3. Set a record count (1 to 500).
4. Click **Generate**.
5. Copy or download the output.

---

## Automation Hooks (API/CLI)
- API: `POST /api/generate` with `x-api-key: $MOCK_DATA_API_KEY`
- CLI: `mockgen generate schema.json --count 100 --format csv --seed demo`

---

## Usage

### Step-by-step
1. **Select Schema**: User profile or Transaction.
2. **Select Format**: JSON, CSV, or SQL.
3. **Set Count**: Up to 500 records.
4. **Generate**: Output appears in the right panel.
5. **Copy or Download**: Use action buttons to export.

### Notes
- JSON pretty-print is only available for JSON output.
- SQL output uses schema name as the table name.
- Generated values are random unless a seed is provided.

---

## Examples

### JSON Example (User)
```json
[
  {
    "id": "q7n2z9ab",
    "name": "Alex Morgan",
    "email": "k4m2tq@example.com",
    "city": "Berlin",
    "jobTitle": "Engineer",
    "createdAt": "2025-05-12T08:41:22.512Z"
  }
]
```

### CSV Example (Transaction)
```csv
id,userId,amount,currency,status,createdAt
"j8sk2p1a","x3s9v0cd","245.52","USD","paid","2025-04-01T15:18:45.120Z"
```

### SQL Example (Transaction)
```sql
INSERT INTO transaction (id, userId, amount, currency, status, createdAt) VALUES
('j8sk2p1a', 'x3s9v0cd', 245.52, 'USD', 'paid', '2025-04-01T15:18:45.120Z');
```

---

## Limits and Validation
- **Count** must be a positive number
- **Max count**: 500 in standard mode, 10,000 in performance mode
- Errors are surfaced inline in the UI

---

## Current Limitations
- Built-in presets cover user/transaction plus a relational demo; other shapes require custom schemas
- No uniqueness guarantees or cross-field dependencies beyond relational mappings
- Regex generation is best-effort (random sampling)
- Nested objects/arrays are not supported yet
- Automation requires an API key and enforces rate limits
- Web Worker acceleration applies to JSON output only

---

## Next Level Features
Planned upgrades to reach parity with more advanced tools:

1. **Uniqueness and cross-field rules**: enforce unique values and dependent fields.
2. **Nested structures**: arrays and object fields with matching JSON Schema exports.
3. **Richer relational presets**: multi-level parent/child datasets with composite keys.
4. **Shareable templates**: tagged templates with share links for teams.
5. **More output targets**: Parquet/Avro and data warehouse loaders.
6. **Automation scale-up**: streaming API responses for massive datasets.

---

## Privacy
- UI generation runs client-side by default
- API/CLI automation is optional and requires an API key
- No uploads, tracking, or server storage by default

---

## Technical Implementation

### Core Logic
- Random values generated via `Math.random()` or a seeded PRNG
- Schema selection maps to field factories and custom field definitions
- Formatting functions convert records to JSON, CSV, or SQL

### CSV Escaping
Values are quoted and double quotes are escaped:
```typescript
return `"${String(val ?? "").replace(/"/g, '""')}"`;
```

### SQL Escaping
Strings are quoted and single quotes are escaped:
```typescript
return `'${String(val).replace(/'/g, "''")}'`;
```

---

## File Structure
```
app/(tools)/mock-data/
- client.tsx   # UI + generation logic
- page.tsx     # Metadata + FAQPage JSON-LD
- layout.tsx   # Layout wrapper
- README.md    # Documentation (this file)
app/api/generate/route.ts  # Automation API endpoint
lib/mock-data/generator.js # Shared generator for API/CLI
scripts/mockgen.js         # CLI wrapper
```

---

## State Management
```typescript
const [options, setOptions] = useState({
  count: 10,
  format: "json",
  pretty: true,
  schema: "user",
});
const [output, setOutput] = useState("");
const [error, setError] = useState("");
const [copied, setCopied] = useState(false);
```

---

## Dependencies
- **No data libraries** (all random helpers are inline)
- **lucide-react** for UI icons

---

## SEO and Metadata
Current SEO setup in `page.tsx`:
- Title, description, keywords, and canonical URL
- Open Graph and Twitter metadata
- Breadcrumb, SoftwareApplication, HowTo, FAQPage, and WebPage JSON-LD schemas

---

## Accessibility
- `aria-live` status updates
- Labeled output region
- Keyboard-accessible buttons
- Focus-visible states on inputs and actions

---

## Testing

### Manual Checklist
- [ ] Generate JSON with pretty-print
- [ ] Generate compact JSON
- [ ] Generate CSV and verify headers
- [ ] Generate SQL and verify INSERT format
- [ ] Count validation (0, negative, >500)
- [ ] Copy output works and shows feedback
- [ ] Download output uses correct extension
- [ ] Reset restores defaults

---

## Troubleshooting

**Q: Output is empty**
A: Ensure count is greater than 0 and schema is selected, then click Generate.

**Q: SQL fails on my DB**
A: Table name is `user` or `transaction`. Rename the table or replace in output.

**Q: CSV values look quoted**
A: Values are quoted to preserve commas and special characters. This is expected.

**Q: I need deterministic data**
A: Provide a seed in the UI, API payload, or CLI flags to reproduce output.

---

## Roadmap
- Add uniqueness guarantees and cross-field rules
- Add nested objects and arrays
- Add shareable template links and team sync
- Add streaming API output for very large datasets

- Add custom field builder for user-defined schemas
- Add more presets (addresses, products, SKUs)
- Add export of TypeScript interfaces
- Add Playwright smoke tests
