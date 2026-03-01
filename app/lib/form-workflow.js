export const US_STATES = [
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

export function todayDateString() {
  const current = new Date();
  const month = pad2(current.getMonth() + 1);
  const day = pad2(current.getDate());
  const year = String(current.getFullYear());
  return `${month}/${day}/${year}`;
}

export function addYearsToDateString(value, years) {
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

export function formatDateInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatPhoneInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 10);

  if (digits.length < 4) {
    return digits;
  }

  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatSsnInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 9);

  if (digits.length < 4) {
    return digits;
  }

  if (digits.length < 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function splitAddressAndCity(value) {
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

export function combineAddressParts(address, city, state, zip) {
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

export function buildDisplayName(lastName, firstName, middleInitial) {
  const last = String(lastName ?? "").trim();
  const first = String(firstName ?? "").trim();
  const middle = String(middleInitial ?? "").trim();

  const firstBlock = [first, middle].filter(Boolean).join(" ").trim();

  if (last && firstBlock) {
    return `${last}, ${firstBlock}`;
  }

  return last || firstBlock;
}

export function parseDisplayName(value) {
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
