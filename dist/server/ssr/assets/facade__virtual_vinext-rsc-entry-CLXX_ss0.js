import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import React__default, { useState, useMemo, createElement } from "react";
import { u as usePathname, g as getLayoutSegmentContext } from "../index.js";
import "../__vite_rsc_assets_manifest.js";
import "react-dom";
import "react-dom/server.edge";
import "node:async_hooks";
function toReadableLabel(fieldName) {
  const corrected = fieldName.replace(/Gaurdian/gi, "Guardian").replace(/Addres$/i, "Address");
  const withSpaces = corrected.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Za-z])(\d)/g, "$1 $2").replace(/(\d)([A-Za-z])/g, "$1 $2").replace(/\s+/g, " ").trim();
  return withSpaces.replace(/\bDob\b/g, "DOB").replace(/\bSsn\b/g, "SSN").replace(/\bZip\b/g, "ZIP").replace(/\bId\b/g, "ID");
}
function buildTextModule(fieldNames) {
  return fieldNames.map((name) => ({
    name,
    label: toReadableLabel(name),
    type: "text"
  }));
}
const FORM_FIELD_MODULES = {
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
function getModuleFieldsForFile(fileName) {
  return FORM_FIELD_MODULES[fileName.toLowerCase()] ?? [];
}
function getReadableFieldName(fieldName) {
  return toReadableLabel(fieldName);
}
const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY"
];
function pad2(value) {
  return String(value).padStart(2, "0");
}
function todayDateString() {
  const current = /* @__PURE__ */ new Date();
  const month = pad2(current.getMonth() + 1);
  const day = pad2(current.getDate());
  const year = String(current.getFullYear());
  return `${month}/${day}/${year}`;
}
function addYearsToDateString(value, years) {
  const parts = String(value).split("/");
  if (parts.length !== 3) {
    return value;
  }
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const year = Number(parts[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) {
    return value;
  }
  const nextDate = new Date(year + years, month - 1, day);
  const nextMonth = pad2(nextDate.getMonth() + 1);
  const nextDay = pad2(nextDate.getDate());
  return `${nextMonth}/${nextDay}/${nextDate.getFullYear()}`;
}
function formatDateInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
function formatPhoneInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) {
    return digits;
  }
  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
function formatSsnInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 9);
  if (digits.length < 4) {
    return digits;
  }
  if (digits.length < 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
function splitAddressAndCity(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return { address: "", city: "" };
  }
  const commaIndex = text.lastIndexOf(",");
  if (commaIndex === -1) {
    return { address: text, city: "" };
  }
  return {
    address: text.slice(0, commaIndex).trim(),
    city: text.slice(commaIndex + 1).trim()
  };
}
function combineAddressParts(address, city, state, zip) {
  const addressPart = String(address ?? "").trim();
  const cityPart = String(city ?? "").trim();
  const statePart = String(state ?? "").trim();
  const zipPart = String(zip ?? "").trim();
  const first = [addressPart, cityPart].filter(Boolean).join(", ");
  const second = [statePart, zipPart].filter(Boolean).join(" ");
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }
  return `${first}, ${second}`;
}
function buildDisplayName(lastName, firstName, middleInitial) {
  const last = String(lastName ?? "").trim();
  const first = String(firstName ?? "").trim();
  const middle = String(middleInitial ?? "").trim();
  const firstBlock = [first, middle].filter(Boolean).join(" ").trim();
  if (last && firstBlock) {
    return `${last}, ${firstBlock}`;
  }
  return last || firstBlock;
}
function parseDisplayName(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return { lastName: "", firstName: "", middleInitial: "" };
  }
  if (text.includes(",")) {
    const [lastRaw, restRaw] = text.split(",", 2);
    const restParts = restRaw.trim().split(/\s+/).filter(Boolean);
    return {
      lastName: lastRaw.trim(),
      firstName: restParts[0] ?? "",
      middleInitial: restParts.slice(1).join(" ")
    };
  }
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { lastName: parts[0], firstName: "", middleInitial: "" };
  }
  return {
    lastName: parts[parts.length - 1],
    firstName: parts[0],
    middleInitial: parts.slice(1, -1).join(" ")
  };
}
const CSN_REVOKE_ADDRESS_DEFAULT = "126 S. Kellogg, Suite 001, Ames, IA 50010";
const CSN_HIDDEN_FIELDS = /* @__PURE__ */ new Set([
  "EntitiesException",
  "EntitiesAddition",
  "RevocationAddress",
  "RevocationCopySent",
  "CopyToGaurdianDate",
  "CopyToGuardianAddress"
]);
const ALL_FORM_DESCRIPTORS = [
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
function getFileDisplayName(file) {
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
function getFormKey(fileName) {
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
function getDependentFieldMeta(fieldName) {
  const match = fieldName.match(/^Dep([1-5])(Name|Relationship|DOB|SSN)$/i);
  if (!match) {
    return null;
  }
  const index = Number(match[1]);
  const rawPart = match[2].toUpperCase();
  const part = rawPart === "DOB" ? "DOB" : rawPart === "SSN" ? "SSN" : rawPart === "RELATIONSHIP" ? "Relationship" : "Name";
  return { index, part };
}
function normalizeFieldName(fieldName) {
  return fieldName.toLowerCase().replace(/gaurdian/g, "guardian").replace(/addres$/g, "address").replace(/[^a-z0-9]/g, "");
}
function splitCityState(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return { city: "", state: "" };
  }
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      city: parts.slice(0, -1).join(", "),
      state: parts[parts.length - 1] ?? ""
    };
  }
  return {
    city: "",
    state: text
  };
}
function mergeCityState(city, state) {
  const cityText = String(city ?? "").trim();
  const stateText = String(state ?? "").trim();
  if (cityText && stateText) {
    return `${cityText}, ${stateText}`;
  }
  return cityText || stateText;
}
async function loadFieldsForFile(fileName) {
  const response = await fetch(`/api/pdfs/${encodeURIComponent(fileName)}/fields`);
  const payload = await response.json();
  const apiFields = payload.fields ?? [];
  const fallbackFields = getModuleFieldsForFile(fileName);
  if (!response.ok) {
    return fallbackFields;
  }
  return apiFields.length > 0 ? apiFields : fallbackFields;
}
function PdfBrowser({ files }) {
  const [selectedFile, setSelectedFile] = useState(files[0] ?? "");
  const [viewerVersion, setViewerVersion] = useState(0);
  const [editorMode, setEditorMode] = useState("single");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [visibleDependents, setVisibleDependents] = useState(0);
  const [fields, setFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
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
  useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const field of fields) {
      map.set(field.name, field);
    }
    return map;
  }, [fields]);
  const createInitialValues = (descriptors) => {
    const nextValues = {};
    for (const descriptor of descriptors) {
      if (descriptor.value !== void 0) {
        nextValues[descriptor.name] = descriptor.value;
      } else {
        nextValues[descriptor.name] = descriptor.type === "checkbox" ? false : "";
      }
    }
    return nextValues;
  };
  const createClearedValues = (descriptors) => {
    const nextValues = {};
    for (const descriptor of descriptors) {
      nextValues[descriptor.name] = descriptor.type === "checkbox" ? false : "";
    }
    return nextValues;
  };
  const normalizeInputValue = (fieldName, value) => {
    if (typeof value !== "string") {
      return value;
    }
    const dateFields = /* @__PURE__ */ new Set([
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
  const updateFieldValue = (fieldName, value) => {
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
        const parsedCityState = splitCityState(String(nextValues.ClientState ?? ""));
        nextValues.ClientAddress = address;
        nextValues.ClientCity = parsedCityState.city || city;
        nextValues.ClientState = parsedCityState.state;
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
        files.map(async (fileName) => [fileName, await loadFieldsForFile(fileName)])
      );
      const byFile = Object.fromEntries(byFileEntries);
      const getValue = (fileKey, fieldName) => {
        const target = files.find((fileName) => getFormKey(fileName) === fileKey);
        if (!target) {
          return "";
        }
        const match = byFile[target].find((field) => normalizeFieldName(field.name) === normalizeFieldName(fieldName));
        return typeof match?.value === "boolean" ? match.value ? "true" : "false" : String(match?.value ?? "");
      };
      const charityLast = getValue("charity", "ClientLastName");
      const charityFirst = getValue("charity", "ClientFirstName");
      const charityMiddle = getValue("charity", "ClientMiddleInit");
      const fallbackParsedName = parseDisplayName(getValue("csn", "ClientName") || getValue("story", "ClientName"));
      const charityAddressRaw = getValue("charity", "ClientAddress");
      const splitAddress = splitAddressAndCity(charityAddressRaw);
      const parsedCityState = splitCityState(getValue("charity", "ClientState"));
      const signedDateSeed = getValue("charity", "ClientSignedDate") || getValue("csn", "SignedDate") || getValue("story", "SignedDate") || todayDateString();
      const allValues = {
        allLastName: charityLast || fallbackParsedName.lastName,
        allFirstName: charityFirst || fallbackParsedName.firstName,
        allMiddleInit: charityMiddle || fallbackParsedName.middleInitial,
        allAddress: splitAddress.address,
        allCity: parsedCityState.city || splitAddress.city,
        allState: parsedCityState.state,
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
        const csnValues = {
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
        const charityValues = {
          ClientLastName: parsedName.lastName,
          ClientFirstName: parsedName.firstName,
          ClientMiddleInit: parsedName.middleInitial,
          ClientAddress: String(fieldValues.allAddress ?? ""),
          ClientState: mergeCityState(String(fieldValues.allCity ?? ""), String(fieldValues.allState ?? "")),
          ClientZip: String(fieldValues.allZip ?? ""),
          ClientDOB: formatDateInput(String(fieldValues.allClientDOB ?? "")),
          ClientPhone: formatPhoneInput(String(fieldValues.allClientPhone ?? "")),
          ClientSSN: formatSsnInput(String(fieldValues.allClientSSN ?? "")),
          ClientSignedDate: signedDate,
          AgencySignedDate: signedDate
        };
        const storyValues = {
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
            const payload = await response.json();
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
        const valuesToSave = {};
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
          valuesToSave.ClientAddress = String(fieldValues.ClientAddress ?? "");
          valuesToSave.ClientState = mergeCityState(
            String(fieldValues.ClientCity ?? ""),
            String(fieldValues.ClientState ?? "")
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
          const payload = await response.json();
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
  const triggerBlobDownload = (blob, fileName) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };
  const downloadWithProgress = async (url, fileName, preparingLabel) => {
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
        const chunks = [];
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
            const percentage = Math.round(receivedBytes / totalBytes * 100);
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
  const renderTextInput = (name, label, className = "editorField") => /* @__PURE__ */ jsxs("label", { className, children: [
    /* @__PURE__ */ jsx("span", { children: label }),
    /* @__PURE__ */ jsx(
      "input",
      {
        className: "editorInput",
        type: "text",
        value: typeof fieldValues[name] === "string" ? String(fieldValues[name]) : "",
        onChange: (event) => updateFieldValue(name, event.target.value)
      }
    )
  ] }, name);
  const renderStateSelect = (name, label, className = "editorField") => /* @__PURE__ */ jsxs("label", { className, children: [
    /* @__PURE__ */ jsx("span", { children: label }),
    /* @__PURE__ */ jsxs(
      "select",
      {
        className: "editorInput",
        value: typeof fieldValues[name] === "string" ? String(fieldValues[name]) : "",
        onChange: (event) => updateFieldValue(name, event.target.value),
        children: [
          /* @__PURE__ */ jsx("option", { value: "", children: "Select..." }),
          US_STATES.map((state) => /* @__PURE__ */ jsx("option", { value: state, children: state }, state))
        ]
      }
    )
  ] }, name);
  const getDependentField = (index, part) => {
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
  return /* @__PURE__ */ jsxs("div", { className: "splitLayout", children: [
    /* @__PURE__ */ jsxs("aside", { className: "leftPane", children: [
      /* @__PURE__ */ jsx("h2", { children: "Select a File:" }),
      files.length === 0 ? /* @__PURE__ */ jsx("p", { className: "emptyText", children: "No PDF files found in app/data." }) : /* @__PURE__ */ jsx("ul", { className: "fileList", children: files.map((file) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: file === selectedFile ? "fileButton active" : "fileButton",
          onClick: () => setSelectedFile(file),
          children: /* @__PURE__ */ jsxs("span", { className: "fileButtonContent", children: [
            /* @__PURE__ */ jsx("span", { className: "fileIcon", "aria-hidden": "true", children: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 24 24", className: "fileIconSvg", focusable: "false", children: [
              /* @__PURE__ */ jsx(
                "path",
                {
                  d: "M7 3.75h7.5l4.75 4.75v11.75a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 7 3.75Z",
                  className: "fileIconOutline"
                }
              ),
              /* @__PURE__ */ jsx("path", { d: "M14.5 3.75V8.5h4.75", className: "fileIconOutline" })
            ] }) }),
            /* @__PURE__ */ jsx("span", { children: getFileDisplayName(file) })
          ] })
        }
      ) }, file)) }),
      /* @__PURE__ */ jsxs("div", { className: "downloadActions", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "editButton downloadActionButton",
            onClick: () => {
              void downloadSelectedForm();
            },
            disabled: !selectedFile || isPreparingDownload,
            children: "Download"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "editButton downloadActionButton",
            onClick: () => {
              void downloadAllForms();
            },
            disabled: files.length === 0 || isPreparingDownload,
            children: "Download All"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "downloadProgressPanel", "aria-live": "polite", children: [
        /* @__PURE__ */ jsx("p", { className: "downloadProgressStatus", children: downloadStatus || "Ready to prepare print document." }),
        /* @__PURE__ */ jsx(
          "progress",
          {
            className: isPreparingDownload ? "downloadProgressTrack active" : "downloadProgressTrack",
            value: downloadProgress,
            max: 100
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "leftPaneHelp", "aria-label": "Run instructions", children: [
        /* @__PURE__ */ jsx("hr", { className: "leftPaneDivider" }),
        /* @__PURE__ */ jsx("h3", { children: "How to Use:" }),
        /* @__PURE__ */ jsxs("div", { className: "howToLines", children: [
          /* @__PURE__ */ jsx("p", { children: "1. Select a File" }),
          /* @__PURE__ */ jsxs("p", { children: [
            "2. Click ",
            /* @__PURE__ */ jsx("strong", { children: "Edit Selected" }),
            " to Open"
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            "3. Update Form and click ",
            /* @__PURE__ */ jsx("strong", { children: "Save" })
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            "4. ",
            /* @__PURE__ */ jsx("strong", { children: "Download" }),
            " Individual File"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "howToOr", children: "- or -" }),
          /* @__PURE__ */ jsxs("p", { children: [
            "4. ",
            /* @__PURE__ */ jsx("strong", { children: "Download All" }),
            " Files as One"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "rightPane", "aria-label": "PDF viewer", children: [
      /* @__PURE__ */ jsxs("div", { className: "viewerToolbarRow", children: [
        /* @__PURE__ */ jsx("button", { type: "button", className: "editButton toolbarLeft", onClick: openEditor, disabled: !selectedUrl, children: "Edit Selected" }),
        /* @__PURE__ */ jsx("button", { type: "button", className: "editButton toolbarCenter", onClick: openAllEditor, disabled: files.length === 0, children: "Edit All Forms" }),
        /* @__PURE__ */ jsx("span", { className: "toolbarSpacer", "aria-hidden": "true" })
      ] }),
      selectedUrl ? /* @__PURE__ */ jsx("iframe", { className: "pdfFrame", src: selectedUrl, title: selectedFile }, selectedUrl) : /* @__PURE__ */ jsx("p", { className: "emptyText", children: "Select a PDF file to preview it." })
    ] }),
    isEditorOpen ? /* @__PURE__ */ jsx("div", { className: "modalOverlay", role: "presentation", children: /* @__PURE__ */ jsxs("div", { className: "editorDialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "editorTitle", children: [
      /* @__PURE__ */ jsx("h3", { id: "editorTitle", children: editorMode === "all" ? "Edit All Forms" : "Edit Form Fields" }),
      /* @__PURE__ */ jsx("p", { className: "editorSubtitle", children: editorMode === "all" ? "Mapped fields across CSN, Charity Tracker, and Story County" : getFileDisplayName(selectedFile) }),
      /* @__PURE__ */ jsx("div", { className: "editorBody", children: isLoadingFields ? /* @__PURE__ */ jsx("p", { className: "emptyText", children: "Loading form fields..." }) : editorMode === "all" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "editorRow three", children: [
          renderTextInput("allLastName", "Last Name"),
          renderTextInput("allFirstName", "First Name"),
          renderTextInput("allMiddleInit", "Middle Init")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow four", children: [
          renderTextInput("allAddress", "Address"),
          renderTextInput("allCity", "City"),
          renderStateSelect("allState", "State"),
          renderTextInput("allZip", "ZIP")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("allClientNum", "CSN Number"),
          renderTextInput("allClientDOB", "Client DOB (mm/dd/yyyy)")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("allClientPhone", "Client Phone ((###) ###-####)"),
          renderTextInput("allClientSSN", "SSN (###-##-####)")
        ] }),
        /* @__PURE__ */ jsx("div", { className: "editorRow", children: renderTextInput("allSignedDate", "Signed Date (mm/dd/yyyy)") })
      ] }) : selectedFormKey === "csn" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("ClientName", "Client Name"),
          renderTextInput("ClientAddress", "Client Address")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("ClientNum", "CSN Number"),
          renderTextInput("ClientDOB", "Client DOB (mm/dd/yyyy)")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("RevokeReturnAddress", "Revoke Address"),
          renderTextInput("SignedDate", "Sign Date (mm/dd/yyyy)")
        ] })
      ] }) : selectedFormKey === "charity" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("p", { className: "formSectionLabel", children: "Client Information" }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow three", children: [
          renderTextInput("ClientLastName", "Last Name"),
          renderTextInput("ClientFirstName", "First Name"),
          renderTextInput("ClientMiddleInit", "Middle Init")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow three", children: [
          renderTextInput("ClientAddress", "Address"),
          renderTextInput("ClientCity", "City"),
          renderStateSelect("ClientState", "State")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("ClientZip", "ZIP"),
          renderTextInput("ClientDOB", "Client DOB (mm/dd/yyyy)")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("ClientPhone", "Phone ((###) ###-####)"),
          renderTextInput("ClientSSN", "SSN (###-##-####)")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("ClientSignedDate", "Client Signed Date (mm/dd/yyyy)"),
          renderTextInput("AgencySignedDate", "Agency Signed Date (mm/dd/yyyy)")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "dependentRows", children: [
          /* @__PURE__ */ jsx("div", { className: "dependentActions", children: /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "dependentAddButton",
              onClick: () => setVisibleDependents((currentCount) => Math.min(5, currentCount + 1)),
              disabled: visibleDependents >= 5,
              children: "Add Dependent"
            }
          ) }),
          dependentRows.map((row) => /* @__PURE__ */ jsx("div", { className: "dependentRow", children: ["Name", "Relationship", "DOB", "SSN"].map((part) => {
            const field = row.fields[part];
            if (!field) {
              return /* @__PURE__ */ jsx("div", {}, `dependent-${row.index}-${part}`);
            }
            return renderTextInput(field.name, part, "editorField dependentField");
          }) }, `dependent-${row.index}`))
        ] })
      ] }) : selectedFormKey === "story" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("ClientName", "Client Name"),
          renderTextInput("ClientAddres", "Client Address")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("ClientDOB", "Client DOB (mm/dd/yyyy)"),
          renderTextInput("SignedName", "Staff Singing")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("SignedDate", "Signed Date (mm/dd/yyyy)"),
          renderTextInput("ExpirationDate", "Expiration Date (mm/dd/yyyy)")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "editorRow", children: [
          renderTextInput("SignedTelephone", "Phone ((###) ###-####)"),
          /* @__PURE__ */ jsx("div", {})
        ] })
      ] }) : fields.length === 0 ? /* @__PURE__ */ jsx("p", { className: "emptyText", children: "No fillable fields were found in this PDF." }) : /* @__PURE__ */ jsx("div", { className: "fieldGrid", children: fields.map((field) => {
        const label = field.label ?? getReadableFieldName(field.name);
        const currentValue = fieldValues[field.name];
        if (field.type === "checkbox") {
          return /* @__PURE__ */ jsxs("label", { className: "editorCheckbox", children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox", checked: Boolean(currentValue), onChange: (event) => updateFieldValue(field.name, event.target.checked) }),
            /* @__PURE__ */ jsx("span", { children: label })
          ] }, field.name);
        }
        return /* @__PURE__ */ jsxs("label", { className: "editorField", children: [
          /* @__PURE__ */ jsx("span", { children: label }),
          /* @__PURE__ */ jsx(
            "input",
            {
              className: "editorInput",
              type: "text",
              value: typeof currentValue === "string" ? currentValue : "",
              onChange: (event) => updateFieldValue(field.name, event.target.value)
            }
          )
        ] }, field.name);
      }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "editorMessages", children: [
        editorError ? /* @__PURE__ */ jsx("p", { className: "editorStatus error", children: editorError }) : null,
        saveMessage ? /* @__PURE__ */ jsx("p", { className: "editorStatus success", children: saveMessage }) : null
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "editorActions", children: [
        /* @__PURE__ */ jsx("button", { type: "button", className: "editButton", onClick: applyChanges, disabled: isSaving || isLoadingFields || !!editorError, children: isSaving ? "Saving..." : "Save" }),
        /* @__PURE__ */ jsx("button", { type: "button", className: "secondaryButton", onClick: clearFields, disabled: isSaving || isLoadingFields || fields.length === 0, children: "Clear Fields" }),
        /* @__PURE__ */ jsx("button", { type: "button", className: "secondaryButton", onClick: closeEditor, disabled: isSaving, children: "Cancel" })
      ] })
    ] }) }) : null
  ] });
}
class ErrorBoundary extends React__default.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    if (error && typeof error === "object" && "digest" in error) {
      const digest = String(error.digest);
      if (digest === "NEXT_NOT_FOUND" || // legacy compat
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;") || digest.startsWith("NEXT_REDIRECT;")) {
        throw error;
      }
    }
    return { error };
  }
  reset = () => {
    this.setState({ error: null });
  };
  render() {
    if (this.state.error) {
      const FallbackComponent = this.props.fallback;
      return jsx(FallbackComponent, { error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}
class NotFoundBoundaryInner extends React__default.Component {
  constructor(props) {
    super(props);
    this.state = { notFound: false, previousPathname: props.pathname };
  }
  static getDerivedStateFromProps(props, state) {
    if (props.pathname !== state.previousPathname && state.notFound) {
      return { notFound: false, previousPathname: props.pathname };
    }
    return { notFound: state.notFound, previousPathname: props.pathname };
  }
  static getDerivedStateFromError(error) {
    if (error && typeof error === "object" && "digest" in error) {
      const digest = String(error.digest);
      if (digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) {
        return { notFound: true };
      }
    }
    throw error;
  }
  render() {
    if (this.state.notFound) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
function NotFoundBoundary({ fallback, children }) {
  const pathname = usePathname();
  return jsx(NotFoundBoundaryInner, { pathname, fallback, children });
}
function LayoutSegmentProvider({ depth, children }) {
  const ctx = getLayoutSegmentContext();
  if (!ctx) {
    return children;
  }
  return createElement(ctx.Provider, { value: depth }, children);
}
const export_f1cda7d4d39d = {
  default: PdfBrowser
};
const export_f29e6e234fea = {
  ErrorBoundary,
  NotFoundBoundary
};
const export_0deffcb8ffd7 = {
  LayoutSegmentProvider
};
export {
  export_0deffcb8ffd7,
  export_f1cda7d4d39d,
  export_f29e6e234fea
};
