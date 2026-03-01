"use client";

import { useMemo, useState } from "react";
import { getModuleFieldsForFile, getReadableFieldName } from "./lib/form-field-modules";
import {
  US_STATES,
  addYearsToDateString,
  buildDisplayName,
  combineAddressParts,
  formatDateInput,
  formatPhoneInput,
  formatSsnInput,
  parseDisplayName,
  splitAddressAndCity,
  todayDateString
} from "./lib/form-workflow";

type PdfBrowserProps = {
  files: string[];
};

type FieldDescriptor = {
  name: string;
  label?: string;
  type: "text" | "checkbox" | "dropdown" | "optionList" | "radio";
  options?: string[];
  value?: string | boolean;
};

type EditorMode = "single" | "all";
type FormKey = "csn" | "charity" | "story" | "other";

type DependentFieldPart = "Name" | "Relationship" | "DOB" | "SSN";

const CSN_REVOKE_ADDRESS_DEFAULT = "126 S. Kellogg, Suite 001, Ames, IA 50010";
const CSN_HIDDEN_FIELDS = new Set([
  "EntitiesException",
  "EntitiesAddition",
  "RevocationAddress",
  "RevocationCopySent",
  "CopyToGaurdianDate",
  "CopyToGuardianAddress"
]);

const ALL_FORM_DESCRIPTORS: FieldDescriptor[] = [
  { name: "allLastName", label: "Last Name", type: "text" },
  { name: "allFirstName", label: "First Name", type: "text" },
  { name: "allMiddleInit", label: "Middle Init", type: "text" },
  { name: "allAddress", label: "Address", type: "text" },
  { name: "allCity", label: "City", type: "text" },
  { name: "allState", label: "State", type: "dropdown", options: US_STATES },
  { name: "allZip", label: "ZIP", type: "text" },
  { name: "allClientNum", label: "CSN Number", type: "text" },
  { name: "allClientDOB", label: "Client DOB", type: "text" },
  { name: "allClientPhone", label: "Client Phone", type: "text" },
  { name: "allClientSSN", label: "SSN", type: "text" },
  { name: "allSignedDate", label: "Signed Date", type: "text" }
];

function getFileDisplayName(file: string) {
  const normalized = file.toLowerCase();

  if (normalized.includes("csn")) {
    return "CSN";
  }

  if (normalized.includes("goodneighbor") || normalized.includes("charity")) {
    return "Charity Tracker";
  }

  if (normalized.includes("story")) {
    return "Story County";
  }

  return file.replace(/\.pdf$/i, "");
}

function getFormKey(fileName: string): FormKey {
  const normalized = fileName.toLowerCase();

  if (normalized.includes("csn")) {
    return "csn";
  }

  if (normalized.includes("goodneighbor") || normalized.includes("charity")) {
    return "charity";
  }

  if (normalized.includes("story")) {
    return "story";
  }

  return "other";
}

function getDependentFieldMeta(fieldName: string) {
  const match = fieldName.match(/^Dep([1-5])(Name|Relationship|DOB|SSN)$/i);

  if (!match) {
    return null;
  }

  const index = Number(match[1]);
  const rawPart = match[2].toUpperCase();
  const part: DependentFieldPart =
    rawPart === "DOB"
      ? "DOB"
      : rawPart === "SSN"
        ? "SSN"
        : rawPart === "RELATIONSHIP"
          ? "Relationship"
          : "Name";

  return { index, part };
}

function normalizeFieldName(fieldName: string) {
  return fieldName
    .toLowerCase()
    .replace(/gaurdian/g, "guardian")
    .replace(/addres$/g, "address")
    .replace(/[^a-z0-9]/g, "");
}

async function loadFieldsForFile(fileName: string) {
  const response = await fetch(`/api/pdfs/${encodeURIComponent(fileName)}/fields`);
  const payload = (await response.json()) as { fields?: FieldDescriptor[]; error?: string };
  const apiFields = payload.fields ?? [];
  const fallbackFields = getModuleFieldsForFile(fileName);

  if (!response.ok) {
    return fallbackFields;
  }

  return apiFields.length > 0 ? apiFields : fallbackFields;
}

