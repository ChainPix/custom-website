# IP / ASN Lookup – Manual Test Checklist

## Core validation
- Empty input shows “Enter an IP address” and blocks lookup.
- Overlength input (>200 chars) shows “input too long” warning.
- Invalid IP (malformed) shows clear error.
- Valid public IPv4 sample parses and shows version/private/CIDR.
- Valid public IPv6 sample parses and shows normalized CIDR.
- Private sample (e.g., 192.168.x.x) is flagged as Private = Yes.

## ASN enrichment
- With token unset: message indicates ASN lookup skipped; local parse still shown.
- With token set: public IP returns ASN/org/country when available.
- Error handling: simulate 401/429 (token invalid/rate limit) shows specific messages.

## Copy/download
- Copy JSON button copies the current result.
- Per-field copy buttons work for IP/version/private/CIDR/ASN/country when present.
- Download JSON/CSV buttons produce files with current result fields.

## Samples & state
- Sample buttons (ipv4/ipv6/private) populate input and clear previous state.
- Reset restores default IP and clears status/copied states.

## Accessibility
- `aria-live` announces status/errors and copy actions.
- Result region is labeled; controls have aria-labels and focus-visible outlines.
- Keyboard-only navigation reaches all controls.
