import { test, expect } from "@playwright/test";
import { octalToState, stateToOctal, stateToSymbolic, type State } from "../app/(tools)/chmod-calculator/chmod";

test("stateToOctal returns expected 3-digit value", () => {
  const state: State = {
    user: { r: true, w: true, x: true },
    group: { r: true, w: false, x: true },
    other: { r: true, w: false, x: true },
    setuid: false,
    setgid: false,
    sticky: false,
  };
  expect(stateToOctal(state)).toBe("755");
});

test("stateToSymbolic reflects special bits", () => {
  const state: State = {
    user: { r: true, w: true, x: true },
    group: { r: true, w: false, x: true },
    other: { r: true, w: false, x: true },
    setuid: true,
    setgid: false,
    sticky: false,
  };
  expect(stateToSymbolic(state)).toBe("rwsr-xr-x");
});

test("octalToState parses 3-digit input", () => {
  const state = octalToState("640");
  expect(state).not.toBeNull();
  expect(state?.user).toEqual({ r: true, w: true, x: false });
  expect(state?.group).toEqual({ r: true, w: false, x: false });
  expect(state?.other).toEqual({ r: false, w: false, x: false });
  expect(state?.setuid).toBe(false);
  expect(state?.setgid).toBe(false);
  expect(state?.sticky).toBe(false);
});
