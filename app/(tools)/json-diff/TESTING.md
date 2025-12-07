# JSON Diff – Manual Test Checklist

## Scenarios
1) **Valid diff**
   - Use defaults or sample; diff shows added/removed/changed paths with counts.
2) **Invalid JSON / arrays**
   - Introduce invalid JSON → inline error shown, status updates.
   - Provide an array in either input → clear message that arrays aren’t supported.
3) **Samples & swap**
   - Click Small/Nested samples; inputs populate and status shows “Loaded sample”.
   - Click Swap; inputs swap and status shows “Swapped inputs”.
4) **Pretty/minify & ignore toggles**
   - Toggle Pretty print; format left/right buttons work; invalid JSON keeps status error.
   - Ignore case/nulls/array order affect diff as expected.
5) **Filter & show unchanged**
   - Enter path filter; only matching paths remain. Toggle “Show unchanged” on/off.
6) **Copy/Download**
   - Copy diff, Copy left/right, Save left/right, Save diff → files/text produced and status updates.
7) **Accessibility**
   - aria-live announces status; diff output labeled; controls focus/aria labels present.
