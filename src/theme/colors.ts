export const colors = {
  /**
   * Neutral / gray scale – roughly aligned with Tailwind/shadcn zinc,
   * so we get predictable steps for canvas, borders, dividers, etc.
   */
  gray50: '#FAFAFA',
  gray100: '#F5F5F4',
  gray200: '#E7E5E4',
  gray300: '#D4D4D8',
  gray400: '#A1A1AA',
  gray500: '#71717A',
  gray600: '#52525B',
  gray700: '#3F3F46',
  gray800: '#27272A',
  gray900: '#18181B',

  /**
   * Pine / primary scale – centered on the brand accent so we can use
   * lighter steps for backgrounds and stronger ones for emphasis.
   */
  pine50: '#F7FBF6',
  pine100: '#EDF4ED',
  pine200: '#D7E5D6',
  pine300: '#B7CFB5',
  pine400: '#8EAF8B',
  pine500: '#4F5D47', // matches existing `moss`
  pine600: '#3C4937',
  pine700: '#1F5226', // matches `accent` + logo mark
  pine800: '#222B20',
  pine900: '#151C14',

  /**
   * Indogo / secondary brand scale – derived from the existing `indigo`
   * so we can keep using that as a hero / accent while having softer
   * backgrounds available.
   */
  indigo50: '#EEF3F8',
  indigo100: '#D8E2F0',
  indigo200: '#B3C5DE',
  indigo300: '#8AA2C7',
  indigo400: '#6C8AA6', // matches existing `quiltBlue`
  indigo500: '#4B6684',
  indigo600: '#324966',
  indigo700: '#24364E',
  indigo800: '#1B283A',
  indigo900: '#141C28',

  // ----------------------------------------------------------------------------
  // Legacy / semantic role tokens
  // ----------------------------------------------------------------------------

  // Light canvas: primary background (shadcn neutral-100)
  shell: '#F5F5F4',
  shellAlt: '#E7E5E4', // secondary neutral tint
  // Arc detail: subtle pine-tinted shell gradient stops
  arcShellTop: '#F7FBF6',
  arcShellBottom: '#EDF4ED',
  canvas: '#FFFFFF',
  card: '#FFFFFF',
  cardMuted: '#F5F5F4',
  border: '#E4E4E7',

  // ShadCN-inspired primitives
  primary: '#18181B',
  primaryForeground: '#FAFAFA',
  secondary: '#F4F4F5',
  secondaryForeground: '#18181B',
  destructive: '#DC2626',
  destructiveForeground: '#FEF2F2',

  // Default "ink" color – aligned with Sumi for a softer, less green-tinted body/heading text.
  textPrimary: '#1C1A19',
  textSecondary: '#5D6B54',
  muted: '#8E9B83',

  accent: '#1F5226',
  accentMuted: '#4F5D4A',

  // Complementary surfaces to the pine green accent
  accentRose: '#F9A8D4', // soft rose
  accentRoseStrong: '#EC4899', // brighter, high-saturation rose that still pairs with pine

  // Kwilt Craft brand palette (Earthy + Handmade + Cross-Cultural)
  indigo: '#1A2E3F', // Aizome Indigo – 深藍, deep, contemplative, protective
  turmeric: '#C58B2A', // Kalo Turmeric – warm, diffuse, pan-Indian / SE Asian turmeric
  madder: '#B35F4C', // Madder Rose – soft, earthy historical dye red
  quiltBlue: '#6C8AA6', // Woad / weathered quilt blue, cool but worn-in
  clay: '#D9C8B8', // Clay Slip – neutral, grounding, unbleached-cotton/ceramic slip
  moss: '#4F5D47', // Moss Iron – vegetal green cut with soil
  sumi: '#1C1A19', // Charred Sumi – sumi ink / charcoal

  warning: '#F97316',
  success: '#65A30D',
  infoSurface: '#F4F1FF',
  schedulePink: '#FBE7F1',
  scheduleYellow: '#FEF3C7',
  scheduleBlue: '#E0F2FE',

  // Global overlay / scrim tokens for dialogs, sheets, and modals.
  scrim: 'rgba(15,23,42,0.5)',
  scrimStrong: 'rgba(15,23,42,0.7)',
};
