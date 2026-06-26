import { Platform } from "react-native";

export const Colors = {
  primary: "#5B9D99",
  primaryDark: "#3E7773",
  primarySoft: "#8BBCB9",
  primaryBorder: "#B7D2CF",
  primaryLight: "#EDF7F6",
  chipBg: "#F2FBF9",

  background: "#F7F9FB",
  backgroundCool: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",

  text: "#223046",
  textSub: "#3D4B63",
  muted: "#657084",
  darkText: "#172238",
  darkSub: "#D7E3EA",

  success: "#2E7D32",
  successLight: "#E8F5E9",
  warning: "#E65100",
  warningLight: "#FFF3E0",
  error: "#C62828",
  errorLight: "#FFEBEE",

  pro: "#7C3AED",
  proLight: "#F3E8FF",

  white: "#FFFFFF",

  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",

  chart: {
    식비: "#5B9D99",
    카페: "#C49A6C",
    쇼핑: "#8E7DBE",
    교통: "#6F8FB8",
    생활: "#7FA58D",
    의료: "#C97F7F",
    기타: "#7B8798",
  },

  light: {
    text: "#223046",
    background: "#F7F9FB",
    tint: "#5B9D99",
    icon: "#657084",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: "#5B9D99",
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: "#8BBCB9",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#8BBCB9",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const TAB_BAR_SPACE = 130;

export const CATEGORY_COLORS: Record<string, string> = {
  식비: "#5B9D99",
  카페: "#C49A6C",
  쇼핑: "#8E7DBE",
  교통: "#6F8FB8",
  생활: "#7FA58D",
  의료: "#C97F7F",
  기타: "#7B8798",
};
