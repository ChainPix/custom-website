import { test, expect } from "vitest";
import { buildBuilderPayload, formatDateUtc } from "../../app/(tools)/qr-generator/payload-builders";

test("wifi builder requires ssid and password for secured networks", () => {
  const base = {
    wifi: { ssid: "", password: "", security: "WPA" as const, hidden: false },
    vcard: { name: "", org: "", phone: "", email: "" },
    email: { to: "", subject: "", body: "" },
    sms: { to: "", body: "" },
    geo: { lat: "", lng: "" },
    event: { title: "", location: "", description: "", start: "", end: "" },
    utm: { url: "", source: "", medium: "", campaign: "", term: "", content: "", deepLink: "" },
  };
  expect(buildBuilderPayload("wifi", base).error).toContain("SSID");
  const withSsid = {
    ...base,
    wifi: { ssid: "Cafe", password: "", security: "WPA" as const, hidden: false },
  };
  expect(buildBuilderPayload("wifi", withSsid).error).toContain("Password");
  const withPassword = {
    ...base,
    wifi: { ssid: "Cafe", password: "secret", security: "WPA" as const, hidden: true },
  };
  expect(buildBuilderPayload("wifi", withPassword).payload).toContain("WIFI:");
});

test("vcard builder outputs vcard payload", () => {
  const output = buildBuilderPayload("vcard", {
    wifi: { ssid: "", password: "", security: "WPA", hidden: false },
    vcard: { name: "Ada Lovelace", org: "Analytical", phone: "123", email: "ada@example.com" },
    email: { to: "", subject: "", body: "" },
    sms: { to: "", body: "" },
    geo: { lat: "", lng: "" },
    event: { title: "", location: "", description: "", start: "", end: "" },
    utm: { url: "", source: "", medium: "", campaign: "", term: "", content: "", deepLink: "" },
  });
  expect(output.payload).toContain("BEGIN:VCARD");
  expect(output.payload).toContain("FN:Ada Lovelace");
});

test("geo builder validates range", () => {
  const output = buildBuilderPayload("geo", {
    wifi: { ssid: "", password: "", security: "WPA", hidden: false },
    vcard: { name: "", org: "", phone: "", email: "" },
    email: { to: "", subject: "", body: "" },
    sms: { to: "", body: "" },
    geo: { lat: "181", lng: "50" },
    event: { title: "", location: "", description: "", start: "", end: "" },
    utm: { url: "", source: "", medium: "", campaign: "", term: "", content: "", deepLink: "" },
  });
  expect(output.error).toContain("out of range");
});

test("event builder formats UTC timestamp", () => {
  const start = "2025-01-10T09:30";
  const formatted = formatDateUtc(start);
  expect(formatted).toMatch(/Z$/);
});

test("utm builder appends query params", () => {
  const output = buildBuilderPayload("utm", {
    wifi: { ssid: "", password: "", security: "WPA", hidden: false },
    vcard: { name: "", org: "", phone: "", email: "" },
    email: { to: "", subject: "", body: "" },
    sms: { to: "", body: "" },
    geo: { lat: "", lng: "" },
    event: { title: "", location: "", description: "", start: "", end: "" },
    utm: {
      url: "https://example.com",
      source: "newsletter",
      medium: "qr",
      campaign: "spring",
      term: "",
      content: "",
      deepLink: "",
    },
  });
  expect(output.payload).toContain("utm_source=newsletter");
  expect(output.payload).toContain("utm_medium=qr");
  expect(output.payload).toContain("utm_campaign=spring");
});
