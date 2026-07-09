import type { ConditionsSeverity } from "../types";

// Status palette per the design system's fixed status roles (never reused for
// categorical series). Color is always paired with a symbol + text label so
// severity is never conveyed by hue alone. This describes current weather /
// avalanche conditions — it is NOT a go/no-go or safety verdict.
export const SEVERITY_META: Record<ConditionsSeverity, { label: string; color: string; darkColor: string; symbol: string }> = {
  calm: { label: "Calm conditions", color: "#0ca30c", darkColor: "#0ca30c", symbol: "✓" },
  elevated: { label: "Elevated conditions", color: "#fab219", darkColor: "#fab219", symbol: "!" },
  severe: { label: "Severe conditions", color: "#d03b3b", darkColor: "#e66767", symbol: "✕" },
  unknown: { label: "Conditions unknown", color: "#6b6b68", darkColor: "#9a9990", symbol: "?" },
};
