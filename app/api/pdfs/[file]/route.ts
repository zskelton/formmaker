import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { toImageBackedPdfBytes } from "../../../lib/pdf-print-safe";

type RouteContext = {
  params: Promise<{ file: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { file } = await context.params;
  const decodedFile = decodeURIComponent(file);

  if (decodedFile === "download-all" || decodedFile === "download-all.pdf") {
    const dataDir = path.resolve(process.cwd(), "app", "data");

    try {
      const entries = await readdir(dataDir, { withFileTypes: true });
      const pdfFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

      if (pdfFiles.length === 0) {
        return new Response("No PDF files found", { status: 404 });
      }

      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of pdfFiles) {
        const filePath = path.join(dataDir, pdfFile);
        const content = await readFile(filePath);
        const sourcePdf = await PDFDocument.load(content);

        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
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
      return new Response("Unable to build merged PDF", { status: 500 });
    }
  }

  if (!decodedFile.toLowerCase().endsWith(".pdf") || path.basename(decodedFile) !== decodedFile) {
    return new Response("Invalid file name", { status: 400 });
  }

  const dataDir = path.resolve(process.cwd(), "app", "data");
  const filePath = path.resolve(dataDir, decodedFile);
  const relativePath = path.relative(dataDir, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return new Response("Invalid file path", { status: 400 });
  }

  try {
    const content = await readFile(filePath);

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${decodedFile}"`
      }
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}