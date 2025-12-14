/**
 * Premium, minimalist theme inspired by Swiss design principles.
 * Clean, cohesive color palette with elegant typography.
 */

import { Platform } from 'react-native';

// Premium color palette - warm neutrals with subtle accent
const palette = {
  // Neutrals
  white: '#FFFFFF',
  ivory: '#FAFAF8',
  cream: '#F5F5F3',
  stone: '#E8E6E3',
  warmGray: '#A8A5A0',
  charcoal: '#4A4845',
  graphite: '#2C2A28',
  midnight: '#1A1918',
  black: '#0D0D0C',

  // Accent - subtle warm tone
  accent: '#8B7355',
  accentLight: '#B09A7C',
  accentMuted: 'rgba(139, 115, 85, 0.1)',

  // Semantic
  error: '#C75050',
  errorMuted: 'rgba(199, 80, 80, 0.1)',
  success: '#5A8B6E',
  successMuted: 'rgba(90, 139, 110, 0.1)',
};

export const Colors = {
  light: {
    text: palette.graphite,
    textSecondary: palette.warmGray,
    textMuted: palette.warmGray,
    background: palette.ivory,
    backgroundSecondary: palette.cream,
    surface: palette.white,
    surfaceElevated: palette.white,
    border: palette.stone,
    borderLight: 'rgba(0, 0, 0, 0.06)',
    tint: palette.accent,
    icon: palette.warmGray,
    tabIconDefault: palette.warmGray,
    tabIconSelected: palette.graphite,
    accent: palette.accent,
    accentMuted: palette.accentMuted,
    error: palette.error,
    errorMuted: palette.errorMuted,
    success: palette.success,
    successMuted: palette.successMuted,
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  dark: {
    text: palette.cream,
    textSecondary: palette.warmGray,
    textMuted: palette.warmGray,
    background: palette.midnight,
    backgroundSecondary: palette.graphite,
    surface: palette.graphite,
    surfaceElevated: palette.charcoal,
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.06)',
    tint: palette.accentLight,
    icon: palette.warmGray,
    tabIconDefault: palette.warmGray,
    tabIconSelected: palette.cream,
    accent: palette.accentLight,
    accentMuted: 'rgba(176, 154, 124, 0.15)',
    error: palette.error,
    errorMuted: 'rgba(199, 80, 80, 0.15)',
    success: palette.success,
    successMuted: 'rgba(90, 139, 110, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.6)',
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

// Spacing scale (4px base)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border radius scale
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Typography scale
export const Typography = {
  hero: {
    fontSize: 40,
    fontWeight: '300' as const,
    lineHeight: 48,
    letterSpacing: -1,
  },
  title: {
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  captionSemibold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
};

// Shadow styles
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
};
