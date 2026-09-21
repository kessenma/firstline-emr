// apps/web/components/adminDashboard/sections/user-creation/AdminUserCreationView.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioCard } from '@/components/ui/radio-card';
import { DoctorSpecialties } from '@/data/doctorSpecialty.enum';
import { LanguagesList } from '@/data/languages.enum';
import { AlertCircle, CheckCircle, Mail, User, Calendar, Globe, Languages, Eye, EyeOff, UserCog, UserPlus } from 'lucide-react';
import { getRoleTheme } from '@fajr/shared/theme';
import { RoleIcon } from '@/components/ui/RoleIcon';
import { AdminCreatedUsers } from '../../shared/adminCreatedUsers';
import { PendingAdminCreatedUsers } from '../../shared/PendingAdminCreatedUsers';
import { useAdminUserCreationContext, AdminUserCreationProvider } from './AdminUserCreationContext';
import { useAdminUserCreationViewModel } from './AdminUserCreationViewModel';
import { useToast } from '@/components/hooks/useToast';

const DOCTOR_SPECIALTIES = [
    'Cardiology', 'Dermatology', 'Emergency Medicine', 'Family Medicine',
    'Internal Medicine', 'Neurology', 'Orthopedics', 'Pediatrics',
    'Psychiatry', 'Radiology', 'Surgery', 'Other'
];

const LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Arabic', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Other'
];

const COUNTRIES = [
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
    'Spain', 'Italy', 'Australia', 'Japan', 'South Korea', 'Other'
];

