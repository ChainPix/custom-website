type ProgressCallback = (current: number, total: number) => void;

export type PdfExtractResult = {
  text: string;
  pageTexts: string[];
};

export async function extractPdfText(buffer: ArrayBuffer, onProgress?: ProgressCallback): Promise<PdfExtractResult> {
  const pdfjsLib = await import("pdfjs-dist");
  // disableWorker is a real runtime option that pdfjs omits from its param
  // types; keep the object typed without resorting to `any`.
  const initParams = { data: buffer, disableWorker: true } as unknown as Parameters<typeof pdfjsLib.getDocument>[0];
  const pdf = await pdfjsLib.getDocument(initParams).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" ");
      pages.push(strings);
      onProgress?.(i, pdf.numPages);
    } catch {
      throw new Error(`PDF text extraction failed on page ${i}.`);
    }
  }

  return { text: pages.join("\n\n"), pageTexts: pages };
}
