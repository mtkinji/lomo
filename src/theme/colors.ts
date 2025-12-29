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
   * Pine / primary scale – anchored on the official Kwilt green.
   *
   * Official Kwilt green: #315545
   */
  pine50: '#F3F7F5',
  pine100: '#E3EEE9',
  pine200: '#C6DDD4',
  pine300: '#9FC4B6',
  pine400: '#6FA592',
  pine500: '#4F8A72',
  pine600: '#3F6F5C',
  pine700: '#315545', // official Kwilt green
  pine800: '#233F33',
  pine900: '#152820',

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

  /**
   * Quilt Blue scale – a softer, weathered blue used for quilt-like surfaces.
   * Note: intentionally aligned to the existing indigo scale so our “quilt blue”
   * palette stays consistent with current usage (and preserves `quiltBlue` as the
   * familiar mid-tone).
   */
  quiltBlue50: '#EEF3F8',
  quiltBlue100: '#D8E2F0',
  quiltBlue200: '#B3C5DE',
  quiltBlue300: '#8AA2C7',
  quiltBlue400: '#6C8AA6', // matches existing `quiltBlue`
  quiltBlue500: '#4B6684',
  quiltBlue600: '#324966',
  quiltBlue700: '#24364E',
  quiltBlue800: '#1B283A',
  quiltBlue900: '#141C28',

  // ----------------------------------------------------------------------------
  // Legacy / semantic role tokens
  // ----------------------------------------------------------------------------

  // Light shell: app-wide background behind the page canvas (Airbnb-like: clean white)
  shell: '#FFFFFF',
  // Subtle off-white used for muted sections on top of the shell.
  shellAlt: '#F5F5F4',
  // Arc detail: subtle pine-tinted shell gradient stops
  arcShellTop: '#F7FBF6',
  arcShellBottom: '#EDF4ED',
  canvas: '#FFFFFF',
  card: '#FFFFFF',
  cardMuted: '#F5F5F4',
  border: '#E4E4E7',

  // ShadCN-inspired primitives
  // Primary (dark) – aligned to Sumi so copy + primary controls share the same ink.
  primary: '#1C1A19',
  primaryForeground: '#FAFAFA',
  secondary: '#F4F4F5',
  secondaryForeground: '#18181B',
  destructive: '#DC2626',
  destructiveForeground: '#FEF2F2',

  // Default "ink" color – aligned with Sumi for a softer, less green-tinted body/heading text.
  textPrimary: '#1C1A19',
  textSecondary: '#5D6B54',
  muted: '#8E9B83',

  // Form field section labels (e.g., NOTES / TAGS / LINKED GOAL). Keep in the Sumi family (no pine tint).
  formLabel: '#57534E', // sumi600

  // Borderless input fill surfaces (used by `Input` variant="filled", `LongTextField` surfaceVariant="filled", etc).
  // Keep extremely subtle; rely on focus ring / pressed state for affordance.
  fieldFill: '#FAFAF9', // sumi50
  fieldFillPressed: '#F5F5F4', // sumi100

  // Primary brand accent: kwilt green.
  accent: '#315545',
  // Muted accent: slightly softer/desaturated green for secondary fills (badges, info surfaces, etc.).
  accentMuted: '#3F6F5C',

  /**
   * AI brand tokens (used for AI actions like "AI Suggestion").
   * Intentionally aligned with the existing pine + success palette for a
   * recognizable "AI" treatment across the app.
   */
  aiGradientStart: '#315545', // pine / kwilt green
  // Keep this subtle (no neon mid-stop); prefer a low-contrast linear sweep.
  aiGradientMid: '#3F6F5C', // pine600
  aiGradientEnd: '#3F6F5C',
  aiForeground: '#FAFAFA',
  aiBorder: 'rgba(0,0,0,0.18)',

  // Cream / parchment tone used for high-contrast warm text on saturated greens.
  parchment: '#FAF7ED',

  // Complementary surfaces to the pine green accent
  accentRose: '#F9A8D4', // soft rose
  accentRoseStrong: '#EC4899', // brighter, high-saturation rose that still pairs with pine

  // Kwilt Craft brand palette (Earthy + Handmade + Cross-Cultural)
  indigo: '#1A2E3F', // Aizome Indigo – 深藍, deep, contemplative, protective
  // Turmeric scale (warm, diffuse, pan-Indian / SE Asian turmeric)
  turmeric50: '#FBF3E5',
  turmeric100: '#F6E6C8',
  turmeric200: '#EED5A2',
  turmeric300: '#E4C177',
  turmeric400: '#D5A852',
  turmeric500: '#C58B2A', // base turmeric
  turmeric600: '#A97120',
  turmeric700: '#8C5A18',
  turmeric800: '#6F4512',
  turmeric900: '#52320C',
  turmeric: '#C58B2A', // alias for the base turmeric
  // Madder scale (soft, earthy historical dye red)
  madder50: '#FBF2EF',
  madder100: '#F7E2DC',
  madder200: '#F0C6BA',
  madder300: '#E5A493',
  madder400: '#D27F6B',
  madder500: '#C26B58',
  madder600: '#B35F4C', // legacy `madder` value
  madder700: '#944C3D',
  madder800: '#7A3D32',
  madder900: '#5A2B24',
  madder: '#B35F4C', // alias for the legacy/base madder
  quiltBlue: '#6C8AA6', // Woad / weathered quilt blue, cool but worn-in
  clay: '#D9C8B8', // Clay Slip – neutral, grounding, unbleached-cotton/ceramic slip
  moss: '#4F5D47', // Moss Iron – vegetal green cut with soil
  /**
   * Sumi scale (warm neutral) – used for ink / charcoal surfaces.
   * Close to Tailwind `stone` so it stays earthy (not blue/steel like zinc).
   */
  sumi50: '#FAFAF9',
  sumi100: '#F5F5F4',
  sumi200: '#E7E5E4',
  sumi300: '#D6D3D1',
  sumi400: '#A8A29E',
  sumi500: '#78716C',
  sumi600: '#57534E',
  sumi700: '#44403C',
  sumi800: '#292524',
  sumi900: '#1C1A19', // Charred Sumi – sumi ink / charcoal
  sumi: '#1C1A19', // alias for sumi900 (legacy token)

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
