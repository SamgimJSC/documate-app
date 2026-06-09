import { Platform } from 'react-native';

export const Colors = {
  primary: '#1565C0',
  primaryLight: '#E3F2FD',
  primaryDark: '#0D3B6B',
  accent: '#1E88E5',

  pro: '#7B1FA2',
  proLight: '#F3E5F5',

  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#E65100',
  warningLight: '#FFF3E0',
  error: '#C62828',
  errorLight: '#FFEBEE',

  white: '#FFFFFF',
  background: '#F0F7FF',

  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  light: {
    text: '#111827',
    background: '#F0F7FF',
    tint: '#1565C0',
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#1565C0',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#90CAF9',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#90CAF9',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
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

// 바텀탭 바 높이만큼 콘텐츠 하단에 줄 여백
export const TAB_BAR_SPACE = 130;