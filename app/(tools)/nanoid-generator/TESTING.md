# NanoID Generator – Manual Test Checklist

## Scenarios
1) **Defaults**
   - Length 10, Count 5, default alphabet.
   - Generate → 5 IDs appear; Copy and Save .txt work.

2) **Out-of-range inputs**
   - Set Length to 100 and Count to 0.
   - Generate → shows clamp warnings; IDs respect 4–32 and 1–50 ranges.

3) **Alphabet too short/blank**
   - Clear alphabet or set to a single char.
   - Warning appears; generation falls back to default alphabet; status notes default used.

4) **Presets**
   - Click URL-safe, Hex, Lowercase, Letters+Digits; confirm alphabet updates.
   - Click Len 10/16/21; confirm length updates.

5) **Unique IDs toggle**
   - Enable “Unique IDs only”; generate; see status mention uniqueness attempt.

6) **Accessibility & status**
   - Status announced via aria-live for generate/copy/download/reset.
   - Output region labeled and readable by screen readers.

7) **Download**
   - Save .txt produces a file containing the generated IDs.
