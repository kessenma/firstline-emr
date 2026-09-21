import React from 'react';
import { privacyPolicy } from '@fajr/shared/legal-content';
import LegalDocumentView from '@/components/legal/LegalDocumentView';

const PrivacyPolicy: React.FC = () => {
  return <LegalDocumentView document={privacyPolicy} />;
};

export default PrivacyPolicy;
