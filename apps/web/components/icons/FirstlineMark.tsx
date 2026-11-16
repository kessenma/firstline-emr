// apps/web/components/icons/FirstlineMark.tsx
//
// The Firstline mark. Geometry is generated from scripts/brand/generate_brand_assets.py
// and must match brand/firstline-mark.svg — if you change one, re-run the generator
// rather than editing the numbers here by hand.
//
// This exists as a component rather than an <img src="/assets/images/logo.svg">
// because an <img> cannot inherit theme colour: the mark is black, so on a dark
// surface it would disappear. Taking the colour from `currentColor` lets the call
// site set it with a text colour class.

import React from 'react';

export const FirstlineMark: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1024 1024"
        fill="none"
        role="img"
        aria-label="Firstline"
        {...props}
    >
        <line
            x1="225.28"
            y1="798.72"
            x2="798.72"
            y2="225.28"
            stroke="currentColor"
            strokeWidth="143.36"
            strokeLinecap="butt"
        />
    </svg>
);

export default FirstlineMark;
