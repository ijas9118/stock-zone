// The ONLY accent family used across the admin dashboard — a single
// dark-to-light purple/magenta ramp. No other hues (no blue, no semantic
// red/amber/green) are used for charts, icons, or badges in this area, per
// explicit design direction: one palette, used consistently everywhere.
export const ACCENT = {
  900: "#441D49", // darkest
  700: "#7A3483",
  500: "#A346AF",
  300: "#C78AD0",
  100: "#DDB6E2", // lightest
} as const;

// Ordered darkest -> lightest, for rank-based shading (e.g. top-5 bars,
// where rank 1 gets the darkest/most prominent shade).
export const ACCENT_RAMP = [
  ACCENT[900],
  ACCENT[700],
  ACCENT[500],
  ACCENT[300],
  ACCENT[100],
] as const;
