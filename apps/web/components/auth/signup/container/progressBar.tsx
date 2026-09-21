import React from 'react';
import { motion } from 'framer-motion';
import { useSignupContext } from './SignupContext';

interface ProgressBarProps {
    progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
    const { accountType } = useSignupContext();

    const rolePrimary = accountType === 'Doctor'
        ? '#4F8EC9'
        : accountType === 'Triage'
            ? '#359D98'
            : '#ff5722';

    const roleSecondary = accountType === 'Doctor'
        ? '#A7CBED'
        : accountType === 'Triage'
            ? '#9CDBD9'
            : '#ffc8a8';

    return (
        <div className="w-full bg-muted rounded-full h-2.5 mb-4 relative overflow-hidden">
            <div
                className="h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{
                    width: `${progress}%`,
                    background: progress === 100 ? rolePrimary : `linear-gradient(90deg, ${rolePrimary}, ${roleSecondary})`,
                    position: 'relative',
                }}
            >
                {progress < 100 && (
                    <motion.div
                        className="absolute top-0 left-0 h-full bg-linear-to-r from-white/0 via-white/20 to-white/0 rounded-full"
                        style={{
                            width: '100%',
                            x: -100,
                        }}
                        animate={{
                            x: 100,
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default ProgressBar;
