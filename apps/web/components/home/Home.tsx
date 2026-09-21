'use client'

import React, { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Activity, ArrowRight, Bell, ClipboardList, MessageSquare, Settings, UserCog, UserPlus } from 'lucide-react'
import { RoleIcon } from '@/components/ui/RoleIcon'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {}, [status, session])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') return null
  if (!session?.user) return null

  const user = session.user
  const isAdmin = user.isAdmin
  const accountType = user.accountType

  const roleClass =
    accountType === 'Doctor'
      ? 'role-doctor'
      : accountType === 'Triage'
      ? 'role-triage'
      : ''

  const quickActions = (() => {
    const common = [
      { icon: UserPlus, title: 'Create Patient', description: 'Add a new patient or bulk upload from CSV', href: '/create-patient', color: 'bg-primary text-primary-foreground' },
      { icon: MessageSquare, title: 'Messages', description: 'Check your messages and communicate with team', href: '/messages', color: 'bg-accent text-accent-foreground' },
      { icon: Bell, title: 'Notifications', description: 'View your recent notifications', href: '/notifications', color: 'bg-accent text-accent-foreground' },
      { icon: Settings, title: 'Settings', description: 'Manage your account settings', href: '/my-profile', color: 'bg-secondary text-secondary-foreground' },
    ]
    const roleSpecific: Array<{ icon: any; title: string; description: string; href: string; color: string }> = []
    if (accountType === 'Doctor' || accountType === 'Triage') {
      roleSpecific.push({ icon: ClipboardList, title: 'Patient Dashboard', description: 'View and manage patient cases', href: '/patient-dashboard', color: 'bg-primary text-primary-foreground' })
    }
    if (isAdmin) {
      roleSpecific.push({ icon: UserCog, title: 'Admin Dashboard', description: 'Manage users and system settings', href: '/admin', color: 'bg-secondary text-secondary-foreground' })
    }
    return [...roleSpecific, ...common]
  })()

  return (
    <div className={`${roleClass} min-h-screen bg-background py-8 px-4`}>
      <div className="max-w-7xl mx-auto">
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Activity className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Welcome back, {user.firstName}!</h1>
          </div>
          <p className="text-lg text-muted-foreground ml-11">
            {accountType === 'Doctor' && 'Ready to care for your patients'}
            {accountType === 'Triage' && 'Ready to manage incoming cases'}
            {isAdmin && ' • Admin Access Enabled'}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="p-6 mb-8" backgroundColor="card" backgroundOpacity={80} blurAmount={10} shadowSize="lg" borderColor="border-border">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RoleIcon accountType={accountType} className="w-5 h-5" />
                  <span className="font-semibold text-muted-foreground">Account Type:</span>
                  <span className="text-foreground">{accountType}</span>
                </div>
                {user.doctorSpecialty && user.doctorSpecialty.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-muted-foreground">Specialty:</span>
                    <span className="text-foreground">{user.doctorSpecialty.join(', ')}</span>
                  </div>
                )}
                {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <UserCog className="w-5 h-5 text-secondary" />
                    <span className="font-semibold text-secondary">Administrator</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <motion.div key={action.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}>
                <Card className="p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 group" backgroundColor="card" backgroundOpacity={90} blurAmount={10} shadowSize="md" borderColor="border-border" onClick={() => router.push(action.href)}>
                  <div className="flex items-start space-x-4">
                    <div className={`${action.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1 }} className="mt-12 text-center text-sm text-muted-foreground">
          <p>Logged in as {user.email}</p>
          {user.countries && user.countries.length > 0 && <p className="mt-1">Regions: {user.countries.join(', ')}</p>}
        </motion.div>
      </div>
    </div>
  )
}
