import QRCode from "qrcode";

type WorkerRequest = {
  requestId: number;
  payload: string;
  options: QRCode.QRCodeToDataURLOptions;
};

type WorkerResponse = {
  requestId: number;
  dataUrl?: string;
  error?: string;
};

const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { requestId, payload, options } = event.data;
  try {
    const dataUrl = await QRCode.toDataURL(payload, options);
    const response: WorkerResponse = { requestId, dataUrl };
    ctx.postMessage(response);
  } catch (error) {
    console.error("QR worker generation error", error);
    const response: WorkerResponse = {
      requestId,
      error: "Unable to generate QR code for this input.",
    };
    ctx.postMessage(response);
  }
};
