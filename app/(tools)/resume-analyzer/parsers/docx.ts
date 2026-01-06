export async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value ?? "";
  } catch (err) {
    console.error("DOCX parse failed", err);
    throw new Error("DOCX parsing failed. Try PDF/TXT or paste text.");
  }
}
