"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { HTMLAttributes, InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarWithControls } from "@/components/ui/calendar-with-controls";
import { RadioCard } from "@/components/ui/radio-card";
import { CalendarIcon, User, Mail, Shield, Calendar as CalendarLucide, CheckCircle, UserCheck, Lock, LockOpen, Users, LetterText, IdCard, AlertTriangle, Clock, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { securityQuestions } from "@/data/securityQuestions.enum";
import { DoctorSpecialties } from "@/data/doctorSpecialty.enum";
import { motion } from "framer-motion";
import Tooltip from "@/components/form/Tooltip";
import { useDropzone } from "react-dropzone";
import Image from "next/image";


interface UserData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  doctorSpecialty?: string[];
  dob?: string;
  gender?: string;
  question1?: string;
  answer1?: string;
  question2?: string;
  answer2?: string;
  question3?: string;
  answer3?: string;
  medicalLicenses?: {
    specialty: string;
    file?: File;
    uploadedAt?: Date;
  }[];
}

interface AdminSignupTokenProps {
  token: string;
}

export default function AdminSignupToken({ token }: AdminSignupTokenProps) {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [filteredQuestions, setFilteredQuestions] = useState({
    question1: securityQuestions,
    question2: securityQuestions,
    question3: securityQuestions,
  });

  // Medical license state
  const [medicalLicenses, setMedicalLicenses] = useState<Map<string, File>>(new Map());
  const [uploadingLicenses, setUploadingLicenses] = useState(false);

  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const hasValidatedRef = useRef(false);

  // Format time remaining as HH:MM:SS
  const formatTimeRemaining = () => {
    if (timeRemaining === null) return '--:--:--';
    if (timeRemaining <= 0) return '00:00:00';
    
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate and update time remaining
  const updateTimeRemaining = (expiry: Date) => {
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) {
      setTimeRemaining(0);
      return;
    }
    
    setTimeRemaining(Math.floor(diff / 1000)); // Convert to seconds
  };

  const validateToken = useCallback(async () => {
    try {
      const response = await fetch("/api/admin-signup/validate-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setUserData(data.user);
        if (data.tokenExpiry) {
          const expiry = new Date(data.tokenExpiry);
          setTokenExpiry(expiry);
          updateTimeRemaining(expiry);
        }
        // Initialize medical licenses map if user is a doctor
        if (data.user.accountType === 'doctor' && data.user.doctorSpecialty) {
          const initialLicenses = new Map<string, File>();
          setMedicalLicenses(initialLicenses);
        }
      } else {
        // Check if it's a session expiry error
        if (response.status === 401) {
          setError(data.error || "Session expired");
          // Redirect to verification page after a delay
          setTimeout(() => {
            window.location.href = `/auth/signup/admin-signup/verify?email=${userData?.email || ''}`;          }, 3000);
        } else {
          setError(data.error || "Invalid token");
        }
      }
    } catch (err) {
      setError("Failed to validate token");
    } finally {
      setLoading(false);
    }
  }, [token, userData?.email]);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing confirmation token");
      setLoading(false);
      return;
    }

    // Only validate token once on mount
    if (!hasValidatedRef.current) {
      validateToken();
      hasValidatedRef.current = true;
    }
  }, [token, validateToken]);

  // Separate useEffect for countdown timer
  useEffect(() => {
    if (!tokenExpiry) return;
    
    const intervalId = setInterval(() => {
      updateTimeRemaining(tokenExpiry);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [tokenExpiry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match before submitting
    if (password !== confirmPassword) {
      setPasswordsMatch(false);
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!dateOfBirth) {
      setError("Date of birth is required");
      return;
    }

    if (!userData?.gender) {
      setError("Gender is required");
      return;
    }

    if (!userData?.question1 || !userData?.answer1 || !userData?.question2 || !userData?.answer2 || !userData?.question3 || !userData?.answer3) {
      setError("All security questions and answers are required");
      return;
    }

    // Validate medical licenses for doctors
    if (userData?.accountType === 'doctor' && userData?.doctorSpecialty && userData.doctorSpecialty.length > 0) {
      const missingLicenses = userData.doctorSpecialty.filter(specialty => !medicalLicenses.has(specialty));
      if (missingLicenses.length > 0) {
        setError(`Please upload medical licenses for: ${missingLicenses.join(', ')}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // First, confirm the account
      const response = await fetch("/api/admin-signup/confirm-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          userData: {
            ...userData,
            dob: dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // If user is a doctor, upload medical licenses
        if (userData?.accountType === 'doctor' && medicalLicenses.size > 0) {
          setUploadingLicenses(true);
          
          try {
            // Upload each medical license
            const uploadPromises = Array.from(medicalLicenses.entries()).map(async ([specialty, file]) => {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('firstName', userData.firstName);
              formData.append('lastName', userData.lastName);
              formData.append('specialty', specialty);
              formData.append('userId', userData._id);

              const uploadResponse = await fetch('/api/upload-license', {
                method: 'POST',
                body: formData,
              });

              if (!uploadResponse.ok) {
                throw new Error(`Failed to upload license for ${specialty}`);
              }

              return uploadResponse.json();
            });

            await Promise.all(uploadPromises);
          } catch (uploadError) {
            console.error('License upload error:', uploadError);
            setError('Account created but some licenses failed to upload. Please contact support.');
            setUploadingLicenses(false);
            return;
          }
          
          setUploadingLicenses(false);
        }

        setSuccess(true);
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } else {
        // Check if it's a session expiry error
        if (response.status === 401) {
          setError(data.error || "Session expired");
          // Redirect to verification page after a delay
          setTimeout(() => {
            window.location.href = `/auth/signup/admin-signup/verify?email=${userData?.email || ''}`;
          }, 3000);
        } else {
          setError(data.error || "Failed to confirm account");
        }
      }
    } catch (err) {
      setError("Failed to confirm account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserDataChange = (field: keyof UserData, value: string) => {
    if (userData) {
      setUserData({ ...userData, [field]: value });
      
      // Update filtered questions when a security question is selected
      if (field === 'question1' || field === 'question2' || field === 'question3') {
        updateFilteredQuestions({ ...userData, [field]: value });
      }
    }
  };

  const updateFilteredQuestions = (currentUserData: UserData) => {
    const selectedQuestions = [
      currentUserData.question1,
      currentUserData.question2,
      currentUserData.question3,
    ].filter(Boolean);

    setFilteredQuestions({
      question1: securityQuestions,
      question2: securityQuestions.filter(q => q !== currentUserData.question1),
      question3: securityQuestions.filter(q => q !== currentUserData.question1 && q !== currentUserData.question2),
    });
  };

  // Medical license helper functions
  const addMedicalLicense = (specialty: string, file: File) => {
    setMedicalLicenses(prev => {
      const newMap = new Map(prev);
      newMap.set(specialty, file);
      return newMap;
    });
  };

  const removeMedicalLicense = (specialty: string) => {
    setMedicalLicenses(prev => {
      const newMap = new Map(prev);
      newMap.delete(specialty);
      return newMap;
    });
  };

  const getMedicalLicenseForSpecialty = (specialty: string): File | undefined => {
    return medicalLicenses.get(specialty);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md bg-card">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="px-4 py-3 text-destructive bg-destructive/10 rounded border border-destructive/20">
              {error}
            </div>
            <div className="px-4 py-3 mt-4 text-warning bg-warning/10 rounded border border-warning/20">
              <div className="flex items-start">
                <AlertTriangle className="mr-2 w-5 h-5 text-warning shrink-0 mt-0.5" />
                <p className="text-sm">
                  Your session may have expired. Please verify your email again to receive a new verification code.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Card className="w-full max-w-md bg-card">
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-success/10 rounded-full"
              >
                <CheckCircle className="w-8 h-8 text-success" />
              </motion.div>
              <CardTitle className="text-success">Account Confirmed!</CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="px-4 py-3 text-center text-success bg-success/10 rounded border border-success/20"
              >
                Your account has been successfully confirmed. Redirecting to login...
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center px-4 py-12 min-h-screen sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-card">
          <CardHeader>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CardTitle className="flex gap-2 items-center mb-4">
                <UserCheck className="w-5 h-5" />
                Complete Your Account Setup
              </CardTitle>
              <CardDescription>
            Please review your information and set your password to complete your account setup.
          </CardDescription>
          
          {/* Token Expiry Warning */}
          {timeRemaining !== null && (
            <div className="mt-4">
              <div className="flex justify-center items-center mb-2">
                <Clock className="mr-2 w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Session Expires In:</span>
              </div>
              <motion.div 
                className={`text-center p-2 rounded-md border ${timeRemaining > 300 ? 'bg-success/10 border-success/30 text-success' : timeRemaining > 60 ? 'bg-accent/10 border-accent/30 text-accent-foreground' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <span className="text-lg font-bold">{formatTimeRemaining()}</span>
              </motion.div>
              <div className="p-3 mt-2 bg-accent/10 rounded-md border border-accent/30">
                <div className="flex items-start">
                  <AlertTriangle className="mr-2 w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <p className="font-mono text-sm text-accent-foreground">
                    <span className="font-semibold uppercase">Important:</span> You must complete this form before your session expires. If you close the browser or navigate away, you will need to request a new verification code from an admin.
                  </p>
                </div>
              </div>
            </div>
          )}
            </motion.div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 text-destructive bg-destructive/10 rounded border border-destructive/30">
                {error}
              </div>
            )}

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label htmlFor="firstName" className="flex gap-2 items-center">
                <LetterText className="w-4 h-4" />
                First Name
              </Label>
              <Input
                id="firstName"
                value={userData?.firstName || ""}
                onChange={(e) => handleUserDataChange("firstName", e.target.value)}
                required
              />
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Label htmlFor="lastName" className="flex gap-2 items-center">
                <IdCard className="w-4 h-4" />
                Last Name
              </Label>
              <Input
                id="lastName"
                value={userData?.lastName || ""}
                onChange={(e) => handleUserDataChange("lastName", e.target.value)}
                required
              />
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Label htmlFor="email" className="flex gap-2 items-center">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={userData?.email || ""}
                onChange={(e) => handleUserDataChange("email", e.target.value)}
                required
              />
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label htmlFor="accountType" className="flex gap-2 items-center">
                <UserCheck className="w-4 h-4" />
                Account Type
              </Label>
              <div className="p-3 bg-muted/50 rounded-md border">
                <span className="text-sm font-medium capitalize">
                  {userData?.accountType || "Not specified"}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Account type is set by your administrator and cannot be changed.
                </p>
              </div>
            </motion.div>

            {userData?.accountType === "doctor" && userData?.doctorSpecialty && userData.doctorSpecialty.length > 0 && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Label htmlFor="doctorSpecialty" className="flex gap-2 items-center">
                  <Shield className="w-4 h-4" />
                  Doctor Specialt{userData.doctorSpecialty.length > 1 ? 'ies' : 'y'}
                </Label>
                <div className="p-3 bg-muted/50 rounded-md border">
                  <div className="flex flex-wrap gap-2">
                    {userData.doctorSpecialty.map((specialty) => (
                      <span key={specialty} className="px-2 py-1 text-sm font-medium bg-primary/10 text-primary rounded">
                        {specialty}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Specialt{userData.doctorSpecialty.length > 1 ? 'ies are' : 'y is'} set by your administrator and cannot be changed.
                  </p>
                </div>
              </motion.div>
            )}

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label className="flex gap-2 items-center">
                <CalendarLucide className="w-4 h-4" />
                Date of Birth *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateOfBirth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 w-4 h-4" />
                    {dateOfBirth ? format(dateOfBirth, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto">
                  <CalendarWithControls
                    mode="single"
                    selected={dateOfBirth}
                    onSelect={setDateOfBirth}
                    type="past"
                    backgroundColor="bg-card"
                  />
                </PopoverContent>
              </Popover>
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Label htmlFor="gender" className="flex gap-2 items-center">
                <Users className="w-4 h-4" />
                Gender *
              </Label>
              <RadioCard.Root
                value={userData?.gender || ""}
                onValueChange={(value) => handleUserDataChange("gender", value)}
                className="grid grid-cols-2 gap-3"
              >
                <RadioCard.Item value="Male" className="p-3">
                  <div className="text-sm font-medium">Male</div>
                </RadioCard.Item>
                <RadioCard.Item value="Female" className="p-3">
                  <div className="text-sm font-medium">Female</div>
                </RadioCard.Item>
              </RadioCard.Root>
            </motion.div>

            {/* Security Questions */}
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <h3 className="flex gap-2 items-center text-lg font-semibold">
                <Shield className="w-5 h-5" />
                Security Questions *
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="question1">Security Question 1</Label>
                <Select
                  value={userData?.question1 || ""}
                  onValueChange={(value) => handleUserDataChange("question1", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a security question" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredQuestions.question1.map((question) => (
                      <SelectItem key={question} value={question}>
                        {question}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {userData?.question1 && (
                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={userData?.answer1 || ""}
                    onChange={(e) => handleUserDataChange("answer1", e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="question2">Security Question 2</Label>
                <Select
                  value={userData?.question2 || ""}
                  onValueChange={(value) => handleUserDataChange("question2", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a security question" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredQuestions.question2.map((question) => (
                      <SelectItem key={question} value={question}>
                        {question}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {userData?.question2 && (
                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={userData?.answer2 || ""}
                    onChange={(e) => handleUserDataChange("answer2", e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="question3">Security Question 3</Label>
                <Select
                  value={userData?.question3 || ""}
                  onValueChange={(value) => handleUserDataChange("question3", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a security question" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredQuestions.question3.map((question) => (
                      <SelectItem key={question} value={question}>
                        {question}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {userData?.question3 && (
                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={userData?.answer3 || ""}
                    onChange={(e) => handleUserDataChange("answer3", e.target.value)}
                  />
                )}
              </div>
             </motion.div>

            {/* Medical License Upload for Doctors */}
            {userData?.accountType === 'doctor' && userData?.doctorSpecialty && userData.doctorSpecialty.length > 0 && (
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
              >
                <h3 className="flex gap-2 items-center text-lg font-semibold">
                  <Shield className="w-5 h-5" />
                  Medical Licenses *
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload your medical license{userData.doctorSpecialty.length > 1 ? 's' : ''} for {userData.doctorSpecialty.length > 1 ? 'each of your specialties' : 'your specialty'}.
                </p>
                
                {userData.doctorSpecialty.map((specialty) => (
                  <MedicalLicenseUploadField
                    key={specialty}
                    specialty={specialty}
                    existingLicense={getMedicalLicenseForSpecialty(specialty)}
                    onFileSelected={(file) => addMedicalLicense(specialty, file)}
                    onRemove={() => removeMedicalLicense(specialty)}
                  />
                ))}
              </motion.div>
            )}

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Label htmlFor="password" className="flex gap-2 items-center">
                <LockOpen className="w-4 h-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setPassword(newValue);
                    setPasswordsMatch(confirmPassword === newValue || confirmPassword === "");
                  }}
                  className="pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 text-muted-foreground transform -translate-y-1/2 hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Label htmlFor="confirmPassword" className="flex gap-2 items-center">
                <Lock className="w-4 h-4" />
                Confirm Password
              </Label>
              <div className="relative">
                <Tooltip
                  tooltipText="Passwords do not match"
                  showTooltip={!passwordsMatch && confirmPassword.length > 0}
                >
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setConfirmPassword(newValue);
                      setPasswordsMatch(newValue === password || newValue === "");
                    }}
                    className={`pr-10 ${!passwordsMatch && confirmPassword.length > 0 ? "border-destructive" : ""}`}
                    required
                    minLength={8}
                  />
                </Tooltip>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 text-muted-foreground transform -translate-y-1/2 hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <Button type="submit" className="w-full" disabled={submitting || uploadingLicenses}>
                {uploadingLicenses ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Uploading Licenses...
                  </>
                ) : submitting ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Confirming Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 w-4 h-4" />
                    Confirm Account
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
}

// Medical License Upload Field Component
interface MedicalLicenseUploadFieldProps {
  specialty: string;
  existingLicense?: File;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
}

const MedicalLicenseUploadField: React.FC<MedicalLicenseUploadFieldProps> = ({
  specialty,
  existingLicense,
  onFileSelected,
  onRemove,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"]
    },
    onDrop: (files) => {
      if (files.length > 0) {
        const file = files[0];
        
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
          alert('Please upload a PDF, PNG, or JPG file.');
          return;
        }

        // Validate file size (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          alert('File size too large. Maximum size is 10MB.');
          return;
        }

        onFileSelected(file);
      }
    },
    maxFiles: 1,
    noClick: false,
  });

  const rootProps = getRootProps() as HTMLAttributes<HTMLDivElement>;
  const { style: _rootStyle, ...safeRootProps } = rootProps as any;
  const inputProps = getInputProps() as InputHTMLAttributes<HTMLInputElement>;
  const { style: _inputStyle, ...safeInputProps } = inputProps as any;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
        <h4 className="font-medium text-sm">{specialty}</h4>
        {existingLicense && (
          <CheckCircle className="h-5 w-5 text-success" />
        )}
      </div>

      {existingLicense ? (
        <div className="p-4 bg-success/10">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {existingLicense.type === 'application/pdf' ? (
                <Shield className="h-10 w-10 text-success" />
              ) : (
                <div className="h-10 w-10">
                  <Image
                    src={URL.createObjectURL(existingLicense)}
                    alt={`${specialty} License`}
                    width={40}
                    height={40}
                    className="object-cover rounded"
                  />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-success">
                License Selected
              </p>
              <p className="text-xs text-success/80 mt-1">
                {existingLicense.type === 'application/pdf' ? 'PDF Document' : 'Image File'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {existingLicense.name}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive/80"
              title="Remove license file"
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          {...safeRootProps}
          className={cn(
            "p-6 border-2 border-dashed transition-all duration-200 cursor-pointer",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          <input {...safeInputProps} />

          {isDragActive ? (
            <div className="text-center text-primary">
              <Shield className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Drop your {specialty} license here</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="rounded-full bg-muted p-3 mb-3 mx-auto w-fit">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Select {specialty} License
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, PNG, JPG up to 10MB
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
