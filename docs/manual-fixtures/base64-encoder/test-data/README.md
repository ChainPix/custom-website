Base64 encoder drop-test fixtures.

Folders:
- `drop-into-text-textarea`: files to drop into the plain text textarea
- `drop-into-base64-textarea`: files to drop into the Base64 textarea

Primary payload:
- `Test Base64 Encoder & Decoder 823764247234@#$@#$@#$@#$`

Expected behavior:
- Dropping any fixture into `drop-into-text-textarea` should populate the Text textarea and auto-generate Base64.
- Dropping any fixture into `drop-into-base64-textarea` should extract the file text, populate the Text textarea, and auto-generate Base64 in the Base64 textarea.
