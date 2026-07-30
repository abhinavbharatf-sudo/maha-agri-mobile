import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
};

export const AshokaEmblemIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <path d="M12 3.5v3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M12 17.5v3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M3.5 12h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M17.5 12h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M6.2 6.2l2.1 2.1" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M15.7 15.7l2.1 2.1" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M17.8 6.2l-2.1 2.1" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M8.3 15.7l-2.1 2.1" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M12 7.5l1.8 3-1.8 1-1.8-1 1.8-3z" fill="currentColor" opacity="0.85" />
    <path d="M16.5 12l-3 1.8-.2 1.4 1.4.2 1.8-3z" fill="currentColor" opacity="0.6" />
    <path d="M7.5 12l3 1.8.2 1.4-1.4.2-1.8-3z" fill="currentColor" opacity="0.6" />
  </svg>
);

export const NgoDarpanIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M12 2.5L21 7v6c0 4.5-3.5 7.5-9 8.5-5.5-1-9-4-9-8.5V7l9-4.5z" stroke="currentColor" strokeWidth="1.2" />
    <path d="M12 7l5 2.5v3.5c0 2.5-2 4.2-5 4.8-3-.6-5-2.3-5-4.8V9.5L12 7z" stroke="currentColor" strokeWidth="0.9" opacity="0.7" />
    <circle cx="12" cy="11.5" r="1.6" fill="currentColor" />
    <path d="M9.5 14.5c.3-1 .9-1.5 2.5-1.5s2.2.5 2.5 1.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
  </svg>
);

export const UdyamMsmeIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M3 21h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5 21V9l7-5 7 5v12" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    <rect x="9.5" y="13" width="5" height="8" stroke="currentColor" strokeWidth="0.9" />
    <path d="M7.5 11h2M14.5 11h2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    <circle cx="12" cy="8" r="1" fill="currentColor" />
  </svg>
);

export const TaxSealIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M12 2.5c-1.4 0-2.5.6-2.5 1.5 0 .6.4 1 1 1.3v1.2H8.5C7 6.5 6 7.8 6 9.5v.5l-1.8.8v2.4L6 14v.5c0 1.7 1 3 2.5 3h2v1.2c-.6.3-1 .7-1 1.3 0 .9 1.1 1.5 2.5 1.5s2.5-.6 2.5-1.5c0-.6-.4-1-1-1.3V17.5h2c1.5 0 2.5-1.3 2.5-3V14l1.8-1.8V9.8L17 9v-.5c0-1.7-1-3-2.5-3H13.5V5.3c.6-.3 1-.7 1-1.3 0-.9-1.1-1.5-2.5-1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
    <path d="M10.8 12.2l.8.8 1.6-1.6" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CsrMcaIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M12 2.5L21 7v6c0 4.5-3.5 7.5-9 8.5-5.5-1-9-4-9-8.5V7l9-4.5z" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="12" cy="11" r="3.2" stroke="currentColor" strokeWidth="0.9" />
    <path d="M10.6 11h2.8" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M12 9.6v2.8" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    <path d="M12 16.5v2.3" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
  </svg>
);

export const IsoIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M12 2.5L21 7v6c0 4.5-3.5 7.5-9 8.5-5.5-1-9-4-9-8.5V7l9-4.5z" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="12" cy="11" r="3.5" stroke="currentColor" strokeWidth="0.9" />
    <path d="M10.3 11l1.2 1.2 2.2-2.2" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IafIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M12 2.5L21 7v6c0 4.5-3.5 7.5-9 8.5-5.5-1-9-4-9-8.5V7l9-4.5z" stroke="currentColor" strokeWidth="1.1" />
    <path d="M12 7l1.5 3 3.5.3-2.5 2.3.8 3.4-3.3-1.8-3.3 1.8.8-3.4-2.5-2.3 3.5-.3L12 7z" fill="currentColor" opacity="0.7" />
  </svg>
);
