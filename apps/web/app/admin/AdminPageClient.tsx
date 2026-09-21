'use client';

import React, { useState, useEffect } from 'react';
import AdminDashboardView from '@/components/adminDashboard/AdminDashboardView';
import StackedLoader from '@/components/ui/StackedLoader';

interface AdminPageClientProps {
    analyticsPassphrase?: string;
}

const AdminPageClient = ({ analyticsPassphrase }: AdminPageClientProps) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate a loading delay
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="bg-background min-h-screen">
            {/* Loader */}
            <div
                className={`
                    fixed inset-0 flex flex-col items-center justify-center
                    transition-opacity duration-1000 ease-in-out
                    ${isLoading ? 'opacity-100 z-50' : 'opacity-0 z-0 pointer-events-none'}
                `}
            >
                <StackedLoader />
            </div>

            {/* Main Content */}
            <div
                className={`
                    transition-opacity duration-1000 ease-in-out
                    ${isLoading ? 'opacity-0' : 'opacity-100'}
                `}
            >
                <div className="mt-12">
                    <AdminDashboardView analyticsPassphrase={analyticsPassphrase} />
                </div>
            </div>
        </div>
    );
};

export default AdminPageClient;
