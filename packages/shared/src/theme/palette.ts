// Single source of truth for all color hex values across web and mobile.
// Web CSS is auto-generated from this file via `pnpm --filter @fajr/shared generate:css`

export const palette = {
  // Custom Teal palette (Breaker Bay) - Global brand
  teal: {
    50: '#f2fbfa',
    100: '#d5f2ee',
    200: '#abe4dd',
    300: '#79cfc7',
    400: '#4db4ad',
    500: '#359d98',
    600: '#277a78',
    700: '#236261',
    800: '#204f4f',
    900: '#1e4342',
    950: '#0c2627',
  },
  // Custom Blue palette (Havelock Blue) - Scientific brand
  blue: {
    50: '#f3f6fc',
    100: '#e6eef8',
    200: '#c8daef',
    300: '#98bce1',
    400: '#4f8ec9',
    500: '#3d7dba',
    600: '#2c629d',
    700: '#254f7f',
    800: '#22446a',
    900: '#213a59',
    950: '#16253b',
  },
  // Custom Red palette (Alizarin Crimson) - Medical brand
  red: {
    50: '#fdf3f3',
    100: '#fbe5e6',
    200: '#f9cfd1',
    300: '#f3aeb1',
    400: '#ea7f83',
    500: '#da4248',
    600: '#ca383e',
    700: '#a92c31',
    800: '#8c282c',
    900: '#75272a',
    950: '#3f1012',
  },
  // Custom Navy palette (Biscay) - Primary brand
  navy: {
    50: '#f2f6fc',
    100: '#e1eaf8',
    200: '#cadbf3',
    300: '#a5c4eb',
    400: '#7ba5df',
    500: '#5b86d6',
    600: '#476cc9',
    700: '#3d59b8',
    800: '#374a96',
    900: '#2a3867',
    950: '#222a49',
  },
  // Eastern Blue - Secondary brand color
  easternBlue: {
    50: '#f2f9f9',
    100: '#ddeff0',
    200: '#bfe0e2',
    300: '#92c9ce',
    400: '#5eaab2',
    500: '#4b9fa9',
    600: '#3a7580',
    700: '#356069',
    800: '#315159',
    900: '#2d454c',
    950: '#1a2c32',
  },
  // Cello - Secondary brand color
  cello: {
    50: '#eff8ff',
    100: '#dbeffe',
    200: '#c0e4fd',
    300: '#95d4fb',
    400: '#62bbf8',
    500: '#3e9df3',
    600: '#2880e8',
    700: '#2069d5',
    800: '#2056ad',
    900: '#204a88',
    950: '#1d3865',
  },
  // Orange - Accent color
  orange: {
    50: '#fff4ed',
    100: '#ffe6d4',
    200: '#ffc8a8',
    300: '#ffa270',
    400: '#ff6f37',
    500: '#ff5722',
    600: '#f02e06',
    700: '#c71e07',
    800: '#9e1a0e',
    900: '#7f190f',
    950: '#450805',
  },
  // Yellow
  yellow: {
    50: '#fcfee8',
    100: '#faffc2',
    200: '#faff89',
    300: '#ffff4d',
    400: '#fdf312',
    500: '#ecd906',
    600: '#ccab02',
    700: '#a37b05',
    800: '#86600d',
    900: '#724e11',
    950: '#432a05',
  },
  // Green - Success color
  green: {
    50: '#E6F3F3',
    100: '#CCE6E7',
    200: '#99CDCF',
    300: '#66B5B7',
    400: '#339C9F',
    500: '#008387',
    600: '#00696C',
    700: '#056E73',
    800: '#056e73',
    900: '#001A1B',
    950: '#001516',
  },
  // Grey/Gray - Neutral colors
  grey: {
    50: '#f7f7f7',
    100: '#ededed',
    200: '#dfdfdf',
    300: '#c8c8c8',
    400: '#a8a8a8',
    500: '#999999',
    600: '#888888',
    700: '#7b7b7b',
    800: '#676767',
    900: '#545454',
    950: '#363636',
  },
} as const;

export const brandColors = {
  black: '#040f32', // Tangaroa
  white: '#fff9f4', // Bridal Heath
  navy: palette.navy[900],
} as const;

export type Palette = typeof palette;
export type BrandColors = typeof brandColors;
