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

type RouteContext = {
  params: Promise<{ file: string }>;
};

type FieldDescriptor = {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "optionList" | "radio";
  options?: string[];
  value?: string | boolean;
};

const FALLBACK_FIELDS_BY_FILE: Record<string, FieldDescriptor[]> = {
  "csn_roi.pdf": [
    "ClientNum",
    "ClientName",
    "ClientAddress",
    "EntitiesAddition",
    "EntitiesException",
    "ClientDOB",
    "RevocationAddress",
    "RevocationCopySent",
    "RevocationDate",
    "RevokeReturnAddress",
    "SignedDate",
    "SignedPrintName",
    "SignedTelephone",
    "CopyToGuardianAddress",
    "CopyToGaurdianDate"
  ].map((name) => ({ name, type: "text" })),
  "goodneighbor_roi.pdf": [
    "ClientLastName",
    "ClientFirstName",
    "ClientMiddleInit",
    "ClientState",
    "ClientZip",
    "ClientAddress",
    "ClientDOB",
    "ClientSSN",
    "ClientPhone",
    "Dep1Name",
    "Dep1DOB",
    "Dep2Name",
    "Dep1SSN",
    "Dep3Name",
    "Dep4Name",
    "Dep5Name",
    "Dep1Relationship",
    "Dep2Relationship",
    "Dep4Relationship",
    "Dep3Relationship",
    "Dep5Relationship",
    "Dep2DOB",
    "Dep3DOB",
    "Dep4DOB",
    "Dep2SSN",
    "Dep3SSN",
    "Dep5SSN",
    "Dep4SSN",
    "Dep5DOB",
    "AgencySignedDate",
    "ClientSignedDate"
  ].map((name) => ({ name, type: "text" })),
  "storycounty_roi.pdf": [
    "RevokeDate",
    "SignedDate",
    "SignedName",
    "SignedTelephone",
    "ExpirationDate",
    "ClientName",
    "ClientAddres",
    "ClientDOB"
  ].map((name) => ({ name, type: "text" }))
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

    const fallbackFields = FALLBACK_FIELDS_BY_FILE[resolved.decodedFile.toLowerCase()] ?? [];

    return Response.json({ fields: fallbackFields });
  } catch {
    const fallbackFields = FALLBACK_FIELDS_BY_FILE[resolved.decodedFile.toLowerCase()] ?? [];

    if (fallbackFields.length > 0) {
      return Response.json({ fields: fallbackFields });
    }

    return Response.json({ error: "Unable to read PDF fields" }, { status: 500 });
  }
}
