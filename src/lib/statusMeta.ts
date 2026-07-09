import type { ReconciledStatus } from "../types";

// Status palette per the design system's fixed status roles (never reused
// for categorical series). Color is always paired with a symbol + text
// label so status is never conveyed by hue alone.
export const STATUS_META: Record<ReconciledStatus, { label: string; color: string; darkColor: string; symbol: string }> = {
  clear: { label: "Clear", color: "#0ca30c", darkColor: "#0ca30c", symbol: "✓" },
  caution: { label: "Caution", color: "#fab219", darkColor: "#fab219", symbol: "!" },
  hazard: { label: "Hazard", color: "#d03b3b", darkColor: "#e66767", symbol: "✕" },
  unconfirmed: { label: "Unconfirmed", color: "#6b6b68", darkColor: "#9a9990", symbol: "?" },
};
