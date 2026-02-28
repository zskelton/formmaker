import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField
} from "pdf-lib";

type RouteContext = {
  params: Promise<{ file: string }>;
};

type SavePayload = {
  values?: Record<string, string | boolean | string[]>;
};

function resolvePdfPath(rawFile: string) {
  const decodedFile = decodeURIComponent(rawFile);

  if (!decodedFile.toLowerCase().endsWith(".pdf") || path.basename(decodedFile) !== decodedFile) {
    return null;
  }

  const dataDir = path.resolve(process.cwd(), "app", "data");
  const filePath = path.resolve(dataDir, decodedFile);
  const relativePath = path.relative(dataDir, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return { filePath, decodedFile };
}

export async function POST(request: Request, context: RouteContext) {
  const { file } = await context.params;
  const resolved = resolvePdfPath(file);

  if (!resolved) {
    return Response.json({ error: "Invalid file name" }, { status: 400 });
  }

  let payload: SavePayload;

  try {
    payload = (await request.json()) as SavePayload;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const values = payload.values ?? {};

  try {
    const sourcePdf = await readFile(resolved.filePath);
    const pdfDoc = await PDFDocument.load(sourcePdf);
    const form = pdfDoc.getForm();

    for (const field of form.getFields()) {
      const fieldName = field.getName();
      const rawValue = values[fieldName];

      if (rawValue === undefined || rawValue === null) {
        continue;
      }

      if (field instanceof PDFTextField) {
        field.setText(String(rawValue));
        continue;
      }

      if (field instanceof PDFCheckBox) {
        if (rawValue === true || rawValue === "true") {
          field.check();
        } else {
          field.uncheck();
        }
        continue;
      }

      if (field instanceof PDFDropdown) {
        const value = String(rawValue);

        if (value) {
          field.select(value);
        }
        continue;
      }

      if (field instanceof PDFOptionList) {
        if (Array.isArray(rawValue)) {
          if (rawValue.length > 0) {
            field.select(rawValue.map((item) => String(item)));
          }
        } else {
          const value = String(rawValue);

          if (value) {
            field.select(value);
          }
        }
        continue;
      }

      if (field instanceof PDFRadioGroup) {
        const value = String(rawValue);

        if (value) {
          field.select(value);
        }
      }
    }

    const outputPdfBytes = await pdfDoc.save();
    await writeFile(resolved.filePath, outputPdfBytes);

    return Response.json({ ok: true, updatedAt: Date.now() });
  } catch {
    return Response.json({ error: "Unable to apply changes to PDF" }, { status: 500 });
  }
}
