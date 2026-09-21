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

export const dobToAge = (dob: string | Date): string => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age.toString();
};

export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateShort = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateWithTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getAnonymizedName = (firstName?: string | null, lastName?: string | null): string => {
  const f = firstName?.trim()?.[0]?.toUpperCase();
  const l = lastName?.trim()?.[0]?.toUpperCase();
  if (!f && !l) return 'N/A';
  if (!f) return `${l}.`;
  if (!l) return `${f}.`;
  return `${f}.${l}.`;
};

export const getFullName = (firstName?: string, lastName?: string): string => {
  if (!firstName && !lastName) return 'N/A';
  if (!firstName) return lastName || 'N/A';
  if (!lastName) return firstName;
  return `${firstName} ${lastName}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const formatSpecialties = (specialties?: string[]): string => {
  if (!specialties || specialties.length === 0) return 'Not Selected';
  if (specialties.length === 1) return specialties[0];
  return `${specialties.length} specialties`;
};
