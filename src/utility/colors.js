import { THEME } from '../config/homeproConfig';

export const COLORS = {
    MAINCOLOR: THEME.primary,
    BLUEHIGHTLIGHTCOLOR: '#05aeff',
    BLACKCOLOR: '#131313',
    primary: THEME.primary,
    primaryLight: THEME.primaryLight,
    primaryDark: THEME.primaryDark,
    accent: THEME.accent,
    secondary: '#43A047',
    success: THEME.success,
    text: THEME.text,
    textLight: THEME.textLight,
    danger: THEME.danger,
    muted: THEME.muted,
    background: THEME.background,
    surface: THEME.surface,
    border: THEME.border,
};

export const withAlpha = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
