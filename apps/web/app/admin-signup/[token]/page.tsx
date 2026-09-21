'use client';

import AdminSignupToken from '@/components/auth/signup/admin-signup/AdminSignupToken'
import { AuroraBackground } from '@/components/ui/aurora-background';
import { useParams } from 'next/navigation';

export default function AdminCreatedUserSignup() {
  const { token } = useParams() as { token: string }; 
  return <AuroraBackground auroraStyle={'orange'}>
  <AdminSignupToken token={token} />
  </AuroraBackground>
}