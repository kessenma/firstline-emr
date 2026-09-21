// app/auth/user-privacy-policy/page.tsx

import React from 'react';
import PrivacyPolicy from '@/components/auth/signup/policy-and-terms/0PrivacyPolicy';

// Force dynamic rendering - prevents static generation at build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PrivacyPolicyPage: React.FC = () => {
    return <PrivacyPolicy />;
};

export default PrivacyPolicyPage;
