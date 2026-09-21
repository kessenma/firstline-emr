import { palette } from './palette';

export const documentTypeColors = {
  pdf: palette.red[500],
  docx: palette.cello[600],
  md: palette.green[600],
  txt: palette.orange[500],
  default: palette.grey[600],
} as const;

export const medicalStatusColors = {
  critical: palette.red[500],
  urgent: palette.orange[500],
  moderate: palette.yellow[500],
  stable: palette.green[500],
  pending: palette.grey[500],
  completed: palette.cello[500],
} as const;
