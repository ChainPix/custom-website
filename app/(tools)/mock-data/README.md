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
- Generated values are random and non-deterministic.

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
- **Max count**: 500 (performance guard)
- Errors are surfaced inline in the UI

---

## Current Limitations
- Only two built-in schemas (User and Transaction)
- No custom field builder or schema editor
- Non-deterministic output (no seed support)
- No locale control for names, cities, or formats
- Flat records only (no nested objects or arrays)
- No relational linking beyond simple `userId`
- No uniqueness guarantees or constraint rules
- No field-level control (min/max ranges, regex, enums beyond defaults)
- No export of types (TypeScript, JSON Schema) or Postgres-specific SQL

---

## Next Level Features
Planned upgrades to reach parity with more advanced tools:

1. **Custom schema builder**: Define fields, types, and constraints in the UI.
2. **Seedable RNG**: Deterministic output for reproducible test fixtures.
3. **Expanded presets**: Addresses, products, SKUs, invoices, log events.
4. **Locale packs**: Region-aware names, cities, currencies, and dates.
5. **Field constraints**: Min/max, regex patterns, weighted enums, nullability.
6. **Relational data**: Generate parent/child sets with linked IDs.
7. **Output extensions**: TypeScript interfaces, JSON Schema, SQL dialects.
8. **Saved templates**: Persist favorite schemas in local storage.
9. **Bulk generation**: Chunked output for larger datasets without UI lag.
10. **Automation hooks**: Download presets and optional API endpoints.

---

## Privacy
- 100% client-side generation
- No uploads, tracking, or server storage
- All data remains in the browser session

---

## Technical Implementation

### Core Logic
- Random values generated via `Math.random()`
- Schema selection maps to field factories
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
- Title, description, and keywords
- Open Graph and Twitter metadata
- FAQPage JSON-LD with 3 questions
- Canonical URL

Planned improvement: add Breadcrumb, HowTo, and SoftwareApplication schemas to match other tools.

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
A: Not supported yet. A seedable RNG is planned for a future update.

---

## Roadmap
- Add seed support for reproducible output
- Add custom field builder for user-defined schemas
- Add more presets (addresses, products, SKUs)
- Add export of TypeScript interfaces
- Add Playwright smoke tests
