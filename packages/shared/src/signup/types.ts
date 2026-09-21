export type AccountType = 'Doctor' | 'Triage';

export type Gender = 'Male' | 'Female';

/** Fields shared by both web and mobile signup forms.
 *  Platform-specific fields (e.g. file upload shape) remain in each app. */
export interface SignupFormDataBase {
  accountType: AccountType | null;
  email: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
  passkeyEnabled: boolean;
  // 2FA
  twoFactorSetupCompleted: boolean;
  totpCredentialData: TotpCredentialData | null;
  // Profile
  firstName: string;
  lastName: string;
  dob: string;
  doctorSpecialty: string[];
  languages: string[];
  countries: string[];
  gender: Gender | null;
  // Missions the user wants to request to join (optional step; may be empty)
  missionIds: string[];
}

export interface TotpCredentialData {
  encryptedSecret: string;
  encryptionIv: string;
  encryptionTag: string;
}

/** Base medical license — each platform extends with its own file representation */
export interface MedicalLicenseBase {
  specialty: string;
}

export interface PasskeyCredential {
  credentialId: string;
  publicKey: string;
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string[];
  deviceName: string;
  aaguid: string;
}
