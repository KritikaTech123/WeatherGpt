/**
 * Semantic design tokens for the mobile app.
 *
 * Warm, trustworthy field companion palette. Earthy, grounded, yet vibrant enough
 * to feel rewarding.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#2D3A31',
    tint: '#2D7A4D',

    // Core surfaces
    background: '#FAF8F5',
    foreground: '#2A3B32',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#2A3B32',

    // Primary action color (buttons, links, active states)
    primary: '#2D7A4D',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#EBF1E9',
    secondaryForeground: '#255033',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#F0EFEA',
    mutedForeground: '#768579',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#E68A5C', // Terracotta for warmth and attention
    accentForeground: '#FFFFFF',

    // Destructive actions (delete, error states)
    destructive: '#C95C4B',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#E1E3DF',
    input: '#E1E3DF',

    // Product-specific semantic colors
    sun: '#E39C45',
    sky: '#C2E0DD',
    skyStrong: '#76B5B3',
    leaf: '#5D9C68',
    leafDark: '#2C5A38',
    rain: '#5C90B3',
    mapLand: '#EBE5D9',
    mapField: '#D1E0C5',
    mapWater: '#C2E0DD',
    warmSurface: '#FDF7EB',
    warmBorder: '#E6C687',
    coral: '#E68A5C',
  },

  // Rounded, friendly, tactile radius
  radius: 16,
};

export default colors;
