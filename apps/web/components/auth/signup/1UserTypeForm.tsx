import React, { useEffect } from 'react';
import { useSignupContext } from './container/SignupContext';
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import { getRoleCssVar } from "@fajr/shared/theme";
import { RoleIcon } from "@/components/ui/RoleIcon";

interface UserTypeFormProps {
    onExpand: () => void;
}

const RotatingCircle: React.FC<{
    delay: number;
    radius: number;
    size: number;
    color: string;
    index: number;
    isSelected: boolean;
}> = ({ delay, radius, size, color, index, isSelected }) => {
    return (
        <motion.div
            className="absolute"
            style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
            }}
            animate={{
                x: [0, Math.cos(0) * radius, Math.cos(Math.PI / 2) * radius, Math.cos(Math.PI) * radius, Math.cos(3 * Math.PI / 2) * radius, 0],
                y: [0, Math.sin(0) * radius, Math.sin(Math.PI / 2) * radius, Math.sin(Math.PI) * radius, Math.sin(3 * Math.PI / 2) * radius, 0],
            }}
            transition={{
                duration: 6,
                delay: delay,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        >
            <div className="relative">
                {isSelected && (
                    <div
                        className="absolute rounded-full border-2"
                        style={{
                            width: size + 24,
                            height: size + 24,
                            backgroundColor: 'transparent',
                            borderColor: color,
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 2,
                        }}
                    />
                )}
                {isSelected && (
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            width: size,
                            height: size,
                            backgroundColor: 'transparent',
                            boxShadow: `0 0 50px ${color}`,
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 1,
                        }}
                        animate={{
                            opacity: [0.3, 0.7, 0.3],
                        }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                )}
                <div
                    className="absolute rounded-full"
                    style={{
                        width: size,
                        height: size,
                        backgroundColor: color,
                        boxShadow: isSelected ? `0 0 20px ${color}` : `0 0 10px ${color}`,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 3,
                    }}
                />
            </div>
        </motion.div>
    );
};

const UserTypeForm: React.FC<UserTypeFormProps> = ({ onExpand }) => {
    const { setAccountType, setFormData, accountType, updateAnsweredQuestions } = useSignupContext();

    // We can rely on the handleSelectAccountType to update the answered questions directly
    // instead of using a useEffect which might race with context updates
    useEffect(() => {
        // Only run this on mount to initialize if needed, or if accountType changes externally
        // But be careful not to trigger if we just set it ourselves
    }, []); 

    const handleSelectAccountType = (selectedType: 'Doctor' | 'Triage') => {
        if (selectedType !== accountType) {
            setAccountType(selectedType);
            setFormData((prevData) => ({ ...prevData, accountType: selectedType }));
            updateAnsweredQuestions(0, 1); // Update progress immediately
            onExpand(); // Trigger the expanded state
        }
    };

    return (
        <div className="flex flex-col justify-center items-center h-full p-6">
            {/* Framer Motion Rotating Circles Animation */}
            <div className="relative w-full h-48 mb-6 overflow-visible flex items-center justify-center">
                <RotatingCircle
                    delay={0}
                    radius={40}
                    size={20}
                    color={"var(--color-doctor-primary)"}
                    index={10}
                    isSelected={accountType === 'Doctor'}
                />
                <RotatingCircle
                    delay={-1}
                    radius={35}
                    size={20}
                    color={"var(--color-triage-primary)"}
                    index={11}
                    isSelected={accountType === 'Triage'}
                />
            </div>
            {/* User Type Selection Cards */}
            <div className="relative z-10 flex justify-center items-center space-x-6 w-full">
                {(['Doctor', 'Triage'] as const).map((type) => {
                    const isSelected = accountType === type;
                    const roleColor = getRoleCssVar(type);

                    return (
                        <button
                            key={type}
                            onClick={() => handleSelectAccountType(type)}
                            className={`grow p-3 h-16 min-h-[4rem] border-2 rounded transition-colors ${
                                isSelected
                                    ? 'shadow-2xl text-primary-foreground'
                                    : 'border-border hover:border-primary text-foreground bg-background'
                            }`}
                            style={
                                isSelected
                                    ? { backgroundColor: roleColor, borderColor: roleColor }
                                    : undefined
                            }
                        >
                            <div className="flex gap-2 justify-center items-center font-medium">
                                <RoleIcon
                                    accountType={type}
                                    colored={!isSelected}
                                    className="w-5 h-5 shrink-0"
                                />
                                {type}
                            </div>
                        </button>
                    );
                })}
            </div>

            <AnimatePresence>
                {accountType === 'Doctor' && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        className="relative z-10 mt-6 flex items-center gap-3 rounded-lg border px-4 py-3"
                        style={{
                            backgroundColor: 'color-mix(in srgb, var(--color-doctor-primary) 8%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--color-doctor-primary) 25%, transparent)',
                        }}
                    >
                        <FileText className="h-5 w-5 shrink-0" style={{ color: 'var(--color-doctor-primary)' }} />
                        <p className="text-sm text-muted-foreground">
                            Please have your medical license ready — you'll need to upload it during signup.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserTypeForm;
