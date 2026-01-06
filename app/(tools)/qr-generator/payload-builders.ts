type WifiInput = {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
  hidden: boolean;
};

type VCardInput = {
  name: string;
  org: string;
  phone: string;
  email: string;
};

type EmailInput = {
  to: string;
  subject: string;
  body: string;
};

type SmsInput = {
  to: string;
  body: string;
};

type GeoInput = {
  lat: string;
  lng: string;
};

type EventInput = {
  title: string;
  location: string;
  description: string;
  start: string;
  end: string;
};

type UtmInput = {
  url: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  deepLink: string;
};

export type BuilderInputs = {
  wifi: WifiInput;
  vcard: VCardInput;
  email: EmailInput;
  sms: SmsInput;
  geo: GeoInput;
  event: EventInput;
  utm: UtmInput;
};

export type BuilderType = keyof BuilderInputs;

export type BuilderOutput = {
  payload: string;
  error: string;
};

const escapeWifiValue = (value: string) => value.replace(/[\\;,:]/g, "\\$&");

const escapeVCardValue = (value: string) =>
  value.replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export const formatDateUtc = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};

const buildUtmUrl = (baseUrl: string, params: Record<string, string>) => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, val]) => {
    if (val) url.searchParams.set(key, val);
  });
  return url.toString();
};

export const buildBuilderPayload = (type: BuilderType, inputs: BuilderInputs): BuilderOutput => {
  if (type === "wifi") {
    const ssid = inputs.wifi.ssid.trim();
    const password = inputs.wifi.password.trim();
    if (!ssid) return { payload: "", error: "SSID is required." };
    if (inputs.wifi.security !== "nopass" && !password) {
      return { payload: "", error: "Password is required for secured Wi-Fi." };
    }
    const parts = [`T:${inputs.wifi.security === "nopass" ? "nopass" : inputs.wifi.security}`, `S:${escapeWifiValue(ssid)}`];
    if (inputs.wifi.security !== "nopass") {
      parts.push(`P:${escapeWifiValue(password)}`);
    }
    if (inputs.wifi.hidden) {
      parts.push("H:true");
    }
    return { payload: `WIFI:${parts.join(";")};;`, error: "" };
  }

  if (type === "vcard") {
    const name = inputs.vcard.name.trim();
    const org = inputs.vcard.org.trim();
    const phone = inputs.vcard.phone.trim();
    const email = inputs.vcard.email.trim();
    if (!name && !org && !phone && !email) {
      return { payload: "", error: "Add at least a name, org, phone, or email." };
    }
    const lines = ["BEGIN:VCARD", "VERSION:3.0"];
    if (name) lines.push(`FN:${escapeVCardValue(name)}`);
    if (org) lines.push(`ORG:${escapeVCardValue(org)}`);
    if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(phone)}`);
    if (email) lines.push(`EMAIL:${escapeVCardValue(email)}`);
    lines.push("END:VCARD");
    return { payload: lines.join("\n"), error: "" };
  }

  if (type === "email") {
    const to = inputs.email.to.trim();
    if (!to) return { payload: "", error: "Email address is required." };
    const params = new URLSearchParams();
    if (inputs.email.subject.trim()) params.set("subject", inputs.email.subject.trim());
    if (inputs.email.body.trim()) params.set("body", inputs.email.body.trim());
    const query = params.toString();
    return { payload: query ? `mailto:${to}?${query}` : `mailto:${to}`, error: "" };
  }

  if (type === "sms") {
    const to = inputs.sms.to.trim();
    if (!to) return { payload: "", error: "Phone number is required." };
    const body = inputs.sms.body.trim();
    return { payload: body ? `sms:${to}?body=${encodeURIComponent(body)}` : `sms:${to}`, error: "" };
  }

  if (type === "geo") {
    const lat = Number.parseFloat(inputs.geo.lat);
    const lng = Number.parseFloat(inputs.geo.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return { payload: "", error: "Latitude and longitude are required." };
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { payload: "", error: "Latitude or longitude is out of range." };
    }
    return { payload: `geo:${lat},${lng}`, error: "" };
  }

  if (type === "event") {
    const summary = inputs.event.title.trim();
    const start = formatDateUtc(inputs.event.start);
    const end = formatDateUtc(inputs.event.end);
    if (!summary) return { payload: "", error: "Event title is required." };
    if (!start) return { payload: "", error: "Start date/time is required." };
    if (end && start && end < start) return { payload: "", error: "End time must be after start time." };
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ToolStack//QR Generator//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${escapeVCardValue(summary)}`,
      `DTSTART:${start}`,
    ];
    if (end) lines.push(`DTEND:${end}`);
    if (inputs.event.location.trim()) {
      lines.push(`LOCATION:${escapeVCardValue(inputs.event.location.trim())}`);
    }
    if (inputs.event.description.trim()) {
      lines.push(`DESCRIPTION:${escapeVCardValue(inputs.event.description.trim())}`);
    }
    lines.push("END:VEVENT", "END:VCALENDAR");
    return { payload: lines.join("\n"), error: "" };
  }

  if (type === "utm") {
    const deepLink = inputs.utm.deepLink.trim();
    if (deepLink) return { payload: deepLink, error: "" };
    if (!inputs.utm.url.trim()) {
      return { payload: "", error: "Destination URL is required." };
    }
    try {
      const payload = buildUtmUrl(inputs.utm.url.trim(), {
        utm_source: inputs.utm.source.trim(),
        utm_medium: inputs.utm.medium.trim(),
        utm_campaign: inputs.utm.campaign.trim(),
        utm_term: inputs.utm.term.trim(),
        utm_content: inputs.utm.content.trim(),
      });
      return { payload, error: "" };
    } catch {
      return { payload: "", error: "Enter a valid URL (include https://)." };
    }
  }

  return { payload: "", error: "Unsupported builder type." };
};
