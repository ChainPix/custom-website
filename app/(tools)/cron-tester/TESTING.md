# Cron Expression Tester — Manual Test Checklist

- **Samples**: Load “Every 5 mins” and validate → next runs list populates; no errors.
- **6-field toggle**: Enable seconds, prepend “0” if needed, validate; times include seconds.
- **UTC toggle**: Validate once local, once UTC; times reflect timezone choice.
- **Error cases**: Empty input → inline error; wrong field count → error; invalid field values (e.g., 70 in minutes) → error.
- **Run count**: Change to 10 and confirm list length matches.
- **Copy**: After validation, copy button places runs on clipboard.
- **Accessibility**: `aria-live` status updates; output region labeled; controls have focus outlines.
