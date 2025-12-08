# Mock Data Generator — Manual Test Checklist

- **JSON generation**: Schema=user, count=5, format=JSON → generates array; pretty toggle affects spacing.
- **CSV/SQL**: Switch to CSV and SQL; verify headers/insert statements and correct row counts.
- **Count guard**: 0 or >500 shows inline error; 1–500 works.
- **Schema switch**: Swap between user and transaction; fields change accordingly.
- **Copy/download**: Copy output to clipboard; download uses correct extension (.json/.csv/.sql) and matches output.
- **Reset**: Reset clears output and restores defaults.
- **Accessibility**: `aria-live` status; output region labeled; controls focusable with visible focus states.
