// apps/web/public/assets/icons/patient-dashboard/Messages.tsx
import React from 'react';

export const Messages: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor" // <-- Use currentColor for color inheritance
        {...props} // <-- Spread props to allow className, color, etc.
    >
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
    </svg>
);



