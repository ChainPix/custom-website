import QRCode from "qrcode";
import * as SvgRenderer from "qrcode/lib/renderer/svg-tag";
import type { QRCodeRenderersOptions } from "qrcode";

type WorkerRequest = {
  requestId: number;
  purpose: "preview" | "export";
  format: "svg";
  payload: string;
  options: QRCodeRenderersOptions;
};

type WorkerResponse = {
  requestId: number;
  purpose: "preview" | "export";
  format: "svg";
  data?: string;
  error?: string;
};

const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { requestId, payload, options, format, purpose } = event.data;
  try {
    const qrData = QRCode.create(payload, options);
    const data = SvgRenderer.render(qrData, options);
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
