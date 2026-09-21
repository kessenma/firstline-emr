import React from 'react';
import { termsOfService } from '@fajr/shared/legal-content';
import LegalDocumentView from '@/components/legal/LegalDocumentView';

const TermsOfService: React.FC = () => {
  return <LegalDocumentView document={termsOfService} />;
};

export default TermsOfService;