export default function PdfBrowser({ files }: PdfBrowserProps) {
  const [selectedFile, setSelectedFile] = useState<string>(files[0] ?? "");
  const [viewerVersion, setViewerVersion] = useState<number>(0);
  const [editorMode, setEditorMode] = useState<EditorMode>("single");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [visibleDependents, setVisibleDependents] = useState(0);
  const [fields, setFields] = useState<FieldDescriptor[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});
  const [editorError, setEditorError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState("");

  const selectedUrl = useMemo(() => {
    if (!selectedFile) {
      return "";
    }

    return `/api/pdfs/${encodeURIComponent(selectedFile)}?v=${viewerVersion}`;
  }, [selectedFile, viewerVersion]);

  const selectedFormKey = getFormKey(selectedFile);
  const shouldShowCharityDependents = editorMode === "single" && selectedFormKey === "charity";

  const fieldsByName = useMemo(() => {
    const map = new Map<string, FieldDescriptor>();
    for (const field of fields) {
      map.set(field.name, field);
    }
    return map;
  }, [fields]);

  const createInitialValues = (descriptors: FieldDescriptor[]) => {
    const nextValues: Record<string, string | boolean> = {};

    for (const descriptor of descriptors) {
      if (descriptor.value !== undefined) {
        nextValues[descriptor.name] = descriptor.value;
      } else {
        nextValues[descriptor.name] = descriptor.type === "checkbox" ? false : "";
      }
    }

    return nextValues;
  };

  const createClearedValues = (descriptors: FieldDescriptor[]) => {
    const nextValues: Record<string, string | boolean> = {};

    for (const descriptor of descriptors) {
      nextValues[descriptor.name] = descriptor.type === "checkbox" ? false : "";
    }

    return nextValues;
  };

  const normalizeInputValue = (fieldName: string, value: string | boolean) => {
    if (typeof value !== "string") {
      return value;
    }

    const dateFields = new Set([
      "ClientDOB",
      "SignedDate",
      "AgencySignedDate",
      "ClientSignedDate",
      "ExpirationDate",
      "CopyToGaurdianDate",
      "RevocationDate",
      "RevokeDate",
      "allClientDOB",
      "allSignedDate"
    ]);

    if (dateFields.has(fieldName)) {
      return formatDateInput(value);
    }

    if (fieldName === "ClientPhone" || fieldName === "allClientPhone") {
      return formatPhoneInput(value);
    }

    if (fieldName === "SignedTelephone") {
      return formatPhoneInput(value);
    }

    if (fieldName === "ClientSSN" || fieldName === "allClientSSN") {
      return formatSsnInput(value);
    }

    if (fieldName === "allZip") {
      return value.replace(/\D/g, "").slice(0, 5);
    }

    return value;
  };

  const updateFieldValue = (fieldName: string, value: string | boolean) => {
    const nextValue = normalizeInputValue(fieldName, value);

    setFieldValues((currentValues) => ({
      ...currentValues,
      [fieldName]: nextValue
    }));
  };

  const openEditor = async () => {
    if (!selectedFile) {
      return;
    }

    setEditorMode("single");
    setIsEditorOpen(true);
    setIsLoadingFields(true);
    setVisibleDependents(0);
    setEditorError("");
    setSaveMessage("");

    try {
      const descriptors = await loadFieldsForFile(selectedFile);
      const nextValues = createInitialValues(descriptors);
      const today = todayDateString();

      if (selectedFormKey === "csn") {
        if (!String(nextValues.RevokeReturnAddress ?? "").trim()) {
          nextValues.RevokeReturnAddress = CSN_REVOKE_ADDRESS_DEFAULT;
        }

        if (!String(nextValues.SignedDate ?? "").trim()) {
          nextValues.SignedDate = today;
        }
      }

      if (selectedFormKey === "charity") {
        if (!String(nextValues.ClientSignedDate ?? "").trim()) {
          nextValues.ClientSignedDate = today;
        }

        if (!String(nextValues.AgencySignedDate ?? "").trim()) {
          nextValues.AgencySignedDate = today;
        }

        const { address, city } = splitAddressAndCity(nextValues.ClientAddress ?? "");
        nextValues.ClientAddress = address;
        nextValues.ClientCity = city;
      }

      if (selectedFormKey === "story") {
        if (!String(nextValues.SignedDate ?? "").trim()) {
          nextValues.SignedDate = today;
        }

        if (!String(nextValues.ExpirationDate ?? "").trim()) {
          nextValues.ExpirationDate = addYearsToDateString(String(nextValues.SignedDate), 1);
        }
      }

      setFields(descriptors);
      setFieldValues(nextValues);

      if (descriptors.length === 0) {
        setEditorError("No fillable fields were found in this PDF.");
      }
    } catch {
      setEditorError("Could not load form fields for this PDF.");
      setFields([]);
      setFieldValues({});
    } finally {
      setIsLoadingFields(false);
    }
  };

  const openAllEditor = async () => {
    if (files.length === 0) {
      return;
    }

    setEditorMode("all");
    setIsEditorOpen(true);
    setIsLoadingFields(true);
    setVisibleDependents(0);
    setEditorError("");
    setSaveMessage("");

    try {
      const byFileEntries = await Promise.all(
        files.map(async (fileName) => [fileName, await loadFieldsForFile(fileName)] as const)
      );
      const byFile = Object.fromEntries(byFileEntries) as Record<string, FieldDescriptor[]>;

      const getValue = (fileKey: FormKey, fieldName: string) => {
        const target = files.find((fileName) => getFormKey(fileName) === fileKey);
        if (!target) {
          return "";
        }

        const match = byFile[target].find((field) => normalizeFieldName(field.name) === normalizeFieldName(fieldName));
        return typeof match?.value === "boolean" ? (match.value ? "true" : "false") : String(match?.value ?? "");
      };

      const charityLast = getValue("charity", "ClientLastName");
      const charityFirst = getValue("charity", "ClientFirstName");
      const charityMiddle = getValue("charity", "ClientMiddleInit");
      const fallbackParsedName = parseDisplayName(getValue("csn", "ClientName") || getValue("story", "ClientName"));

      const charityAddressRaw = getValue("charity", "ClientAddress");
      const splitAddress = splitAddressAndCity(charityAddressRaw);
      const signedDateSeed =
        getValue("charity", "ClientSignedDate") ||
        getValue("csn", "SignedDate") ||
        getValue("story", "SignedDate") ||
        todayDateString();

      const allValues: Record<string, string | boolean> = {
        allLastName: charityLast || fallbackParsedName.lastName,
        allFirstName: charityFirst || fallbackParsedName.firstName,
        allMiddleInit: charityMiddle || fallbackParsedName.middleInitial,
        allAddress: splitAddress.address,
        allCity: splitAddress.city,
        allState: getValue("charity", "ClientState"),
        allZip: getValue("charity", "ClientZip"),
        allClientNum: getValue("csn", "ClientNum"),
        allClientDOB: formatDateInput(getValue("charity", "ClientDOB") || getValue("csn", "ClientDOB") || getValue("story", "ClientDOB")),
        allClientPhone: formatPhoneInput(getValue("charity", "ClientPhone")),
        allClientSSN: formatSsnInput(getValue("charity", "ClientSSN")),
        allSignedDate: formatDateInput(signedDateSeed)
      };

      setFields(ALL_FORM_DESCRIPTORS);
      setFieldValues(allValues);
    } catch {
      setEditorError("Could not load all forms.");
      setFields([]);
      setFieldValues({});
    } finally {
      setIsLoadingFields(false);
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditorMode("single");
    setIsSaving(false);
    setEditorError("");
    setSaveMessage("");
  };

  const clearFields = () => {
    const nextValues = createClearedValues(fields);

    if (editorMode === "single") {
      if (selectedFormKey === "csn") {
        nextValues.RevokeReturnAddress = CSN_REVOKE_ADDRESS_DEFAULT;
        nextValues.SignedDate = todayDateString();
      }

      if (selectedFormKey === "charity") {
        nextValues.ClientSignedDate = todayDateString();
        nextValues.AgencySignedDate = todayDateString();
      }

      if (selectedFormKey === "story") {
        nextValues.SignedDate = todayDateString();
        nextValues.ExpirationDate = addYearsToDateString(todayDateString(), 1);
      }
    }

    if (editorMode === "all") {
      nextValues.allSignedDate = todayDateString();
    }

    setFieldValues(nextValues);
    setSaveMessage("");
  };

  const applyChanges = async () => {
    setIsSaving(true);
    setEditorError("");
    setSaveMessage("");

    try {
      if (editorMode === "all") {
        const parsedName = {
          lastName: String(fieldValues.allLastName ?? "").trim(),
          firstName: String(fieldValues.allFirstName ?? "").trim(),
          middleInitial: String(fieldValues.allMiddleInit ?? "").trim()
        };
        const mergedName = buildDisplayName(parsedName.lastName, parsedName.firstName, parsedName.middleInitial);
        const signedDate = formatDateInput(String(fieldValues.allSignedDate ?? todayDateString()));
        const expirationDate = addYearsToDateString(signedDate, 1);

        const csnValues: Record<string, string | boolean> = {
          ClientName: mergedName,
          ClientAddress: combineAddressParts(
            String(fieldValues.allAddress ?? ""),
            String(fieldValues.allCity ?? ""),
            String(fieldValues.allState ?? ""),
            String(fieldValues.allZip ?? "")
          ),
          ClientNum: String(fieldValues.allClientNum ?? ""),
          ClientDOB: formatDateInput(String(fieldValues.allClientDOB ?? "")),
          SignedDate: signedDate,
          RevokeReturnAddress: CSN_REVOKE_ADDRESS_DEFAULT
        };

        const charityValues: Record<string, string | boolean> = {
          ClientLastName: parsedName.lastName,
          ClientFirstName: parsedName.firstName,
          ClientMiddleInit: parsedName.middleInitial,
          ClientAddress: combineAddressParts(String(fieldValues.allAddress ?? ""), String(fieldValues.allCity ?? ""), "", ""),
          ClientState: String(fieldValues.allState ?? ""),
          ClientZip: String(fieldValues.allZip ?? ""),
          ClientDOB: formatDateInput(String(fieldValues.allClientDOB ?? "")),
          ClientPhone: formatPhoneInput(String(fieldValues.allClientPhone ?? "")),
          ClientSSN: formatSsnInput(String(fieldValues.allClientSSN ?? "")),
          ClientSignedDate: signedDate,
          AgencySignedDate: signedDate
        };

        const storyValues: Record<string, string | boolean> = {
          ClientName: mergedName,
          ClientAddres: combineAddressParts(
            String(fieldValues.allAddress ?? ""),
            String(fieldValues.allCity ?? ""),
            String(fieldValues.allState ?? ""),
            String(fieldValues.allZip ?? "")
          ),
          ClientDOB: formatDateInput(String(fieldValues.allClientDOB ?? "")),
          SignedDate: signedDate,
          ExpirationDate: expirationDate
        };

        for (const fileName of files) {
          const formKey = getFormKey(fileName);
          const values = formKey === "csn" ? csnValues : formKey === "charity" ? charityValues : formKey === "story" ? storyValues : {};

          if (Object.keys(values).length === 0) {
            continue;
          }

          const response = await fetch(`/api/pdfs/${encodeURIComponent(fileName)}/save`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ values })
          });

          if (!response.ok) {
            const payload = (await response.json()) as { error?: string };
            setEditorError(payload.error ?? `Could not apply changes to ${getFileDisplayName(fileName)}.`);
            return;
          }
        }

        setViewerVersion(Date.now());
        setSaveMessage("Saved to all forms.");
        setIsEditorOpen(false);
      } else {
        if (!selectedFile) {
          return;
        }

        const valuesToSave: Record<string, string | boolean> = {};

        for (const field of fields) {
          if (selectedFormKey === "csn" && CSN_HIDDEN_FIELDS.has(field.name)) {
            continue;
          }

          if (shouldShowCharityDependents) {
            const dependent = getDependentFieldMeta(field.name);

            if (dependent && dependent.index > visibleDependents) {
              continue;
            }
          }

          valuesToSave[field.name] = fieldValues[field.name] ?? "";
        }

        if (selectedFormKey === "charity") {
          valuesToSave.ClientAddress = combineAddressParts(
            String(fieldValues.ClientAddress ?? ""),
            String(fieldValues.ClientCity ?? ""),
            "",
            ""
          );
        }

        if (selectedFormKey === "csn") {
          valuesToSave.RevokeReturnAddress = String(fieldValues.RevokeReturnAddress ?? CSN_REVOKE_ADDRESS_DEFAULT);
          valuesToSave.SignedDate = formatDateInput(String(fieldValues.SignedDate ?? todayDateString()));
          valuesToSave.ClientDOB = formatDateInput(String(fieldValues.ClientDOB ?? ""));
        }

        if (selectedFormKey === "charity") {
          valuesToSave.ClientPhone = formatPhoneInput(String(fieldValues.ClientPhone ?? ""));
          valuesToSave.ClientSSN = formatSsnInput(String(fieldValues.ClientSSN ?? ""));
          valuesToSave.ClientSignedDate = formatDateInput(String(fieldValues.ClientSignedDate ?? todayDateString()));
          valuesToSave.AgencySignedDate = formatDateInput(String(fieldValues.AgencySignedDate ?? todayDateString()));
          valuesToSave.ClientDOB = formatDateInput(String(fieldValues.ClientDOB ?? ""));
        }

        if (selectedFormKey === "story") {
          const signedDate = formatDateInput(String(fieldValues.SignedDate ?? todayDateString()));
          valuesToSave.SignedDate = signedDate;
          valuesToSave.ExpirationDate = formatDateInput(String(fieldValues.ExpirationDate ?? addYearsToDateString(signedDate, 1)));
          valuesToSave.ClientDOB = formatDateInput(String(fieldValues.ClientDOB ?? ""));
          valuesToSave.SignedTelephone = formatPhoneInput(String(fieldValues.SignedTelephone ?? ""));
        }

        const response = await fetch(`/api/pdfs/${encodeURIComponent(selectedFile)}/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: valuesToSave })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setEditorError(payload.error ?? "Could not apply changes to PDF.");
          return;
        }

        setViewerVersion(Date.now());
        setSaveMessage("Saved. The viewer now shows your updated form.");
        setIsEditorOpen(false);
      }
    } catch {
      setEditorError(editorMode === "all" ? "Could not apply changes to all forms." : "Could not apply changes to PDF.");
    } finally {
      setIsSaving(false);
    }
  };

  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const downloadWithProgress = async (url: string, fileName: string, preparingLabel: string) => {
    if (isPreparingDownload) {
      return;
    }

    setIsPreparingDownload(true);
    setDownloadProgress(6);
    setDownloadStatus(preparingLabel);

    const pulseTimer = window.setInterval(() => {
      setDownloadProgress((current) => Math.min(88, current + 2));
    }, 220);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Download request failed");
      }

      const contentLengthHeader = response.headers.get("content-length");
      const totalBytes = contentLengthHeader ? Number(contentLengthHeader) : 0;

      if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;

        setDownloadStatus("Downloading document...");

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          if (!value) {
            continue;
          }

          chunks.push(value);
          receivedBytes += value.length;

          if (totalBytes > 0) {
            const percentage = Math.round((receivedBytes / totalBytes) * 100);
            setDownloadProgress((current) => Math.max(current, Math.min(97, percentage)));
          }
        }

        const mergedBytes = new Uint8Array(receivedBytes);
        let byteOffset = 0;

        for (const chunk of chunks) {
          mergedBytes.set(chunk, byteOffset);
          byteOffset += chunk.length;
        }

        const blob = new Blob([mergedBytes], { type: "application/pdf" });
        triggerBlobDownload(blob, fileName);
      } else {
        const blob = await response.blob();
        triggerBlobDownload(blob, fileName);
      }

      setDownloadProgress(100);
      setDownloadStatus("Document ready.");
    } catch {
      setDownloadProgress(0);
      setDownloadStatus("Download failed. Please try again.");
    } finally {
      window.clearInterval(pulseTimer);

      window.setTimeout(() => {
        setIsPreparingDownload(false);
        setDownloadProgress(0);
        setDownloadStatus("");
      }, 1500);
    }
  };

  const downloadAllForms = async () => {
    await downloadWithProgress(
      `/api/pdfs/download-all?t=${Date.now()}`,
      "ROI-Forms-Merged.pdf",
      "Preparing merged print document..."
    );
  };

  const downloadSelectedForm = async () => {
    if (!selectedFile) {
      return;
    }

    await downloadWithProgress(
      `/api/pdfs/print/${encodeURIComponent(selectedFile)}?t=${Date.now()}`,
      selectedFile.replace(/\.pdf$/i, "") + "-print.pdf",
      "Preparing print document..."
    );
  };

  const renderTextInput = (name: string, label: string, className = "editorField") => (
    <label key={name} className={className}>
      <span>{label}</span>
      <input
        className="editorInput"
        type="text"
        value={typeof fieldValues[name] === "string" ? String(fieldValues[name]) : ""}
        onChange={(event) => updateFieldValue(name, event.target.value)}
      />
    </label>
  );

  const renderStateSelect = (name: string, label: string, className = "editorField") => (
    <label key={name} className={className}>
      <span>{label}</span>
      <select
        className="editorInput"
        value={typeof fieldValues[name] === "string" ? String(fieldValues[name]) : ""}
        onChange={(event) => updateFieldValue(name, event.target.value)}
      >
        <option value="">Select...</option>
        {US_STATES.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>
    </label>
  );

  const getDependentField = (index: number, part: DependentFieldPart) => {
    return fields.find((field) => {
      const meta = getDependentFieldMeta(field.name);
      return meta?.index === index && meta.part === part;
    });
  };

  const dependentRows = Array.from({ length: visibleDependents }, (_value, offset) => {
    const index = offset + 1;

    return {
      index,
      fields: {
        Name: getDependentField(index, "Name"),
        Relationship: getDependentField(index, "Relationship"),
        DOB: getDependentField(index, "DOB"),
        SSN: getDependentField(index, "SSN")
      }
    };
  }).filter((row) => Object.values(row.fields).some(Boolean));

  return (
    <div className="splitLayout">
      <aside className="leftPane">
        <h2>Select a File:</h2>
        {files.length === 0 ? (
          <p className="emptyText">No PDF files found in app/data.</p>
        ) : (
          <ul className="fileList">
            {files.map((file) => (
              <li key={file}>
                <button
                  type="button"
                  className={file === selectedFile ? "fileButton active" : "fileButton"}
                  onClick={() => setSelectedFile(file)}
                >
                  <span className="fileButtonContent">
                    <span className="fileIcon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" className="fileIconSvg" focusable="false">
                        <path
                          d="M7 3.75h7.5l4.75 4.75v11.75a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 7 3.75Z"
                          className="fileIconOutline"
                        />
                        <path d="M14.5 3.75V8.5h4.75" className="fileIconOutline" />
                      </svg>
                    </span>
                    <span>{getFileDisplayName(file)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="downloadActions">
          <button
            type="button"
            className="editButton downloadActionButton"
            onClick={() => {
              void downloadSelectedForm();
            }}
            disabled={!selectedFile || isPreparingDownload}
          >
            Download
          </button>
          <button
            type="button"
            className="editButton downloadActionButton"
            onClick={() => {
              void downloadAllForms();
            }}
            disabled={files.length === 0 || isPreparingDownload}
          >
            Download All
          </button>
        </div>

        <div className="downloadProgressPanel" aria-live="polite">
          <p className="downloadProgressStatus">
            {downloadStatus || "Ready to prepare print document."}
          </p>
          <progress
            className={isPreparingDownload ? "downloadProgressTrack active" : "downloadProgressTrack"}
            value={downloadProgress}
            max={100}
          />
        </div>

        <div className="leftPaneHelp" aria-label="Run instructions">
          <hr className="leftPaneDivider" />
          <h3>How to Use:</h3>
          <div className="howToLines">
            <p>1. Select a File</p>
            <p>2. Click <strong>Edit Selected</strong> to Open</p>
            <p>3. Update Form and click <strong>Save</strong></p>
            <p>4. <strong>Download</strong> Individual File</p>
            <p className="howToOr">- or -</p>
            <p>4. <strong>Download All</strong> Files as One</p>
          </div>
        </div>
      </aside>

      <section className="rightPane" aria-label="PDF viewer">
        <div className="viewerToolbarRow">
          <button type="button" className="editButton toolbarLeft" onClick={openEditor} disabled={!selectedUrl}>
            Edit Selected
          </button>
          <button type="button" className="editButton toolbarCenter" onClick={openAllEditor} disabled={files.length === 0}>
            Edit All Forms
          </button>
          <span className="toolbarSpacer" aria-hidden="true" />
        </div>
        {selectedUrl ? <iframe key={selectedUrl} className="pdfFrame" src={selectedUrl} title={selectedFile} /> : <p className="emptyText">Select a PDF file to preview it.</p>}
      </section>

      {isEditorOpen ? (
        <div className="modalOverlay" role="presentation">
          <div className="editorDialog" role="dialog" aria-modal="true" aria-labelledby="editorTitle">
            <h3 id="editorTitle">{editorMode === "all" ? "Edit All Forms" : "Edit Form Fields"}</h3>
            <p className="editorSubtitle">{editorMode === "all" ? "Mapped fields across CSN, Charity Tracker, and Story County" : getFileDisplayName(selectedFile)}</p>

            <div className="editorBody">
              {isLoadingFields ? (
                <p className="emptyText">Loading form fields...</p>
              ) : editorMode === "all" ? (
                <>
                  <div className="editorRow three">
                    {renderTextInput("allLastName", "Last Name")}
                    {renderTextInput("allFirstName", "First Name")}
                    {renderTextInput("allMiddleInit", "Middle Init")}
                  </div>
                  <div className="editorRow four">
                    {renderTextInput("allAddress", "Address")}
                    {renderTextInput("allCity", "City")}
                    {renderStateSelect("allState", "State")}
                    {renderTextInput("allZip", "ZIP")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("allClientNum", "CSN Number")}
                    {renderTextInput("allClientDOB", "Client DOB (mm/dd/yyyy)")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("allClientPhone", "Client Phone ((###) ###-####)")}
                    {renderTextInput("allClientSSN", "SSN (###-##-####)")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("allSignedDate", "Signed Date (mm/dd/yyyy)")}
                  </div>
                </>
              ) : selectedFormKey === "csn" ? (
                <>
                  <div className="editorRow">
                    {renderTextInput("ClientName", "Client Name")}
                    {renderTextInput("ClientAddress", "Client Address")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("ClientNum", "CSN Number")}
                    {renderTextInput("ClientDOB", "Client DOB (mm/dd/yyyy)")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("RevokeReturnAddress", "Revoke Address")}
                    {renderTextInput("SignedDate", "Sign Date (mm/dd/yyyy)")}
                  </div>
                </>
              ) : selectedFormKey === "charity" ? (
                <>
                  <p className="formSectionLabel">Client Information</p>
                  <div className="editorRow three">
                    {renderTextInput("ClientLastName", "Last Name")}
                    {renderTextInput("ClientFirstName", "First Name")}
                    {renderTextInput("ClientMiddleInit", "Middle Init")}
                  </div>
                  <div className="editorRow three">
                    {renderTextInput("ClientAddress", "Address")}
                    {renderTextInput("ClientCity", "City")}
                    {renderStateSelect("ClientState", "State")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("ClientZip", "ZIP")}
                    {renderTextInput("ClientDOB", "Client DOB (mm/dd/yyyy)")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("ClientPhone", "Phone ((###) ###-####)")}
                    {renderTextInput("ClientSSN", "SSN (###-##-####)")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("ClientSignedDate", "Client Signed Date (mm/dd/yyyy)")}
                    {renderTextInput("AgencySignedDate", "Agency Signed Date (mm/dd/yyyy)")}
                  </div>

                  <div className="dependentRows">
                    <div className="dependentActions">
                      <button
                        type="button"
                        className="dependentAddButton"
                        onClick={() => setVisibleDependents((currentCount) => Math.min(5, currentCount + 1))}
                        disabled={visibleDependents >= 5}
                      >
                        Add Dependent
                      </button>
                    </div>

                    {dependentRows.map((row) => (
                      <div key={`dependent-${row.index}`} className="dependentRow">
                        {(["Name", "Relationship", "DOB", "SSN"] as DependentFieldPart[]).map((part) => {
                          const field = row.fields[part];

                          if (!field) {
                            return <div key={`dependent-${row.index}-${part}`} />;
                          }

                          return renderTextInput(field.name, part, "editorField dependentField");
                        })}
                      </div>
                    ))}
                  </div>
                </>
              ) : selectedFormKey === "story" ? (
                <>
                  <div className="editorRow">
                    {renderTextInput("ClientName", "Client Name")}
                    {renderTextInput("ClientAddres", "Client Address")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("ClientDOB", "Client DOB (mm/dd/yyyy)")}
                    {renderTextInput("SignedName", "Staff Singing")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("SignedDate", "Signed Date (mm/dd/yyyy)")}
                    {renderTextInput("ExpirationDate", "Expiration Date (mm/dd/yyyy)")}
                  </div>
                  <div className="editorRow">
                    {renderTextInput("SignedTelephone", "Phone ((###) ###-####)")}
                    <div />
                  </div>
                </>
              ) : fields.length === 0 ? (
                <p className="emptyText">No fillable fields were found in this PDF.</p>
              ) : (
                <div className="fieldGrid">
                  {fields.map((field) => {
                    const label = field.label ?? getReadableFieldName(field.name);
                    const currentValue = fieldValues[field.name];

                    if (field.type === "checkbox") {
                      return (
                        <label key={field.name} className="editorCheckbox">
                          <input type="checkbox" checked={Boolean(currentValue)} onChange={(event) => updateFieldValue(field.name, event.target.checked)} />
                          <span>{label}</span>
                        </label>
                      );
                    }

                    return (
                      <label key={field.name} className="editorField">
                        <span>{label}</span>
                        <input
                          className="editorInput"
                          type="text"
                          value={typeof currentValue === "string" ? currentValue : ""}
                          onChange={(event) => updateFieldValue(field.name, event.target.value)}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="editorMessages">
              {editorError ? <p className="editorStatus error">{editorError}</p> : null}
              {saveMessage ? <p className="editorStatus success">{saveMessage}</p> : null}
            </div>

            <div className="editorActions">
              <button type="button" className="editButton" onClick={applyChanges} disabled={isSaving || isLoadingFields || !!editorError}>
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button type="button" className="secondaryButton" onClick={clearFields} disabled={isSaving || isLoadingFields || fields.length === 0}>
                Clear Fields
              </button>
              <button type="button" className="secondaryButton" onClick={closeEditor} disabled={isSaving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
