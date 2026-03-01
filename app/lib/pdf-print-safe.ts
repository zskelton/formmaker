import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function toImageBackedPdfBytes(inputBytes: Uint8Array, scale = 2.1) {
  const loadingTask = getDocument({
    data: inputBytes,
    useSystemFonts: true,
    disableFontFace: true,
    useWorkerFetch: false
  });

  const sourcePdf = await loadingTask.promise;
  const outputPdf = await PDFDocument.create();

  for (let pageIndex = 1; pageIndex <= sourcePdf.numPages; pageIndex += 1) {
    const sourcePage = await sourcePdf.getPage(pageIndex);
    const viewport = sourcePage.getViewport({ scale });

    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    await sourcePage
      .render({
        canvasContext: context as never,
        viewport
      })
      .promise;

    const pngBytes = canvas.toBuffer("image/png");
    const embeddedPng = await outputPdf.embedPng(pngBytes);

    const targetPage = outputPdf.addPage([viewport.width, viewport.height]);
    targetPage.drawImage(embeddedPng, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height
    });

    sourcePage.cleanup();
  }

  await loadingTask.destroy();

  return outputPdf.save({ useObjectStreams: false });
}
