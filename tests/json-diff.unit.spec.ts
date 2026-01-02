import { expect, test } from "@playwright/test";
import { buildDiffOptions, diffJson, type WorkerDiffOptions } from "../lib/diff";

const defaultOptions: WorkerDiffOptions = {
  ignoreCase: false,
  ignoreNullVsMissing: false,
  ignoreEmptyStrings: false,
  ignoreEmptyContainers: false,
  arrayDiffMode: "index",
  arrayKey: "id",
  ignorePathsPattern: "",
  ignoreKeys: [],
  allowTopLevelArrays: true,
};

const makeOptions = (overrides: Partial<WorkerDiffOptions> = {}) =>
  buildDiffOptions({ ...defaultOptions, ...overrides });

test("diffJson: arrays diff by index", () => {
  const diff = diffJson([1, 2, 3], [1, 4, 3], makeOptions());
  const changed = diff.filter((entry) => entry.type === "changed");
  expect(changed).toHaveLength(1);
  expect(changed[0].path).toBe("[1]");
});

test("diffJson: ignore null vs missing", () => {
  const diff = diffJson(
    { a: null },
    {},
    makeOptions({ ignoreNullVsMissing: true }),
  );
  const removed = diff.filter((entry) => entry.type === "removed");
  const changed = diff.filter((entry) => entry.type === "changed");
  expect(removed).toHaveLength(0);
  expect(changed).toHaveLength(0);
});

test("diffJson: dot keys are preserved in paths", () => {
  const diff = diffJson(
    { "a.b": 1 },
    { "a.b": 2 },
    makeOptions(),
  );
  const changed = diff.find((entry) => entry.type === "changed");
  expect(changed?.path).toBe("[\"a.b\"]");
});

test("diffJson: nested objects produce nested paths", () => {
  const diff = diffJson(
    { user: { profile: { age: 30 } } },
    { user: { profile: { age: 31 } } },
    makeOptions(),
  );
  const changed = diff.find((entry) => entry.type === "changed");
  expect(changed?.path).toBe("user.profile.age");
});
