// Every colour, size and radius in the app comes from here (design/DIRECTION.md).
// Each colour has one owner: peach/coral = pain, yellow = today/unread, green = Pregledano, red = 112.

export const colors = {
  ground: '#1652C4',
  ink: '#FFFFFF',
  ink2: '#D9E6FF',
  tonal: 'rgba(255,255,255,0.14)',
  tonalLine: 'rgba(255,255,255,0.22)',
  faint: 'rgba(255,255,255,0.3)',
  today: '#FFD45C',
  sheet: '#FFFFFF',
  sheetInk: '#0C2145',
  sheetInk2: '#3B5683',
  sheetFill: '#EBF1FD',
  hairline: '#E2EAF7',
  reviewed: '#0F7A5C',
  heatLow: '#FFF3E8',
  heatMid: '#FFB48C',
  heatHigh: '#FF6A55',
  heatChipBg: '#FFE4D3',
  heatChipInk: '#7A2E0F',
  heatPillInk: '#14262A',
  urgent: '#B3121A',
  urgentTop: '#C0151D',
  urgentBottom: '#860A10',
  urgentGlow: '#D8262E',
  orbTop: '#FFFFFF',
  orbMid: '#F6F4F1',
  orbBottom: '#EAE6E2',
  urgentOrbBottom: '#FBECEC',
  avatarTop: '#F6D9BE',
  avatarBottom: '#E2B48C',
  avatarInk: '#4A2A12',
  scrim: 'rgba(0,0,0,0.6)',
} as const;

/** Heat colour and the ink used for the number on the slider thumb, by value on a 0–max scale. */
export function heatFor(value: number, max: number): { fill: string; ink: string; pill: string; wash: string } {
  const t = max === 0 ? 0 : value / max;
  if (t >= 0.7) return { fill: colors.heatHigh, ink: colors.urgent, pill: '#FF8A72', wash: 'rgba(255,95,75,0.52)' };
  if (t >= 0.35) return { fill: colors.heatMid, ink: '#B84A1E', pill: colors.heatMid, wash: 'rgba(255,150,110,0.40)' };
  return { fill: colors.heatLow, ink: '#B84A1E', pill: colors.heatLow, wash: 'rgba(255,200,170,0.22)' };
}

export const font = {
  regular: 'Lexend_400Regular',
  medium: 'Lexend_500Medium',
  semibold: 'Lexend_600SemiBold',
  bold: 'Lexend_700Bold',
} as const;

export type Weight = keyof typeof font;

export const type = {
  painNumber: { size: 184, weight: 'semibold', letterSpacing: -9.2, lineHeight: 200 },
  title: { size: 34, weight: 'semibold', letterSpacing: -0.34, lineHeight: 38 },
  question: { size: 34, weight: 'semibold', letterSpacing: -0.5, lineHeight: 39 },
  startButton: { size: 32, weight: 'semibold', letterSpacing: -0.32, lineHeight: 36 },
  urgentTitle: { size: 52, weight: 'semibold', letterSpacing: -1.3, lineHeight: 54 },
  quote: { size: 24, weight: 'regular', lineHeight: 34 },
  letter: { size: 26, weight: 'regular', lineHeight: 38 },
  button: { size: 21, weight: 'medium', lineHeight: 26 },
  buttonStrong: { size: 21, weight: 'semibold', lineHeight: 26 },
  entryTitle: { size: 21, weight: 'semibold', lineHeight: 27 },
  topBar: { size: 20, weight: 'medium', lineHeight: 26 },
  body: { size: 20, weight: 'regular', lineHeight: 28 },
  bodyStrong: { size: 20, weight: 'semibold', lineHeight: 25 },
  meta: { size: 18, weight: 'regular', lineHeight: 24 },
  metaStrong: { size: 18, weight: 'medium', lineHeight: 24 },
} as const satisfies Record<string, { size: number; weight: Weight; lineHeight: number; letterSpacing?: number }>;

export type TypeRole = keyof typeof type;
export type TypeSpec = { size: number; weight: Weight; lineHeight: number; letterSpacing?: number };

export const space = {
  side: 24,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 36,
} as const;

export const size = {
  control: 56,
  pill: 68,
  startOrb: 236,
  ring: 340,
  recordOrb: 200,
  urgentOrb: 220,
  thumb: 84,
  avatar: 48,
  reply: 64,
} as const;

export const radius = {
  pill: 34,
  sheet: 32,
  card: 28,
  thumb: 14,
} as const;

export const shadow = {
  object: '0px 12px 30px -16px rgba(0,0,0,0.5)',
  orb: '0px 30px 60px -24px rgba(0,0,0,0.6), inset 0px -6px 12px rgba(11,74,82,0.12), inset 0px 2px 0px #FFFFFF',
  thumb: '0px 0px 0px 8px rgba(255,255,255,0.14), 0px 18px 30px -10px rgba(0,0,0,0.55), inset 0px -3px 6px rgba(11,74,82,0.12)',
  tonal: 'inset 0px 0px 0px 1px rgba(255,255,255,0.22), 0px 12px 30px -16px rgba(0,0,0,0.5)',
  urgentOrb: '0px 30px 60px -20px rgba(0,0,0,0.6)',
} as const;
