import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField
} from "pdf-lib";
import { getModuleFieldsForFile } from "../../../../lib/form-field-modules";

type RouteContext = {
  params: Promise<{ file: string }>;
};

type FieldDescriptor = {
  name: string;
  label?: string;
  type: "text" | "checkbox" | "dropdown" | "optionList" | "radio";
  options?: string[];
  value?: string | boolean;
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

export async function GET(_request: Request, context: RouteContext) {
  const { file } = await context.params;
  const resolved = resolvePdfPath(file);

  if (!resolved) {
    return Response.json({ error: "Invalid file name" }, { status: 400 });
  }

  try {
    const sourcePdf = await readFile(resolved.filePath);
    const pdfDoc = await PDFDocument.load(sourcePdf);
    const form = pdfDoc.getForm();

    const fields: FieldDescriptor[] = [];

    for (const field of form.getFields()) {
      const fieldName = field.getName();

      if (field instanceof PDFTextField) {
        fields.push({ name: fieldName, type: "text", value: field.getText() ?? "" });
        continue;
      }

      if (field instanceof PDFCheckBox) {
        fields.push({ name: fieldName, type: "checkbox", value: field.isChecked() });
        continue;
      }

      if (field instanceof PDFDropdown) {
        const selected = field.getSelected();

        fields.push({
          name: fieldName,
          type: "dropdown",
          options: field.getOptions(),
          value: selected[0] ?? ""
        });
        continue;
      }

      if (field instanceof PDFOptionList) {
        const selected = field.getSelected();

        fields.push({
          name: fieldName,
          type: "optionList",
          options: field.getOptions(),
          value: selected[0] ?? ""
        });
        continue;
      }

      if (field instanceof PDFRadioGroup) {
        fields.push({
          name: fieldName,
          type: "radio",
          options: field.getOptions(),
          value: field.getSelected() ?? ""
        });
      }
    }

    if (fields.length > 0) {
      return Response.json({ fields });
    }

    const fallbackFields = getModuleFieldsForFile(resolved.decodedFile);

    return Response.json({ fields: fallbackFields });
  } catch {
    const fallbackFields = getModuleFieldsForFile(resolved.decodedFile);

    if (fallbackFields.length > 0) {
      return Response.json({ fields: fallbackFields });
    }

    return Response.json({ error: "Unable to read PDF fields" }, { status: 500 });
  }
}
