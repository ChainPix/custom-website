import { useCallback, useMemo, useState } from "react";
import { buildBuilderPayload, type BuilderInputs, type BuilderType } from "./payload-builders";
import { getScanDifficulty } from "./utils";

export type QrSettings = {
  size: number;
  correction: "L" | "M" | "Q" | "H";
  validateUrl: boolean;
  trim: boolean;
  fgColor: string;
  bgColor: string;
  quietZone: number;
  maskPattern: "auto" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7";
  moduleStyle: "square" | "rounded";
  logoDataUrl: string;
  logoSize: number;
  exportTransparent: boolean;
  generationMode: "live" | "manual";
};

export const useQrGenerator = () => {
  const [text, setText] = useState("");
  const [manualText, setManualText] = useState("");
  const [payloadMode, setPayloadMode] = useState<"text" | "builder">("text");
  const [builderType, setBuilderType] = useState<BuilderType>("wifi");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiSecurity, setWifiSecurity] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);
  const [vcardName, setVcardName] = useState("");
  const [vcardOrg, setVcardOrg] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smsTo, setSmsTo] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [geoLat, setGeoLat] = useState("");
  const [geoLng, setGeoLng] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [utmUrl, setUtmUrl] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [utmDeepLink, setUtmDeepLink] = useState("");
  const [size, setSize] = useState(224);
  const [correction, setCorrection] = useState<"L" | "M" | "Q" | "H">("M");
  const [validateUrl, setValidateUrl] = useState(false);
  const [trim, setTrim] = useState(true);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [quietZone, setQuietZone] = useState(1);
  const [maskPattern, setMaskPattern] = useState<"auto" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7">("auto");
  const [moduleStyle, setModuleStyle] = useState<"square" | "rounded">("square");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoSize, setLogoSize] = useState(18);
  const [generationMode, setGenerationMode] = useState<"live" | "manual">("live");
  const [exportTransparent, setExportTransparent] = useState(false);
  const [filenameBase, setFilenameBase] = useState("qr-code");

  const builderOutput = useMemo(() => {
    const inputs: BuilderInputs = {
      wifi: {
        ssid: wifiSsid,
        password: wifiPassword,
        security: wifiSecurity,
        hidden: wifiHidden,
      },
      vcard: {
        name: vcardName,
        org: vcardOrg,
        phone: vcardPhone,
        email: vcardEmail,
      },
      email: {
        to: emailTo,
        subject: emailSubject,
        body: emailBody,
      },
      sms: {
        to: smsTo,
        body: smsBody,
      },
      geo: {
        lat: geoLat,
        lng: geoLng,
      },
      event: {
        title: eventTitle,
        location: eventLocation,
        description: eventDescription,
        start: eventStart,
        end: eventEnd,
      },
      utm: {
        url: utmUrl,
        source: utmSource,
        medium: utmMedium,
        campaign: utmCampaign,
        term: utmTerm,
        content: utmContent,
        deepLink: utmDeepLink,
      },
    };
    return buildBuilderPayload(builderType, inputs);
  }, [
    builderType,
    wifiSsid,
    wifiPassword,
    wifiSecurity,
    wifiHidden,
    vcardName,
    vcardOrg,
    vcardPhone,
    vcardEmail,
    emailTo,
    emailSubject,
    emailBody,
    smsTo,
    smsBody,
    geoLat,
    geoLng,
    eventTitle,
    eventLocation,
    eventDescription,
    eventStart,
    eventEnd,
    utmUrl,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    utmDeepLink,
  ]);

  const payload = payloadMode === "builder" ? text : trim ? text.trim() : text;
  const hasPayload = payload.length > 0;
  const canUsePayload = hasPayload && !(payloadMode === "builder" && builderOutput.error);
  const difficulty = getScanDifficulty(payload.length, correction);

  const currentSettings = useMemo<QrSettings>(
    () => ({
      size,
      correction,
      validateUrl,
      trim,
      fgColor,
      bgColor,
      quietZone,
      maskPattern,
      moduleStyle,
      logoDataUrl,
      logoSize,
      exportTransparent,
      generationMode,
    }),
    [
      size,
      correction,
      validateUrl,
      trim,
      fgColor,
      bgColor,
      quietZone,
      maskPattern,
      moduleStyle,
      logoDataUrl,
      logoSize,
      exportTransparent,
      generationMode,
    ]
  );

  const applySettings = useCallback((settings: QrSettings) => {
    setSize(settings.size);
    setCorrection(settings.correction);
    setValidateUrl(settings.validateUrl);
    setTrim(settings.trim);
    setFgColor(settings.fgColor);
    setBgColor(settings.bgColor);
    setQuietZone(settings.quietZone);
    setMaskPattern(settings.maskPattern);
    setModuleStyle(settings.moduleStyle);
    setLogoDataUrl(settings.logoDataUrl);
    setLogoSize(settings.logoSize);
    setExportTransparent(settings.exportTransparent);
    setGenerationMode(settings.generationMode);
  }, []);

  const applyPreset = useCallback(
    (preset: "print" | "sticker" | "small") => {
      if (preset === "print") {
        applySettings({
          ...currentSettings,
          size: 320,
          correction: "H",
          quietZone: 4,
          moduleStyle: "square",
          exportTransparent: false,
        });
      }
      if (preset === "sticker") {
        applySettings({
          ...currentSettings,
          size: 256,
          correction: "Q",
          quietZone: 2,
          moduleStyle: "rounded",
          exportTransparent: true,
        });
      }
      if (preset === "small") {
        applySettings({
          ...currentSettings,
          size: 176,
          correction: "H",
          quietZone: 3,
          moduleStyle: "square",
          exportTransparent: false,
        });
      }
    },
    [applySettings, currentSettings]
  );

  return {
    text,
    setText,
    manualText,
    setManualText,
    payloadMode,
    setPayloadMode,
    builderType,
    setBuilderType,
    wifiSsid,
    setWifiSsid,
    wifiPassword,
    setWifiPassword,
    wifiSecurity,
    setWifiSecurity,
    wifiHidden,
    setWifiHidden,
    vcardName,
    setVcardName,
    vcardOrg,
    setVcardOrg,
    vcardPhone,
    setVcardPhone,
    vcardEmail,
    setVcardEmail,
    emailTo,
    setEmailTo,
    emailSubject,
    setEmailSubject,
    emailBody,
    setEmailBody,
    smsTo,
    setSmsTo,
    smsBody,
    setSmsBody,
    geoLat,
    setGeoLat,
    geoLng,
    setGeoLng,
    eventTitle,
    setEventTitle,
    eventLocation,
    setEventLocation,
    eventDescription,
    setEventDescription,
    eventStart,
    setEventStart,
    eventEnd,
    setEventEnd,
    utmUrl,
    setUtmUrl,
    utmSource,
    setUtmSource,
    utmMedium,
    setUtmMedium,
    utmCampaign,
    setUtmCampaign,
    utmTerm,
    setUtmTerm,
    utmContent,
    setUtmContent,
    utmDeepLink,
    setUtmDeepLink,
    size,
    setSize,
    correction,
    setCorrection,
    validateUrl,
    setValidateUrl,
    trim,
    setTrim,
    fgColor,
    setFgColor,
    bgColor,
    setBgColor,
    quietZone,
    setQuietZone,
    maskPattern,
    setMaskPattern,
    moduleStyle,
    setModuleStyle,
    logoDataUrl,
    setLogoDataUrl,
    logoSize,
    setLogoSize,
    generationMode,
    setGenerationMode,
    exportTransparent,
    setExportTransparent,
    filenameBase,
    setFilenameBase,
    builderPayload: builderOutput.payload,
    builderError: builderOutput.error,
    payload,
    hasPayload,
    canUsePayload,
    difficulty,
    currentSettings,
    applySettings,
    applyPreset,
  };
};
