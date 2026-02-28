"use client";

import { useMemo, useState } from "react";

type PdfBrowserProps = {
  files: string[];
};

type FieldDescriptor = {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "optionList" | "radio";
  options?: string[];
  value?: string | boolean;
};

type DependentFieldPart = "Name" | "Relationship" | "DOB" | "SSN";

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

function isCharityTrackerFile(file: string) {
  const normalized = file.toLowerCase();
  return normalized.includes("goodneighbor") || normalized.includes("charity");
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

function getReadableFieldName(fieldName: string) {
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

export default function PdfBrowser({ files }: PdfBrowserProps) {
  const [selectedFile, setSelectedFile] = useState<string>(files[0] ?? "");
  const [viewerVersion, setViewerVersion] = useState<number>(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [visibleDependents, setVisibleDependents] = useState(0);
  const [fields, setFields] = useState<FieldDescriptor[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});
  const [editorError, setEditorError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const selectedUrl = useMemo(() => {
    if (!selectedFile) {
      return "";
    }

    return `/api/pdfs/${encodeURIComponent(selectedFile)}?v=${viewerVersion}`;
  }, [selectedFile, viewerVersion]);

  const isCharityTracker = isCharityTrackerFile(selectedFile);
  const nonDependentFields = isCharityTracker
    ? fields.filter((field) => !getDependentFieldMeta(field.name))
    : fields;

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

  const getFallbackFields = (fileName: string) => FALLBACK_FIELDS_BY_FILE[fileName.toLowerCase()] ?? [];

  const openEditor = async () => {
    if (!selectedFile) {
      return;
    }

    setIsEditorOpen(true);
    setIsLoadingFields(true);
    setVisibleDependents(0);
    setEditorError("");
    setSaveMessage("");

    try {
      const response = await fetch(`/api/pdfs/${encodeURIComponent(selectedFile)}/fields`);

      const payload = (await response.json()) as { fields?: FieldDescriptor[]; error?: string };
      const apiFields = payload.fields ?? [];
      const fallbackFields = getFallbackFields(selectedFile);

      if (!response.ok) {
        const descriptors = fallbackFields;

        setFields(descriptors);
        setFieldValues(createInitialValues(descriptors));

        if (descriptors.length === 0) {
          throw new Error(payload.error ?? "Unable to load form fields");
        }

        return;
      }

      const descriptors = apiFields.length > 0 ? apiFields : fallbackFields;

      setFields(descriptors);
      setFieldValues(createInitialValues(descriptors));

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

  const closeEditor = () => {
    setIsEditorOpen(false);
    setIsSaving(false);
    setEditorError("");
    setSaveMessage("");
  };

  const clearFields = () => {
    setFieldValues(createClearedValues(fields));
    setSaveMessage("");
  };

  const applyChanges = async () => {
    if (!selectedFile) {
      return;
    }

    setIsSaving(true);
    setEditorError("");
    setSaveMessage("");

    try {
      const response = await fetch(`/api/pdfs/${encodeURIComponent(selectedFile)}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values: fieldValues })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setEditorError(payload.error ?? "Could not apply changes to PDF.");
        return;
      }

      setViewerVersion(Date.now());

      setSaveMessage("Saved. The viewer now shows your updated form. Use the viewer download button to save to Desktop.");
      setIsEditorOpen(false);
    } catch {
      setEditorError("Could not apply changes to PDF.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateFieldValue = (fieldName: string, value: string | boolean) => {
    setFieldValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value
    }));
  };

  const downloadAllForms = () => {
    const link = document.createElement("a");
    link.href = `/api/pdfs/download-all?t=${Date.now()}`;
    link.download = "ROI-Forms-Merged.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSelectedForm = () => {
    if (!selectedFile) {
      return;
    }

    const link = document.createElement("a");
    link.href = `/api/pdfs/${encodeURIComponent(selectedFile)}?t=${Date.now()}`;
    link.download = selectedFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            onClick={downloadSelectedForm}
            disabled={!selectedFile}
          >
            Download
          </button>
          <button
            type="button"
            className="editButton downloadActionButton"
            onClick={downloadAllForms}
            disabled={files.length === 0}
          >
            Download All
          </button>
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
        <div className="viewerToolbar">
          <button
            type="button"
            className="editButton"
            onClick={openEditor}
            disabled={!selectedUrl}
          >
            Edit Selected
          </button>
        </div>
        {selectedUrl ? (
          <iframe
            key={selectedUrl}
            className="pdfFrame"
            src={selectedUrl}
            title={selectedFile}
          />
        ) : (
          <p className="emptyText">Select a PDF file to preview it.</p>
        )}
      </section>

      {isEditorOpen ? (
        <div className="modalOverlay" role="presentation">
          <div className="editorDialog" role="dialog" aria-modal="true" aria-labelledby="editorTitle">
            <h3 id="editorTitle">Edit Form Fields</h3>
            <p className="editorSubtitle">{getFileDisplayName(selectedFile)}</p>

            <div className="editorBody">
              {isLoadingFields ? (
                <p className="emptyText">Loading form fields...</p>
              ) : fields.length === 0 ? (
                <p className="emptyText">No fillable fields were found in this PDF.</p>
              ) : (
                <>
                  <div className="fieldGrid">
                    {nonDependentFields.map((field) => {
                    const currentValue = fieldValues[field.name];
                    const label = getReadableFieldName(field.name);

                    if (field.type === "checkbox") {
                      return (
                        <label key={field.name} className="editorCheckbox">
                          <input
                            type="checkbox"
                            checked={Boolean(currentValue)}
                            onChange={(event) => updateFieldValue(field.name, event.target.checked)}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    }

                    const hasOptions = Boolean(field.options && field.options.length > 0);

                    return (
                      <label key={field.name} className="editorField">
                        <span>{label}</span>
                        {hasOptions ? (
                          <select
                            className="editorInput"
                            value={typeof currentValue === "string" ? currentValue : ""}
                            onChange={(event) => updateFieldValue(field.name, event.target.value)}
                          >
                            <option value="">Select...</option>
                            {field.options?.map((option) => (
                              <option key={`${field.name}-${option}`} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="editorInput"
                            type="text"
                            value={typeof currentValue === "string" ? currentValue : ""}
                            onChange={(event) => updateFieldValue(field.name, event.target.value)}
                          />
                        )}
                      </label>
                    );
                    })}
                  </div>

                  {isCharityTracker ? (
                    <div className="dependentRows">
                      <div className="dependentActions">
                        <button
                          type="button"
                          className="secondaryButton"
                          onClick={() => setVisibleDependents((currentCount) => Math.min(5, currentCount + 1))}
                          disabled={visibleDependents >= 5}
                        >
                          Add a Dependent
                        </button>
                      </div>

                      {dependentRows.map((row) => (
                        <div key={`dependent-${row.index}`} className="dependentRow">
                          {(["Name", "Relationship", "DOB", "SSN"] as DependentFieldPart[]).map((part) => {
                            const field = row.fields[part];

                            if (!field) {
                              return <div key={`dependent-${row.index}-${part}`} />;
                            }

                            const currentValue = fieldValues[field.name];

                            return (
                              <label key={field.name} className="editorField dependentField">
                                <span>{part}</span>
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
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="editorMessages">
              {editorError ? <p className="editorStatus error">{editorError}</p> : null}
              {saveMessage ? <p className="editorStatus success">{saveMessage}</p> : null}
            </div>

            <div className="editorActions">
              <button
                type="button"
                className="editButton"
                onClick={applyChanges}
                disabled={isSaving || isLoadingFields || !!editorError}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="secondaryButton"
                onClick={clearFields}
                disabled={isSaving || isLoadingFields || fields.length === 0}
              >
                Clear Fields
              </button>
              <button
                type="button"
                className="secondaryButton"
                onClick={closeEditor}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}