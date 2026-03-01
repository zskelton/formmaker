export type FormFieldType = "text" | "checkbox" | "dropdown" | "optionList" | "radio";

export type FormFieldDescriptor = {
  name: string;
  label: string;
  type: FormFieldType;
  options?: string[];
  value?: string | boolean;
};

function toReadableLabel(fieldName: string) {
  const corrected = fieldName
    .replace(/Gaurdian/gi, "Guardian")
    .replace(/Addres$/i, "Address");

  const withSpaces = corrected
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return withSpaces
    .replace(/\bDob\b/g, "DOB")
    .replace(/\bSsn\b/g, "SSN")
    .replace(/\bZip\b/g, "ZIP")
    .replace(/\bId\b/g, "ID");
}

function buildTextModule(fieldNames: string[]): FormFieldDescriptor[] {
  return fieldNames.map((name) => ({
    name,
    label: toReadableLabel(name),
    type: "text"
  }));
}

export const FORM_FIELD_MODULES: Record<string, FormFieldDescriptor[]> = {
  "csn_roi.pdf": buildTextModule([
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
  ]),
  "goodneighbor_roi.pdf": buildTextModule([
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
  ]),
  "storycounty_roi.pdf": buildTextModule([
    "RevokeDate",
    "SignedDate",
    "SignedName",
    "SignedTelephone",
    "ExpirationDate",
    "ClientName",
    "ClientAddres",
    "ClientDOB"
  ])
};

export function getModuleFieldsForFile(fileName: string): FormFieldDescriptor[] {
  return FORM_FIELD_MODULES[fileName.toLowerCase()] ?? [];
}

export function getReadableFieldName(fieldName: string) {
  return toReadableLabel(fieldName);
}
