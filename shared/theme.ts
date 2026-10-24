export const colors = {
  canvas: "#F4F3EE",
  surface: "#FFFFFF",
  ink: "#13211B",
  secondary: "#4B5A52",
  muted: "#62706A",
  line: "#D9DDD5",
  border: "#7A8780",
  forest: "#1E4D3A",
  dark: "#0E2A1F",
  lime: "#D4F36B",
  critical: "#B3261E",
  warning: "#8A5300",
  warningFill: "#F6E3B8",
  grounded: "#1D5C86",
  offline: "#55626B",
} as const;
export const theme = {
  colors,
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 14, lg: 24, pill: 999 },
  motion: { fast: 120, base: 220, slow: 480 },
};
