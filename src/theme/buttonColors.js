import { THEME } from '../config/homeproConfig';

export const BUTTON_COLORS = {
    primary: {
        background: THEME.primary,
        hover: THEME.primaryDark,
        text: '#ffffff',
    },
    secondary: {
        background: '#f0f0f0',
        hover: '#dddddd',
        text: '#333333',
    },
    accent: {
        background: THEME.accent,
        hover: '#D97706',
        text: '#ffffff',
    },
    outline: {
        background: 'transparent',
        border: THEME.primary,
        text: THEME.primary,
    },
    danger: {
        background: THEME.danger,
        hover: '#DC2626',
        text: '#ffffff',
    },
    disabled: {
        background: '#e0e0e0',
        text: '#999999',
    },
};
