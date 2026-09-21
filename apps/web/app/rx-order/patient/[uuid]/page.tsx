// app/rx-order/patient/[id]/page.tsx
'use client';

import React, { useState, useEffect, use } from 'react';
import PatientRxView from '@/components/rxQrCode/PatientRxView';
import { motion } from 'framer-motion';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { BarLoader } from 'react-spinners';

export default function RXOrderPage(props: { params: Promise<{ uuid: string }> }) {
    const params = use(props.params);
    const { uuid } = params;
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    if (!uuid) {
        return <p className="text-center text-destructive">Invalid or missing UUID</p>;
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-muted/75 flex items-center justify-center">
                <BarLoader color={"hsl(var(--primary))"} />
            </div>
        );
    }

    return (
        <AuroraBackground
            gradientFrom="primary"
            gradientTo="background"
            auroraStyle="primary"
        >
            <motion.div
                initial={{ opacity: 0.0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                    delay: 0.3,
                    duration: 0.8,
                    ease: 'easeInOut',
                }}
                className="relative flex flex-col items-center justify-center gap-4 px-4 py-8 z-10 min-h-screen"
            >
                <PatientRxView uuid={uuid} />
            </motion.div>
        </AuroraBackground>
    );
}
