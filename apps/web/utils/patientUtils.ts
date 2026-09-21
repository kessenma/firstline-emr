// utils/patientUtils.ts
export const formatLocation = (city: string, country: string): string => {
    if (!city && !country) return '';
    if (!city) return country;
    if (!country) return city;
    return `${city}, ${country}`;
};

export const getInitials = (firstName?: string, lastName?: string): string => {
    if (!firstName && !lastName) return '';
    if (!firstName) return lastName?.[0] || '';
    if (!lastName) return firstName[0];
    return `${firstName[0]}${lastName[0]}`;
};

export const dobToAge = (dob: string): string => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age.toString();
};

