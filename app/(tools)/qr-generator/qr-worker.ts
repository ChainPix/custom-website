import QRCode from "qrcode";

type WorkerRequest = {
  requestId: number;
  purpose: "preview" | "export";
  format: "png" | "svg";
  payload: string;
  options: QRCode.QRCodeToDataURLOptions & QRCode.QRCodeToStringOptions;
};

type WorkerResponse = {
  requestId: number;
  purpose: "preview" | "export";
  format: "png" | "svg";
  data?: string;
  error?: string;
};

const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { requestId, payload, options, format, purpose } = event.data;
  try {
    const data =
      format === "svg"
        ? await QRCode.toString(payload, { ...options, type: "svg" })
        : await QRCode.toDataURL(payload, options);
    const response: WorkerResponse = { requestId, purpose, format, data };
    ctx.postMessage(response);
  } catch (error) {
    console.error("QR worker generation error", error);
    const response: WorkerResponse = {
      requestId,
      purpose,
      format,
      error: "Unable to generate QR code for this input.",
    };
    ctx.postMessage(response);
  }
};
