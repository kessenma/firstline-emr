import React from 'react';
import AdminPageClient from './AdminPageClient';

export const dynamic = 'force-dynamic';

const AdminPage = () => {
    const analyticsPassphrase = process.env.ANALYTICS_PASSPHRASE;

    return (
        <AdminPageClient analyticsPassphrase={analyticsPassphrase} />
    );
};

export default AdminPage;
