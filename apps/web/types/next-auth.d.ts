// types/next-auth.d.ts
import { Countries } from "@/data/countries.enum";
import { Languages } from "@/data/languages.enum";
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { DefaultSession, DefaultJWT } from "next-auth";

type AccountType = "Doctor" | "Triage";

declare module "next-auth" {
  interface Session extends DefaultSession {
    update: (data?: any) => Promise<Session>;
    user: {
      id: string;
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
      city: string;
      countries: Countries[];
      languages: Languages[];
      accountType: AccountType;
      isAdmin: boolean;
      image?: string;
      doctorSpecialty?: DoctorSpecialtyList[];
      token?: string;
      gender?: "Male" | "Female";
      dob?: Date | string;
      googleId?: string;
      googleEmail?: string;
      googleImage?: string;
      userSettings?: string;
      [key: string]: any;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    email: string;
    accountType: AccountType;
    firstName: string;
    lastName: string;
    city?: string;
    countries?: Countries[];
    languages?: Languages[];
    isAdmin?: boolean;
    image?: string;
    doctorSpecialty?: DoctorSpecialtyList[];
    token?: string;
    gender?: "Male" | "Female";
    dob?: string | Date;
    accessToken?: string;
    googleId?: string;
    googleEmail?: string;
    googleImage?: string;
    userSettings?: string;
  }
}
