import { LegalDocument } from './types';

export const privacyPolicy: LegalDocument = {
  title: 'FAJR.EMR PRIVACY POLICY',
  lastUpdated: 'March 16, 2026',
  intro:
    'Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information.',
  sections: [
    {
      title: '1. Information We Collect',
      content: [
        {
          type: 'paragraph',
          text: 'When you sign up or log in, we collect your email address for account identification and communication.\nWe may also collect usage data, IP addresses, and technical information to improve our services.',
        },
      ],
    },
    {
      title: '2. How We Use Your Information',
      content: [
        {
          type: 'list',
          items: [
            'To identify and manage user accounts.',
            'To send notifications, updates, and important communications.',
            'To improve and enhance platform functionality.',
          ],
        },
      ],
    },
    {
      title: '3. Information Sharing',
      content: [
        {
          type: 'paragraph',
          text: 'We do not sell or share your email address with third parties.\nInformation may be shared only as required by law or to ensure the functionality of our services (e.g., with trusted third-party vendors).',
        },
      ],
    },
    {
      title: '4. Data Security',
      content: [
        {
          type: 'paragraph',
          text: 'We implement appropriate technical and organizational measures to protect your information from unauthorized access, use, or disclosure.',
        },
      ],
    },
    {
      title: '5. Data Retention',
      content: [
        {
          type: 'paragraph',
          text: 'User data is retained for as long as necessary to fulfill the purposes outlined in this policy or as required by law.\nUsers may request deletion of their data by contacting info@fajr.org.',
        },
      ],
    },
    {
      title: '6. Cookies and Tracking',
      content: [
        {
          type: 'paragraph',
          text: 'We use cookies and similar technologies to enhance your experience. You can manage your cookie preferences through your browser settings.',
        },
      ],
    },
    {
      title: '7. User Rights',
      content: [
        {
          type: 'labeledList',
          items: [
            {
              bold: 'Access:',
              text: 'Users can request access to their data.',
            },
            {
              bold: 'Rectification:',
              text: 'Users can request corrections to inaccurate or incomplete data.',
            },
            {
              bold: 'Deletion:',
              text: 'Users can request deletion of their data, subject to legal obligations.',
            },
          ],
        },
      ],
    },
    {
      title: '8. Updates to Privacy Policy',
      content: [
        {
          type: 'paragraph',
          text: 'We may update this Privacy Policy periodically. Changes will be posted on this page with a revised effective date.',
        },
      ],
    },
  ],
  contactEmail: 'info@fajr.org',
};
