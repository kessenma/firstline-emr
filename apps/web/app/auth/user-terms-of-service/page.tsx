// app/auth/user-terms-of-service/page.tsx

import React from 'react';
import TermsOfService from '@/components/auth/signup/policy-and-terms/0TermsOfService';

// Force dynamic rendering - prevents static generation at build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TermsOfServicePage: React.FC = () => {
    return <TermsOfService />;
};

export default TermsOfServicePage;
