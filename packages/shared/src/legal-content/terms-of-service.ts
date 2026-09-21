import { LegalDocument } from './types';

export const termsOfService: LegalDocument = {
  title: 'FAJR.EMR TERMS OF SERVICE',
  lastUpdated: 'March 16, 2026',
  intro:
    'Welcome to Fajr Mission EMR! By accessing or using our platform, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our services.',
  sections: [
    {
      title: '1. Acceptance of Terms',
      content: [
        {
          type: 'paragraph',
          text: 'By using Fajr Mission EMR, you acknowledge that you have read, understood, and agree to be bound by these terms. If you do not agree, you must refrain from using our platform.',
        },
      ],
    },
    {
      title: '2. Service Description',
      content: [
        {
          type: 'paragraph',
          text: 'Fajr Mission EMR provides tools and resources for healthcare professionals to manage patient interactions. These services are intended only for approved use cases and are subject to these terms.',
        },
      ],
    },
    {
      title: '3. User Obligations',
      content: [
        {
          type: 'list',
          items: [
            'Users must provide accurate, current, and complete information when registering or using the platform.',
            'Users are responsible for maintaining the security of their accounts, including safeguarding login credentials.',
            "Users agree not to misuse the services, including engaging in abusive behavior, unauthorized access, or activities that compromise the platform's integrity.",
            'Any violation of these obligations may result in suspension or termination of access.',
          ],
        },
      ],
    },
    {
      title: '4. Intellectual Property',
      content: [
        {
          type: 'paragraph',
          text: 'All content, trademarks, and tools on the platform are the property of Fajr Mission EMR. Users are prohibited from reproducing, distributing, or modifying any materials without explicit written consent.',
        },
      ],
    },
    {
      title: '5. Limitation of Liability',
      content: [
        {
          type: 'paragraph',
          text: 'Fajr Mission EMR is provided on an "as-is" and "as-available" basis. We are not liable for any errors, interruptions, or losses resulting from the use of the platform. Fajr Mission EMR disclaims all warranties, including those of merchantability or fitness for a particular purpose.',
        },
      ],
    },
    {
      title: '6. Disclaimers',
      content: [
        {
          type: 'paragraph',
          text: 'Fajr Mission EMR is a healthcare management tool and does not provide medical advice. Users are solely responsible for clinical decisions and patient care. Always consult a licensed medical professional for medical guidance.',
        },
      ],
    },
    {
      title: '7. Indemnification',
      content: [
        {
          type: 'paragraph',
          text: 'Users agree to indemnify and hold Fajr Mission EMR harmless from any claims, damages, or liabilities arising out of their misuse of the platform, breach of these terms, or violation of applicable laws.',
        },
      ],
    },
    {
      title: '8. Termination',
      content: [
        {
          type: 'paragraph',
          text: 'We reserve the right to suspend or terminate access for users who violate these terms. Users may also terminate their accounts at any time by contacting us.',
        },
      ],
    },
    {
      title: '9. Changes to Terms',
      content: [
        {
          type: 'paragraph',
          text: 'We may update these terms periodically. Changes will be effective immediately upon posting. Continued use of the platform indicates acceptance of the updated terms.',
        },
      ],
    },
    {
      title: '10. Jurisdiction and Governing Law',
      content: [
        {
          type: 'paragraph',
          text: 'These terms are governed by the laws of Texas / USA. Any disputes arising under these terms will be resolved in the courts of Sugar Land Municipal Court.',
        },
      ],
    },
    {
      title: '11. Force Majeure',
      content: [
        {
          type: 'paragraph',
          text: 'Fajr Mission EMR is not liable for delays or failures caused by events beyond our control, including natural disasters, technical failures, or acts of government.',
        },
      ],
    },
  ],
  contactEmail: 'info@fajr.org',
};
