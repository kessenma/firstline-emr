// apps/web/components/patient-chart/patient-dashboard/PatientInfoViewModel.tsx
import { Patient } from '@/db/schema/patients';
import { getAnonymizedName } from '@fajr/shared/patient-utils';

export class PatientInfoViewModel {
    patient: Patient | null = null;

    constructor(patientData: Patient) {
        this.patient = patientData;
    }

    getPrimaryDetails() {
        return {
            patientName: getAnonymizedName(this.patient?.firstName, this.patient?.lastName),
            patientID: this.patient?.id,
        };
    }

    getExpandedDetails() {
        return {
            gender: this.patient?.genderPreference,
            genderPreference: this.patient?.genderPreference,
            firstName: this.patient?.firstName,
            lastName: this.patient?.lastName,
            telegramChatId: this.patient?.telegramChatId || "",
            bmi: this.patient?.bmi,
            pmhx: this.patient?.pmhx,
            pshx: this.patient?.pshx,
            famhx: this.patient?.famhx,
            dob: this.patient?.dob || null,
            patientID: this.patient?.id,
            phone: this.patient?.phone,
            country: this.patient?.country,
            city: this.patient?.city,
            language: this.patient?.language,
            email: this.patient?.email,
            occupation: this.patient?.occupation,
            drinkCount: this.patient?.drinkCount,
            smokeCount: this.patient?.smokeCount,
            otherDrugs: this.patient?.otherDrugs,
            prevMeds: this.patient?.prevMeds,
            currentMeds: this.patient?.currentMeds,
            allergies: this.patient?.allergies,
            missionId: this.patient?.missionId || null,
            hospital: this.patient?.hospital || null,
        };
    }
}