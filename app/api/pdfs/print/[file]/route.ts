import { readFile } from "node:fs/promises";
import path from "node:path";
import { toImageBackedPdfBytes } from "../../../../lib/pdf-print-safe";

type RouteContext = {
  params: Promise<{ file: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { file } = await context.params;
  const decodedFile = decodeURIComponent(file);

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
    const imageBackedBytes = await toImageBackedPdfBytes(new Uint8Array(content));

    return new Response(Buffer.from(imageBackedBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${decodedFile.replace(/\.pdf$/i, "")}-print.pdf"`
      }
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
