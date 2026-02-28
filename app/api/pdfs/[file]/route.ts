import { readFile } from "node:fs/promises";
import path from "node:path";

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