function AdminUserCreationViewContent() {
    const {
        accountType,
        setAccountType,
        isFormComplete,
        basicInfoCompleted,
        setBasicInfoCompleted,
        doctorFormCompleted,
        setDoctorFormCompleted,
        triageFormCompleted,
        setTriageFormCompleted,
        evacFormCompleted,
        setEvacFormCompleted,
        isCreatingUser,
        creationSuccess,
        setCreationSuccess,
        resetForm,
    } = useAdminUserCreationContext();

    const {
        formData,
        updateFormField,
        createUser,
        createUserOnly,
        sendConfirmationEmail,
        getPendingUsers,
        error,
        clearError,
        isValidatingEmail,
    } = useAdminUserCreationViewModel();

    const { setToast } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
    const [isEmailSent, setIsEmailSent] = useState(false);

    // Handle form submission - show confirmation popup first
    const handleCreateUser = async () => {
        setShowEmailConfirmation(true);
    };

    // Handle email sending - create user and send email after confirmation
    const handleSendEmail = async () => {
        try {
            // Create user first
            const userId = await createUserOnly();
            if (userId) {
                // Send confirmation email
                const emailSent = await sendConfirmationEmail(userId);
                if (emailSent) {
                    setIsEmailSent(true);
                    setShowEmailConfirmation(false);
                    setCreationSuccess(true);
                    setToast({
                        title: 'User Created Successfully',
                        description: `${formData.firstName} ${formData.lastName} has been created and confirmation email sent to ${formData.email}`,
                        variant: 'success'
                    });
                } else {
                    setShowEmailConfirmation(false);
                    setToast({
                         title: 'User Created but Email Failed',
                         description: `${formData.firstName} ${formData.lastName} was created but the confirmation email could not be sent.`,
                         variant: 'destructive'
                     });
                }
            } else {
                setShowEmailConfirmation(false);
                setToast({
                    title: 'User Creation Failed',
                    description: 'Failed to create user. Please try again.',
                    variant: 'error'
                });
            }
        } catch (error) {
            setShowEmailConfirmation(false);
            setToast({
                title: 'Error',
                description: 'An unexpected error occurred. Please try again.',
                variant: 'error'
            });
        }
    };

    // Handle form reset
    const handleReset = () => {
        resetForm();
        setShowEmailConfirmation(false);
        setIsEmailSent(false);
        clearError();
    };

    // Callback to refresh data when pending users are updated
    const handleUserUpdate = React.useCallback(() => {
        // This can be used to refresh any local data if needed
        console.log('Pending users updated');
    }, []);

    // Check if basic info is complete
    React.useEffect(() => {
        const isComplete = !!
            (formData.firstName &&
            formData.lastName &&
            formData.email &&
            formData.gender &&
            accountType);
        setBasicInfoCompleted(isComplete);
    }, [formData, accountType, setBasicInfoCompleted]);

    // Check if account-specific forms are complete
    React.useEffect(() => {
        if (accountType === 'Doctor') {
            const isComplete = !!(formData.doctorSpecialty && formData.doctorSpecialty.length > 0);
            setDoctorFormCompleted(isComplete);
        } else if (accountType === 'Triage') {
            const isComplete = !!(formData.languages && formData.languages.length > 0);
            setTriageFormCompleted(isComplete);
        } else if (accountType === 'Evac') {
            const isComplete = !!(formData.countries && formData.countries.length > 0);
            setEvacFormCompleted(isComplete);
        }
    }, [formData, accountType, setDoctorFormCompleted, setTriageFormCompleted, setEvacFormCompleted]);

    return (
        <div className="p-6 mx-auto space-y-6 w-full max-w-4xl">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <p className="mt-1 text-foreground">Add a new doctor, triage, or evac user and email them login credentials</p>
                </div>
                {(creationSuccess || isEmailSent) && (
                    <Button onClick={handleReset} variant="outline">
                        Create Another User
                    </Button>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 items-center p-4 rounded-lg bg-destructive/10 border border-border shadow-sm"
                >
                    <AlertCircle className="shrink-0 w-5 h-5 text-destructive" />
                    <p className="font-mono text-center text-destructive uppercase">{error}</p>
                    <Button onClick={clearError} variant="ghost" size="sm" className="ml-auto">
                        ×
                    </Button>
                </motion.div>
            )}

            {/* Success Display */}
            {isEmailSent && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 items-center p-4 bg-primary/10 rounded-lg border border-primary"
                >
                    <CheckCircle className="shrink-0 w-5 h-5" />
                    <div>
                        <p className="font-medium text-primary">User created and email sent successfully!</p>
                        <p className="text-sm text-primary">The user will receive their login credentials at {formData.email}</p>
                    </div>
                </motion.div>
            )}

            {!isEmailSent && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Account Type Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex gap-2 items-center">
                                <UserCog className="w-5 h-5" />
                                Account Type
                            </CardTitle>
                            <CardDescription>Select the type of user account to create</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioCard.Root value={accountType || ''} onValueChange={(value: 'Doctor' | 'Triage' | 'Evac') => setAccountType(value)} className="grid grid-cols-1 gap-3">
                                {(['Doctor', 'Triage', 'Evac'] as const).map((type) => {
                                    const role = getRoleTheme(type);
                                    return (
                                        <RadioCard.Item key={type} value={type} className="p-4">
                                            <div className="flex items-center space-x-3">
                                                <RoleIcon accountType={type} className="w-5 h-5" />
                                                <div>
                                                    <div className="font-medium">{role.label}</div>
                                                    <div className="text-sm text-muted-foreground">{role.description}</div>
                                                </div>
                                            </div>
                                        </RadioCard.Item>
                                    );
                                })}
                            </RadioCard.Root>
                        </CardContent>
                    </Card>

                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex gap-2 items-center">
                                <UserPlus    className="w-5 h-5" />
                                Basic Information
                                {basicInfoCompleted && <CheckCircle className="w-4 h-4 text-primary" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.firstName || ''}
                                        onChange={(e) => updateFormField('firstName', e.target.value)}
                                        placeholder="Enter first name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        value={formData.lastName || ''}
                                        onChange={(e) => updateFormField('lastName', e.target.value)}
                                        placeholder="Enter last name"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => updateFormField('email', e.target.value)}
                                        placeholder="Enter email address"
                                        className={isValidatingEmail ? 'pr-8' : ''}
                                    />
                                    {isValidatingEmail && (
                                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                            <div className="w-4 h-4 rounded-full border-2 animate-spin border-primary border-t-transparent" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={formData.dob || ''}
                                        onChange={(e) => updateFormField('dob', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="gender">Gender</Label>
                                    <RadioCard.Root value={formData.gender || ''} onValueChange={(value) => updateFormField('gender', value)} className="grid grid-cols-2 gap-3 mt-2">
                                        <RadioCard.Item value="Male" className="p-3">
                                            <div className="text-center">
                                                <div className="font-medium">Male</div>
                                            </div>
                                        </RadioCard.Item>
                                        <RadioCard.Item value="Female" className="p-3">
                                            <div className="text-center">
                                                <div className="font-medium">Female</div>
                                            </div>
                                        </RadioCard.Item>
                                    </RadioCard.Root>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account-Specific Information */}
                    {accountType === 'Doctor' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex gap-2 items-center">
                                    <RoleIcon accountType="Doctor" className="w-5 h-5" />
                                    Doctor Information
                                    {doctorFormCompleted && <CheckCircle className="w-4 h-4 text-primary" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label>Medical Specialties (Maximum 2)</Label>
                                    <div className="grid overflow-y-auto grid-cols-1 gap-2 mt-2 max-h-60">
                                        {DoctorSpecialties.map((specialty) => {
                                            const current = formData.doctorSpecialty || [];
                                            const isChecked = current.includes(specialty);
                                            const isDisabled = !isChecked && current.length >= 2;
                                            
                                            return (
                                                <div key={specialty} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={specialty}
                                                        checked={isChecked}
                                                        disabled={isDisabled}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                updateFormField('doctorSpecialty', [...current, specialty]);
                                                            } else {
                                                                updateFormField('doctorSpecialty', current.filter(s => s !== specialty));
                                                            }
                                                        }}
                                                    />
                                                    <Label 
                                                        htmlFor={specialty} 
                                                        className={`text-sm ${isDisabled ? 'text-muted-foreground' : ''}`}
                                                    >
                                                        {specialty}
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <Label>Languages</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {LanguagesList.map((language) => (
                                            <div key={language} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={language}
                                                    checked={formData.languages?.includes(language) || false}
                                                    onCheckedChange={(checked) => {
                                                        const current = formData.languages || [];
                                                        if (checked) {
                                                            updateFormField('languages', [...current, language]);
                                                        } else {
                                                            updateFormField('languages', current.filter(l => l !== language));
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={language} className="text-sm">{language}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {accountType === 'Triage' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex gap-2 items-center">
                                    <Languages className="w-5 h-5" />
                                    Triage Information
                                    {triageFormCompleted && <CheckCircle className="w-4 h-4 text-primary" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Label>Languages</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {LANGUAGES.map((language) => (
                                        <div key={language} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={language}
                                                checked={formData.languages?.includes(language) || false}
                                                onCheckedChange={(checked) => {
                                                    const current = formData.languages || [];
                                                    if (checked) {
                                                        updateFormField('languages', [...current, language]);
                                                    } else {
                                                        updateFormField('languages', current.filter(l => l !== language));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={language} className="text-sm">{language}</Label>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {accountType === 'Evac' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex gap-2 items-center">
                                    <Globe className="w-5 h-5" />
                                    Evacuation Information
                                    {evacFormCompleted && <CheckCircle className="w-4 h-4 text-primary" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Label>Countries of Operation (BETA-- this data is not saved yet and evac user types are not operational yet)</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {COUNTRIES.map((country) => (
                                        <div key={country} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={country}
                                                checked={formData.countries?.includes(country) || false}
                                                onCheckedChange={(checked) => {
                                                    const current = formData.countries || [];
                                                    if (checked) {
                                                        updateFormField('countries', [...current, country]);
                                                    } else {
                                                        updateFormField('countries', current.filter(c => c !== country));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={country} className="text-sm">{country}</Label>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}


                </div>
            )}

            {/* Action Buttons */}
            {!isEmailSent && (
                <div className="flex gap-4 justify-end pt-6 border-t">
                    <Button onClick={handleReset} variant="outline" disabled={isCreatingUser}>
                        Reset Form
                    </Button>
                    <Button
                        onClick={handleCreateUser}
                        disabled={!isFormComplete || isCreatingUser || creationSuccess}
                        className=""
                    >
                        {isCreatingUser ? (
                            <>
                                <div className="mr-2 w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                                Creating User...
                            </>
                        ) : creationSuccess ? (
                            'User Created'
                        ) : (
                            'Create User'
                        )}
                    </Button>
                </div>
            )}

            {/* Email Confirmation Popover */}
            <Popover open={showEmailConfirmation} onOpenChange={setShowEmailConfirmation}>
                <PopoverTrigger asChild>
                    <div />
                </PopoverTrigger>
                <PopoverContent className="w-96 shadow-sm">
                    <div className="space-y-4">
                        <div className="flex gap-3 items-center">
                            <Mail className="w-6 h-6 text-primary" />
                            <div>
                                <h3 className="font-semibold">Confirm Email Details</h3>
                                <p className="text-sm text-muted-foreground">Review the user information before sending the email</p>
                            </div>
                        </div>

                        <div className="p-4 space-y-2 bg-card rounded-lg">
                            <div><strong>Name:</strong> {formData.firstName} {formData.lastName}</div>
                            <div><strong>Email:</strong> {formData.email}</div>
                            <div><strong>Account Type:</strong> {formData.accountType}</div>

                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => setShowEmailConfirmation(false)}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSendEmail}
                                className="flex-1"
                            >
                                Send Email
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

               {/* Admin Created Users Section */}
            <AdminCreatedUsers
                 onUserUpdate={handleUserUpdate}
             />
             <PendingAdminCreatedUsers
                 onUserUpdate={handleUserUpdate}
             />
        </div>
    );
}

// Wrapper component that provides the context
export default function AdminUserCreationView() {
    return (
        <AdminUserCreationProvider>
            <AdminUserCreationViewContent />
        </AdminUserCreationProvider>
    );
}
