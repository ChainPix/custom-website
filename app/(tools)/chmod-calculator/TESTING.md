# Permission / chmod Calculator — Manual Test Checklist

- **Toggle perms**: Flip read/write/execute for user/group/other; octal/symbolic update correctly.
- **Special bits**: setuid/setgid/sticky toggle shows s/S/t/T correctly and updates octal prefix.
- **Octal input**: Enter 755, 4755, 0700 → checkboxes reflect correct bits; invalid octal shows inline error.
- **Copy**: Copy button places `chmod <octal>` on clipboard.
- **Reset**: Reset returns to defaults (755).
- **Accessibility**: `aria-live` status; controls focusable with visible outlines; regions labeled.
