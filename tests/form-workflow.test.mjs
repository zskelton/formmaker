import test from "node:test";
import assert from "node:assert/strict";
import {
  addYearsToDateString,
  buildDisplayName,
  combineAddressParts,
  formatDateInput,
  formatPhoneInput,
  formatSsnInput,
  parseDisplayName,
  splitAddressAndCity
} from "../app/lib/form-workflow.js";

test("formatDateInput applies mm/dd/yyyy formatting from raw digits", () => {
  assert.equal(formatDateInput("01022026"), "01/02/2026");
  assert.equal(formatDateInput("0102"), "01/02");
  assert.equal(formatDateInput("01-02-2026abc"), "01/02/2026");
});

test("formatPhoneInput applies US phone formatting", () => {
  assert.equal(formatPhoneInput("5155551212"), "(515) 555-1212");
  assert.equal(formatPhoneInput("515555"), "(515) 555");
  assert.equal(formatPhoneInput("51"), "51");
});

test("formatSsnInput applies ###-##-#### formatting", () => {
  assert.equal(formatSsnInput("123456789"), "123-45-6789");
  assert.equal(formatSsnInput("12345"), "123-45");
  assert.equal(formatSsnInput("123"), "123");
});

test("addYearsToDateString increments valid dates and keeps invalid input", () => {
  assert.equal(addYearsToDateString("02/29/2024", 1), "03/01/2025");
  assert.equal(addYearsToDateString("invalid-date", 1), "invalid-date");
});

test("address helpers split and combine in expected format", () => {
  assert.deepEqual(splitAddressAndCity("123 Main St, Ames"), {
    address: "123 Main St",
    city: "Ames"
  });

  assert.equal(
    combineAddressParts("123 Main St", "Ames", "IA", "50010"),
    "123 Main St, Ames, IA 50010"
  );
});

test("display name helpers are reversible for expected patterns", () => {
  const merged = buildDisplayName("Doe", "Jane", "A");
  assert.equal(merged, "Doe, Jane A");

  assert.deepEqual(parseDisplayName(merged), {
    lastName: "Doe",
    firstName: "Jane",
    middleInitial: "A"
  });

  assert.deepEqual(parseDisplayName("Jane Ann Doe"), {
    lastName: "Doe",
    firstName: "Jane",
    middleInitial: "Ann"
  });
});
