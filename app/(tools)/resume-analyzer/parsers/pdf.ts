type ProgressCallback = (current: number, total: number) => void;

export type PdfExtractResult = {
  text: string;
  pageTexts: string[];
};

export async function extractPdfText(buffer: ArrayBuffer, onProgress?: ProgressCallback): Promise<PdfExtractResult> {
  const pdfjsLib = await import("pdfjs-dist");
  const pdf = await pdfjsLib.getDocument({ data: buffer, disableWorker: true }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" ");
      pages.push(strings);
      onProgress?.(i, pdf.numPages);
    } catch (err) {
      throw new Error(`PDF text extraction failed on page ${i}.`);
    }
  }

  return { text: pages.join("\n\n"), pageTexts: pages };
}
