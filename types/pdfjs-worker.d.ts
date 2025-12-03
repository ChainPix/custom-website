declare module "pdfjs-dist/build/pdf.worker.min.mjs" {
  const workerSrc: string;
  export default workerSrc;
}

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const workerUrl: string;
  export default workerUrl;
}
