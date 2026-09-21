// apps/web/public/assets/icons/patient-dashboard/Priority.tsx
import React from 'react';

export const Priority: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor" // <-- Use currentColor for color inheritance
        {...props} // <-- Spread props to allow className, color, etc.
    >
            <path d="m3 8 4-4 4 4"/>
            <path d="M7 4v16"/>
            <path d="M11 12h4"/>
            <path d="M11 16h7"/>
            <path d="M11 20h10"/>
    </svg>
);

