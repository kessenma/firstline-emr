import { palette } from './palette';

export const roleColors = {
  doctor: {
    primary: palette.blue[400],
    light: palette.blue[100],
    dark: palette.blue[700],
    lightest: palette.blue[50],
    darkest: palette.blue[900],
  },
  triage: {
    primary: palette.teal[500],
    light: palette.teal[200],
    dark: palette.teal[800],
    lightest: palette.teal[50],
    darkest: palette.teal[950],
  },
  medical: {
    primary: palette.red[500],
    light: palette.red[200],
    dark: palette.red[800],
    lightest: palette.red[50],
    darkest: palette.red[950],
  },
  navy: {
    primary: palette.navy[900],
    light: palette.navy[300],
    dark: palette.navy[700],
    lightest: palette.navy[50],
    darkest: palette.navy[950],
  },
} as const;

export type RoleColors = typeof roleColors;
