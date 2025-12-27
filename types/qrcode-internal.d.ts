declare module "qrcode/lib/renderer/svg-tag" {
  import type { QRCode, QRCodeRenderersOptions } from "qrcode";

  export function render(qrData: QRCode, options?: QRCodeRenderersOptions): string;
}
