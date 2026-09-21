// apps/mobile/src/constants/countryCodes.ts
// Country codes for phone number selection

export enum CountryCodes {
  USA = '+1',
  EGYPT = '+20',
  AFGHANISTAN = '+93',
  LEBANON = '+961',
  JORDAN = '+962',
  SYRIA = '+963',
  YEMEN = '+967',
  PALESTINE = '+970',
  ISRAEL = '+972',
}

export const CountryCodesList = Object.values(CountryCodes);

// Country names for display in picker
export const CountryCodesWithNames = [
  { code: '+1', name: 'USA/Canada' },
  { code: '+20', name: 'Egypt' },
  { code: '+93', name: 'Afghanistan' },
  { code: '+961', name: 'Lebanon' },
  { code: '+962', name: 'Jordan' },
  { code: '+963', name: 'Syria' },
  { code: '+967', name: 'Yemen' },
  { code: '+970', name: 'Palestine' },
  { code: '+972', name: 'Israel' },
];
