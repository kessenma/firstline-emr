// apps/web/components/adminDashboard/sections/statistics/SpecialtySpreadComparisonViewWrapper.tsx
import React from 'react';
import { SpecialtyDataProvider } from '@/components/adminDashboard/context/SpecialtyDataContext';
import SpecialtySpreadComparisonView from './views/SpecialtySpreadComparisonView';
import SpecialtyComparisonChart from "./views/SpecialtySpreadComparisonView";

const SpecialtySpreadComparisonViewWrapper: React.FC = () => {
    return (
        <SpecialtyDataProvider>
            <SpecialtyComparisonChart />
        </SpecialtyDataProvider>
    );
};

export default SpecialtySpreadComparisonViewWrapper;