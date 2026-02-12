// fontSize.js (웹 전용)
export const isIOS = () =>
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

export const getFontSize = (size) => {
    return isIOS() ? size + 1.5 : size;
};

export const getFontSizeEx = (size) => {
    return isIOS() ? size + 2.5 : size;
};

export const FONT_SIZES = {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 20,
    xl: 24,
};
