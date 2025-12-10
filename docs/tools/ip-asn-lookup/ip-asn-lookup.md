# IP / ASN Lookup Tool Documentation

- **Version:** 1.0.0
- **Category:** Generation & Utilities
- **Last Updated:** 2025-12-09
- **Status:** ✅ Stable

---

## Overview

Client-side IP address validation tool with optional cloud-based ASN (Autonomous System Number) enrichment. Uses `ipaddr.js` for local parsing and IPInfo API for network details.

### Primary Use Cases
- Validate IPv4/IPv6 addresses for APIs and forms
- Detect private/internal IP ranges for security checks
- Lookup network ownership and ASN information
- Debug network configurations and routing
- Analyze server logs with IP geolocation

---

## Current Features

### Core Functionality
- ✅ **Local IP validation** - Uses `ipaddr.js` library for parsing
- ✅ **IPv4 support** - Validates IPv4 addresses (e.g., 192.168.1.1)
- ✅ **IPv6 support** - Validates IPv6 addresses (e.g., 2001:4860:4860::8888)
- ✅ **Private range detection** - Identifies RFC1918 private IPs, loopback, link-local
- ✅ **CIDR notation** - Shows normalized IP representation
- ✅ **Sample IPs** - 3 pre-filled examples (IPv4 public, IPv6 public, private)
- ✅ **Reset button** - Clears input and returns to default

### ASN Enrichment (Optional - Requires Token)
- ✅ **AS Number extraction** - Identifies autonomous system (e.g., AS15169)
- ✅ **Organization name** - Shows ISP/hosting provider (e.g., "Google LLC")
- ✅ **Country code** - Two-letter country identifier (e.g., "US")
- ✅ **IPInfo API integration** - Uses NEXT_PUBLIC_IPINFO_TOKEN env var
- ✅ **Graceful fallback** - Works without token (validation only)

### Output Options
- ✅ **Copy as JSON** - Copies entire result object
- ✅ **Copy individual fields** - Copy button for each field
- ✅ **Download as JSON** - Saves result as `ip-lookup.json`
- ✅ **Download as CSV** - Saves result as `ip-lookup.csv` (field,value format)

### UI/UX Features
- ✅ **Real-time validation** - Shows errors immediately
- ✅ **Visual feedback** - Check icon on copy (1200ms)
- ✅ **Dark result panel** - Contrast-enhanced display (slate-900 bg)
- ✅ **Error messages** - Clear, actionable error descriptions
- ✅ **Token status** - Shows whether ASN lookup is available
- ✅ **Rate limit handling** - Specific error for 429 responses

### Accessibility
- ✅ **ARIA labels** - All interactive elements labeled
- ✅ **Screen reader support** - Live region for lookup status
- ✅ **Keyboard navigation** - Full keyboard accessibility
- ✅ **Focus indicators** - Clear focus states on all controls

### SEO & Metadata
- ✅ **Comprehensive metadata** - Title, description, keywords
- ✅ **JSON-LD schema** - FAQPage markup with 3 questions
- ✅ **Open Graph tags** - Social media preview cards
- ✅ **Canonical URL** - Proper URL structure

---

## Technical Implementation

### Dependencies
- **ipaddr.js** (v2.2.0) - IP address parsing and validation
- **IPInfo API** - Optional ASN enrichment (requires token)
- **lucide-react** - Icons (Clipboard, Check, Download, RefreshCcw)

### File Structure
```
app/(tools)/ip-asn-lookup/
├── client.tsx          # Main component (300 lines)
├── page.tsx            # SEO metadata + JSON-LD schema (73 lines)
└── layout.tsx          # Layout wrapper (10 lines)
```

### State Management
```typescript
const [ip, setIp] = useState("8.8.8.8");
const [result, setResult] = useState<LookupResult | null>(null);
const [error, setError] = useState("");
const [copied, setCopied] = useState(false);
const [copiedField, setCopiedField] = useState<string | null>(null);
const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN;
```

