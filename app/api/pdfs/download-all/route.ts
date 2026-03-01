import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { toImageBackedPdfBytes } from "../../../lib/pdf-print-safe";

export async function GET() {
  const dataDir = path.resolve(process.cwd(), "app", "data");

  try {
    const entries = await readdir(dataDir, { withFileTypes: true });
    const pdfFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    if (pdfFiles.length === 0) {
      return Response.json({ error: "No PDF files found" }, { status: 404 });
    }

    const mergedPdf = await PDFDocument.create();

    for (const fileName of pdfFiles) {
      const filePath = path.join(dataDir, fileName);
      const content = await readFile(filePath);
      const sourcePdf = await PDFDocument.load(content);

      try {
        const sourceForm = sourcePdf.getForm();
        sourceForm.updateFieldAppearances();
        sourceForm.flatten();
      } catch {
      }

      const normalizedBytes = await sourcePdf.save({ useObjectStreams: false });
      const normalizedPdf = await PDFDocument.load(normalizedBytes);

      const copiedPages = await mergedPdf.copyPages(normalizedPdf, normalizedPdf.getPageIndices());
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    }

    const flattenedBytes = await mergedPdf.save({ useObjectStreams: false });
    const mergedPdfBytes = await toImageBackedPdfBytes(flattenedBytes);

    return new Response(Buffer.from(mergedPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=ROI-Forms-Merged.pdf"
      }
    });
  } catch {
    return Response.json({ error: "Unable to build merged PDF" }, { status: 500 });
  }
}
