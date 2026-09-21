// apps/mobile/src/viewModels/PatientInfoViewModel.ts
import { Patient } from '../types/patient';
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
            gender: this.patient?.gender,
            genderPreference: this.patient?.gender,
            firstName: this.patient?.firstName,
            lastName: this.patient?.lastName,
            telegramChatId: this.patient?.telegramChatId || "",
            dob: this.patient?.dob || null,
            patientID: this.patient?.id,
            country: this.patient?.country,
            city: this.patient?.city,
            language: this.patient?.language,
            status: this.patient?.status,
            priority: this.patient?.priority,
            chiefComplaint: this.patient?.chiefComplaint,
            bmi: this.patient?.bmi,
            occupation: this.patient?.occupation,
            pmhx: this.patient?.pmhx,
            pshx: this.patient?.pshx,
            famhx: this.patient?.famhx,
            drinkCount: this.patient?.drinkCount,
            smokeCount: this.patient?.smokeCount,
            otherDrugs: this.patient?.otherDrugs,
            currentMeds: this.patient?.currentMeds,
            prevMeds: this.patient?.prevMeds,
            allergies: this.patient?.allergies,
            missionId: this.patient?.missionId || null,
        };
    }
}
