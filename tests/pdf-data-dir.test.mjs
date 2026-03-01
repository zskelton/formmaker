import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getPdfDataDir } from "../app/lib/pdf-data-dir.ts";

function makeTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "formmaker-test-"));
}

test("getPdfDataDir respects FORMMAKER_DATA_DIR override when it exists", () => {
  const tempRoot = makeTempProject();
  const overrideDir = path.join(tempRoot, "override-data");
  fs.mkdirSync(overrideDir, { recursive: true });

  const previousOverride = process.env.FORMMAKER_DATA_DIR;
  process.env.FORMMAKER_DATA_DIR = overrideDir;

  try {
    assert.equal(getPdfDataDir(), overrideDir);
  } finally {
    if (previousOverride === undefined) {
      delete process.env.FORMMAKER_DATA_DIR;
    } else {
      process.env.FORMMAKER_DATA_DIR = previousOverride;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("getPdfDataDir prefers app/data under current working directory", () => {
  const tempRoot = makeTempProject();
  const appData = path.join(tempRoot, "app", "data");
  const plainData = path.join(tempRoot, "data");
  fs.mkdirSync(appData, { recursive: true });
  fs.mkdirSync(plainData, { recursive: true });

  const previousCwd = process.cwd();
  const previousOverride = process.env.FORMMAKER_DATA_DIR;
  delete process.env.FORMMAKER_DATA_DIR;

  try {
    process.chdir(tempRoot);
    assert.equal(getPdfDataDir(), appData);
  } finally {
    process.chdir(previousCwd);
    if (previousOverride === undefined) {
      delete process.env.FORMMAKER_DATA_DIR;
    } else {
      process.env.FORMMAKER_DATA_DIR = previousOverride;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("getPdfDataDir falls back to data when app/data is missing", () => {
  const tempRoot = makeTempProject();
  const plainData = path.join(tempRoot, "data");
  fs.mkdirSync(plainData, { recursive: true });

  const previousCwd = process.cwd();
  const previousOverride = process.env.FORMMAKER_DATA_DIR;
  delete process.env.FORMMAKER_DATA_DIR;

  try {
    process.chdir(tempRoot);
    assert.equal(getPdfDataDir(), plainData);
  } finally {
    process.chdir(previousCwd);
    if (previousOverride === undefined) {
      delete process.env.FORMMAKER_DATA_DIR;
    } else {
      process.env.FORMMAKER_DATA_DIR = previousOverride;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