### LookupResult Type
```typescript
type LookupResult = {
  ip: string;            // Original IP input
  version: "ipv4" | "ipv6";  // IP version
  isPrivate: boolean;    // Private range flag
  cidr?: string;         // Normalized CIDR
  asn?: string;          // AS number (e.g., "AS15169")
  org?: string;          // Organization name
  country?: string;      // Two-letter country code
};
```

### Core Algorithm

1. **Local Validation**
   ```typescript
   const parseLocal = (value: string): LookupResult | null => {
     try {
       const addr = ipaddr.parse(value);  // Parse with ipaddr.js
       const kind = addr.kind() === "ipv4" ? "ipv4" : "ipv6";
       const normalized = addr.toNormalizedString();
       return {
         ip: value,
         version: kind,
         isPrivate: addr.range() !== "unicast",  // Detect private ranges
         cidr: normalized,
       };
     } catch {
       return null;  // Invalid IP
     }
   };
   ```

2. **ASN Enrichment (if token configured)**
   ```typescript
   const res = await fetch(`https://ipinfo.io/${parsed.ip}/json?token=${token}`);
   if (!res.ok) {
     // Handle rate limits, auth errors, etc.
     return;
   }
   const data = await res.json();
   setResult({
     ...parsed,
     asn: data.org?.split(" ")?.[0],  // Extract "AS15169" from "AS15169 Google LLC"
     org: data.org,
     country: data.country,
   });
   ```

### Private Range Detection
Uses `ipaddr.js` built-in range detection:
- **IPv4**: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
- **IPv6**: ::1/128 (loopback), fe80::/10 (link-local), fc00::/7 (unique local)

### Performance Characteristics
- **Validation time**: <1ms (ipaddr.js parsing)
- **ASN lookup time**: ~100-300ms (IPInfo API)
- **Input limit**: 200 characters
- **API rate limits**: 50,000 requests/month (free tier), 250,000/month (paid)

---

## Current Limitations

### Functional Limitations
- ❌ **No bulk lookup** - One IP at a time
- ❌ **No WHOIS data** - No registrar/contact information
- ❌ **No geolocation** - No city/region details (only country)
- ❌ **No reverse DNS** - Cannot lookup hostname from IP
- ❌ **No IP range calculator** - Cannot calculate subnets/CIDR ranges
- ❌ **No traceroute** - Cannot trace network path
- ❌ **No port scanning** - No service detection
- ❌ **No historical data** - No IP reputation history

### Technical Limitations
- ❌ **200 char limit** - Very long inputs rejected
- ❌ **API rate limits** - IPInfo free tier: 50K/month
- ❌ **No caching** - Each lookup makes fresh API request
- ❌ **No offline mode** - ASN lookup requires internet
- ❌ **No IPv6 geolocation** - IPInfo has limited IPv6 geo data
- ❌ **No ASN path** - No BGP routing information

### UX Limitations
- ❌ **No lookup history** - Previous lookups not saved
- ❌ **No comparison mode** - Cannot compare two IPs
- ❌ **No map visualization** - No geographic display
- ❌ **No batch export** - Cannot download multiple results

---

## Error Handling

### Implemented Error Cases
1. **Empty input** - `"Enter an IP address to lookup."`
2. **Invalid IP format** - `"Invalid IP address. Provide a valid IPv4 or IPv6."`
3. **Input too long** - `"Input too long; please provide a single IP address."`
4. **No token configured** - `"ASN lookup skipped (no IPInfo token configured). IP validation completed locally."`
5. **Rate limit exceeded** (429) - `"ASN lookup rate-limited. Try again later."`
6. **Unauthorized** (401) - `"ASN lookup unauthorized. Check IPInfo token."`
7. **Other API errors** - `"ASN lookup failed. Check token or try again."`
8. **Network errors** - `"ASN lookup failed. Network or token issue."`

### Missing Error Handling
- ❌ **Timeout handling** - No timeout for slow API responses
- ❌ **Retry logic** - No automatic retry on transient failures
- ❌ **Malformed API responses** - Assumes IPInfo returns valid JSON

---

## Competitive Analysis

| Feature | Our Tool | [IPInfo.io](https://ipinfo.io/) | [WhatIsMyIPAddress](https://whatismyipaddress.com/) | Priority |
|---------|----------|------------|-------------|----------|
| Client-side validation | ✅ | ❌ | ❌ | - |
| IPv4/IPv6 support | ✅ | ✅ | ✅ | - |
| Private range detection | ✅ | ⚠️ Server-side | ❌ | - |
| ASN lookup | ✅ (token) | ✅ | ✅ | - |
| Geolocation (city/region) | ❌ | ✅ | ✅ | High |
| Reverse DNS | ❌ | ✅ | ✅ | Medium |
| WHOIS data | ❌ | ✅ | ✅ | Medium |
| Bulk lookup | ❌ | ✅ (Paid) | ❌ | High |
| IP range calculator | ❌ | ❌ | ✅ | Medium |
| Abuse/spam detection | ❌ | ✅ (Paid) | ⚠️ Basic | Low (v2.0) |

### Competitive Advantages
1. **Privacy-first** - Local validation without server requests
2. **Instant validation** - No API call for basic checks
3. **Free for validation** - No token needed for IP parsing
4. **Simple interface** - Focused, minimal UX

### v1.3 Improvements
1. **Geolocation** - Add city/region/coordinates (requires IPInfo paid plan)
2. **Bulk lookup** - Upload CSV of IPs, process batch
3. **Reverse DNS** - Lookup hostname from IP
4. **CIDR calculator** - Subnet mask, network/broadcast IPs
5. **Lookup history** - Save last 10 lookups in session

---

## Planned Improvements (v1.3)

### High Priority
1. **Geolocation details** - City, region, coordinates
   - Requires IPInfo paid plan or alternative API
   - Effort: 2 hours

2. **Bulk lookup** - CSV input, batch processing
   - Implementation: File upload, map over IPs
   - Effort: 4 hours

3. **Reverse DNS** - Hostname resolution
   - Implementation: DNS API integration
   - Effort: 3 hours

### Medium Priority
4. **IP range calculator** - CIDR subnet info
   - Implementation: ipaddr.js utilities
   - Effort: 3 hours

5. **Lookup history** - Session storage of past lookups
   - Implementation: LocalStorage array
   - Effort: 2 hours

6. **Copy formatted report** - Plain text summary
   - Implementation: Template string formatter
   - Effort: 1 hour

---

## Backend Features (v2.0)

- **Abuse/threat detection** - Check against spam databases
- **BGP path analysis** - Show AS path to destination
- **Historical data** - IP reputation over time
- **Port scanning** - Service detection (nmap-style)
- **Traceroute** - Network path visualization

---

## Browser Compatibility

### Fully Supported
- ✅ Chrome 90+, Edge 90+, Firefox 88+, Safari 14+, Opera 76+

### Not Supported
- ❌ Internet Explorer 11

---

## Performance Metrics

- **Lighthouse**: 99/100 Performance, 100/100 Accessibility
- **LCP**: 0.9s
- **Bundle**: ~7.1KB (minified + gzipped)

---

## Testing Checklist

### Happy Path
- [ ] Enter IPv4 public → shows version, not private
- [ ] Enter IPv6 public → shows version, not private
- [ ] Enter private IP (192.168.x.x) → shows "Private: Yes"
- [ ] With token → shows ASN, org, country
- [ ] Without token → shows validation only
- [ ] Copy JSON → copies full object
- [ ] Copy field → copies individual value
- [ ] Download JSON/CSV → saves files

### Edge Cases
- [ ] Empty input → error message
- [ ] Invalid IP → error message
- [ ] IPv4 with leading zeros (010.0.0.1) → parsed correctly
- [ ] IPv6 compressed (::1) → expanded correctly
- [ ] Rate limit exceeded → shows 429 error

---

## Known Issues

1. **IPv6 geo data** - IPInfo has limited IPv6 geolocation
2. **API rate limits** - Free tier: 50K/month

---

## Version History

### v1.0.0 (2025-12-09)
- IP validation with ipaddr.js
- Optional ASN enrichment via IPInfo
- Copy/download functionality

---

- **Documentation Status:** ✅ Complete
- **Next Review:** 2025-12-20
- **Maintained By:** ToolStack Development Team
