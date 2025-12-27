export type Role = "user" | "group" | "other";
export type PermKey = "r" | "w" | "x";

export type State = {
  user: Record<PermKey, boolean>;
  group: Record<PermKey, boolean>;
  other: Record<PermKey, boolean>;
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
};

export function stateToOctal(state: State) {
  const special =
    (state.setuid ? 4 : 0) +
    (state.setgid ? 2 : 0) +
    (state.sticky ? 1 : 0);
  const roles: Role[] = ["user", "group", "other"];
  const digits = roles.map((role) => {
    const r = state[role].r ? 4 : 0;
    const w = state[role].w ? 2 : 0;
    const x = state[role].x ? 1 : 0;
    return r + w + x;
  });
  const octal = `${special}${digits.join("")}`;
  return octal.replace(/^0+/, "") || "0";
}

export function stateToSymbolic(state: State) {
  const parts: string[] = [];
  const roles: Role[] = ["user", "group", "other"];
  roles.forEach((role, idx) => {
    const r = state[role].r ? "r" : "-";
    const w = state[role].w ? "w" : "-";
    let x = state[role].x ? "x" : "-";
    if (idx === 0 && state.setuid) x = state[role].x ? "s" : "S";
    if (idx === 1 && state.setgid) x = state[role].x ? "s" : "S";
    if (idx === 2 && state.sticky) x = state[role].x ? "t" : "T";
    parts.push(`${r}${w}${x}`);
  });
  return parts.join("");
}

export function octalToState(input: string): State | null {
  const clean = input.trim();
  const match = clean.match(/^[0-7]{3,4}$/);
  if (!match) return null;
  const padded = clean.length === 3 ? `0${clean}` : clean;
  const [s, u, g, o] = padded.split("").map((d) => parseInt(d, 10));
  const toPerms = (digit: number) => ({
    r: !!(digit & 4),
    w: !!(digit & 2),
    x: !!(digit & 1),
  });
  return {
    user: toPerms(u),
    group: toPerms(g),
    other: toPerms(o),
    setuid: !!(s & 4),
    setgid: !!(s & 2),
    sticky: !!(s & 1),
  };
}
