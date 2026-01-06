export const getScanDifficulty = (length: number, level: "L" | "M" | "Q" | "H") => {
  if (!length) return { label: "--", tone: "text-slate-500", badge: "bg-slate-100 text-slate-600" };
  const multiplier = { L: 1, M: 1.15, Q: 1.35, H: 1.6 }[level];
  const score = length * multiplier;
  if (score <= 300) return { label: "Easy", tone: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700" };
  if (score <= 900) return { label: "Medium", tone: "text-amber-600", badge: "bg-amber-50 text-amber-700" };
  return { label: "Hard", tone: "text-rose-600", badge: "bg-rose-50 text-rose-700" };
};
