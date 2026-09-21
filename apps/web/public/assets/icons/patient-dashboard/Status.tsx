// apps/web/public/assets/icons/patient-dashboard/Status.tsx
import React from 'react';

export const Status: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor" // <-- Use currentColor for color inheritance
        {...props} // <-- Spread props to allow className, color, etc.
    >
        <path d="m8 6 4-4 4 4" />
        <path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" />
        <path d="m20 22-5-5" />
    </svg>
);