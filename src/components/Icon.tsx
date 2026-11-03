import type { SVGProps } from 'react';

const PATHS = {
  play: <path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.4-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.7" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  prev: (
    <>
      <path d="M18 6.2v11.6a.7.7 0 0 1-1.1.6L9.2 13a.9.9 0 0 1 0-1.5l7.7-5.9a.7.7 0 0 1 1.1.6Z" fill="currentColor" stroke="none" />
      <path d="M6 5.5v13" />
    </>
  ),
  next: (
    <>
      <path d="M6 6.2v11.6a.7.7 0 0 0 1.1.6l7.7-5.4a.9.9 0 0 0 0-1.5L7.1 5.6A.7.7 0 0 0 6 6.2Z" fill="currentColor" stroke="none" />
      <path d="M18 5.5v13" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3 7h3.2c1.5 0 2.8.8 3.6 2l3.4 5.4c.8 1.2 2.1 2 3.6 2H21" />
      <path d="M3 17h3.2c1.5 0 2.8-.8 3.6-2M13.2 9.6C14 8.4 15.3 7 17 7h4" />
      <path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 14.5l2.5 2.5-2.5 2.5" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 11V9.5A2.5 2.5 0 0 1 6.5 7H20M20 7l-3-3M20 7l-3 3" />
      <path d="M20 13v1.5a2.5 2.5 0 0 1-2.5 2.5H4M4 17l3-3M4 17l3 3" />
    </>
  ),
  repeatOne: (
    <>
      <path d="M4 11V9.5A2.5 2.5 0 0 1 6.5 7H20M20 7l-3-3M20 7l-3 3" />
      <path d="M20 13v1.5a2.5 2.5 0 0 1-2.5 2.5H4M4 17l3-3M4 17l3 3" />
      <path d="M11 10.5l1.2-.8v5" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6.5l10-2V16" />
      <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
      <circle cx="16.5" cy="16" r="2.5" fill="currentColor" />
    </>
  ),
  albums: (
    <>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />,
  heartFill: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" fill="currentColor" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
      <path d="m16 9.5 4 5M20 9.5l-4 5" />
    </>
  ),
  back5: (
    <>
      <path d="M5 8.5a8 8 0 1 1-1.2 4.5" />
      <path d="M5 4v4.5h4.5" />
      <text x="12" y="15.2" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">5</text>
    </>
  ),
  forward5: (
    <>
      <path d="M19 8.5A8 8 0 1 0 20.200 13" />
      <path d="M19 4v4.5h-4.5" />
      <text x="12" y="15.2" fontSize="7.5" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">5</text>
    </>
  ),
  chevronDown: <path d="m6 9.500 6 6 6-6" />,
  chevronLeft: <path d="m14.500 6-6 6 6 6" />,
  folder: <path d="M3.500 7.500a2 2 0 0 1 2-2h4l2 2.500h7a2 2 0 0 1 2 2v7.500a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.500Z" />,
  window: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.500" />
      <rect x="11.500" y="11.500" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  video: (
    <>
      <rect x="3.500" y="6" width="17" height="12" rx="2.500" />
      <path d="m10.500 9.500 4 2.500-4 2.500v-5Z" fill="currentColor" />
    </>
  ),
  trash: <path d="M5 7h14M10 7V5h4v2m-7 0 .8 12h8.400L17 7M10.500 10.500v5.500M13.500 10.500v5.500" />
} as const;

export type IconName = keyof typeof PATHS;

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 20, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
