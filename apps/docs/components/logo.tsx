import type { SVGProps } from 'react';

/** Firstline mark — same diagonal stroke as apps/web/public/assets/images/logo.svg. */
export function FirstlineLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1024 1024" role="img" aria-label="Firstline" {...props}>
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
}
