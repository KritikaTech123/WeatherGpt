/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#173126',
    tint: '#2F855A',

    // Core surfaces
    background: '#F8FBF5',
    foreground: '#173126',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#173126',

    // Primary action color (buttons, links, active states)
    primary: '#2F855A',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E8F2E4',
    secondaryForeground: '#24513A',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EFF5EC',
    mutedForeground: '#6D8272',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#FFF1C7',
    accentForeground: '#7A5713',

    // Destructive actions (delete, error states)
    destructive: '#C95C4B',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#DCE9D8',
    input: '#D1E1CC',

    // Product-specific semantic colors
    sun: '#F7C948',
    sky: '#DDF3F1',
    skyStrong: '#78C9C4',
    leaf: '#7DBA68',
    leafDark: '#24513A',
    rain: '#5D9BC4',
    mapLand: '#DCEBD5',
    mapField: '#BDD9AA',
    mapWater: '#B9E2E4',
    warmSurface: '#FFF8E6',
    warmBorder: '#F4D98E',
    coral: '#E58565',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
