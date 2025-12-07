# Lorem Ipsum – Manual Test Checklist

## Scenarios
1) **Defaults**
   - Load page; output is non-empty (paragraph format).
   - Copy and Download .txt work; status announces.

2) **Out-of-range counts**
   - Set paragraphs to 50, sentences to 200.
   - Generate → warnings appear; output clamps (max 20 paras / 50 sentences) and truncation warning shows if needed.

3) **Presets**
   - Short/Medium/Long/Sentences/Bulleted list presets update counts/format correctly.

4) **Formats**
   - Paragraphs, Sentences, Bulleted list, Headlines render as expected (bullets prefixed, headlines title-cased).

5) **Seed**
   - Set a seed, generate; change counts and reapply same seed → output is reproducible for same settings.

6) **Accessibility & status**
   - aria-live announces copy/download/reset.
   - Output region is labeled and readable by screen readers.

7) **Stats**
   - Word/character counts update with different outputs; truncation warning shows when text is very long.
