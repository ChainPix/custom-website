interface BarcodeDetector {
  detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

interface Window {
  BarcodeDetector?: BarcodeDetectorConstructor;
}

declare var BarcodeDetector: BarcodeDetectorConstructor;
