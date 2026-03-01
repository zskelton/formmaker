"use client";

import { useMemo, useState } from "react";
import { getModuleFieldsForFile, getReadableFieldName } from "./lib/form-field-modules";

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

type DependentFieldPart = "Name" | "Relationship" | "DOB" | "SSN";

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

function normalizeFieldName(fieldName: string) {
  return fieldName
    .toLowerCase()
    .replace(/gaurdian/g, "guardian")
    .replace(/addres$/g, "address")
    .replace(/[^a-z0-9]/g, "");
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
  const [allModeFieldMap, setAllModeFieldMap] = useState<Record<string, Record<string, string>>>({});
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
  const shouldShowCharityDependents = editorMode === "single" && isCharityTracker;
  const nonDependentFields = shouldShowCharityDependents
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

  const getFallbackFields = (fileName: string) => getModuleFieldsForFile(fileName);

  const openEditor = async () => {
    if (!selectedFile) {
      return;
    }

    setEditorMode("single");
    setIsEditorOpen(true);
    setIsLoadingFields(true);
    setVisibleDependents(0);
    setAllModeFieldMap({});
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

  const openAllEditor = async () => {
    if (files.length === 0) {
      return;
    }

    setEditorMode("all");
    setIsEditorOpen(true);
    setIsLoadingFields(true);
    setVisibleDependents(0);
    setAllModeFieldMap({});
    setEditorError("");
    setSaveMessage("");

    try {
      const allResults = await Promise.all(
        files.map(async (fileName) => {
          const response = await fetch(`/api/pdfs/${encodeURIComponent(fileName)}/fields`);
          const payload = (await response.json()) as { fields?: FieldDescriptor[]; error?: string };
          const apiFields = payload.fields ?? [];
          const fallbackFields = getFallbackFields(fileName);

          if (!response.ok) {
            return { fileName, fields: fallbackFields };
          }

          return { fileName, fields: apiFields.length > 0 ? apiFields : fallbackFields };
        })
      );

      const canonicalMap = new Map<
        string,
        {
          displayName: string;
          type: FieldDescriptor["type"];
          options?: string[];
          byFile: Record<string, string>;
          valuesByFile: Record<string, string | boolean | undefined>;
        }
      >();

      for (const result of allResults) {
        const seenForFile = new Set<string>();

        for (const descriptor of result.fields) {
          const canonicalName = normalizeFieldName(descriptor.name);

          if (!canonicalName || seenForFile.has(canonicalName)) {
            continue;
          }

          seenForFile.add(canonicalName);

          const existing = canonicalMap.get(canonicalName);

          if (existing) {
            existing.byFile[result.fileName] = descriptor.name;
            existing.valuesByFile[result.fileName] = descriptor.value;
            continue;
          }

          canonicalMap.set(canonicalName, {
            displayName: descriptor.label ?? getReadableFieldName(descriptor.name),
            type: descriptor.type,
            options: descriptor.options,
            byFile: {
              [result.fileName]: descriptor.name
            },
            valuesByFile: {
              [result.fileName]: descriptor.value
            }
          });
        }
      }

      const commonFields = Array.from(canonicalMap.entries())
        .filter(([_canonicalName, info]) => files.every((fileName) => Boolean(info.byFile[fileName])))
        .map(([canonicalName, info]) => {
          const perFileValues = files.map((fileName) => info.valuesByFile[fileName]);
          const firstValue = perFileValues[0];
          const hasSameValue = perFileValues.every((value) => value === firstValue);

          return {
            name: canonicalName,
            type: info.type,
            options: info.options,
            value: hasSameValue
              ? firstValue
              : info.type === "checkbox"
                ? false
                : ""
          } as FieldDescriptor;
        })
        .sort((left, right) => left.name.localeCompare(right.name));

      const nextFieldMap: Record<string, Record<string, string>> = {};

      for (const descriptor of commonFields) {
        const mapping = canonicalMap.get(descriptor.name);

        if (mapping) {
          nextFieldMap[descriptor.name] = mapping.byFile;
        }
      }

      setFields(commonFields);
      setAllModeFieldMap(nextFieldMap);
      setFieldValues(createInitialValues(commonFields));

      if (commonFields.length === 0) {
        setEditorError("No common fillable fields were found across all forms.");
      }
    } catch {
      setFields([]);
      setAllModeFieldMap({});
      setFieldValues({});
      setEditorError("Could not load common fields for all forms.");
    } finally {
      setIsLoadingFields(false);
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditorMode("single");
    setIsSaving(false);
    setAllModeFieldMap({});
    setEditorError("");
    setSaveMessage("");
  };

  const clearFields = () => {
    setFieldValues(createClearedValues(fields));
    setSaveMessage("");
  };

  const applyChanges = async () => {
    if (editorMode === "single" && !selectedFile) {
      return;
    }

    setIsSaving(true);
    setEditorError("");
    setSaveMessage("");

    try {
      if (editorMode === "all") {
        for (const fileName of files) {
          const valuesForFile: Record<string, string | boolean> = {};

          for (const descriptor of fields) {
            const rawFieldName = allModeFieldMap[descriptor.name]?.[fileName];

            if (!rawFieldName) {
              continue;
            }

            valuesForFile[rawFieldName] = fieldValues[descriptor.name] ?? "";
          }

          const response = await fetch(`/api/pdfs/${encodeURIComponent(fileName)}/save`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ values: valuesForFile })
          });

          if (!response.ok) {
            const payload = (await response.json()) as { error?: string };
            setEditorError(payload.error ?? `Could not apply changes to ${getFileDisplayName(fileName)}.`);
            return;
          }
        }
      } else {
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
      }

      setViewerVersion(Date.now());

      setSaveMessage(
        editorMode === "all"
          ? "Saved to all forms. The viewer now shows your updated form. Use the viewer download button to save to Desktop."
          : "Saved. The viewer now shows your updated form. Use the viewer download button to save to Desktop."
      );
      setIsEditorOpen(false);
    } catch {
      setEditorError(
        editorMode === "all" ? "Could not apply changes to all forms." : "Could not apply changes to PDF."
      );
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
          <button
            type="button"
            className="editButton"
            onClick={openAllEditor}
            disabled={files.length === 0}
          >
            Edit All Forms
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
            <h3 id="editorTitle">{editorMode === "all" ? "Edit Common Fields" : "Edit Form Fields"}</h3>
            <p className="editorSubtitle">
              {editorMode === "all" ? "All Forms (common fields only)" : getFileDisplayName(selectedFile)}
            </p>

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
                    const label = field.label ?? getReadableFieldName(field.name);

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

                  {shouldShowCharityDependents ? (
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