import type { SVGProps } from 'react';

/** Original, lightweight illustration for LAYA's public entry screens. */
const JusticeIllustration = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 720 560" role="img" aria-labelledby="laya-illustration-title" fill="none" {...props}>
    <title id="laya-illustration-title">A community member and a lawyer connected through legal guidance</title>
    <defs>
      <linearGradient id="laya-sky" x1="360" y1="30" x2="360" y2="500" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F1F8FF" />
        <stop offset="1" stopColor="#E5F4F2" />
      </linearGradient>
      <linearGradient id="laya-arch" x1="172" y1="102" x2="548" y2="438" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DCEBFF" />
        <stop offset="1" stopColor="#E5F5F0" />
      </linearGradient>
      <filter id="laya-shadow" x="-20%" y="-20%" width="145%" height="155%" colorInterpolationFilters="sRGB" filterUnits="objectBoundingBox">
        <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
        <feOffset dy="8" />
        <feComponentTransfer><feFuncA type="linear" slope="0.12" /></feComponentTransfer>
        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    <ellipse cx="360" cy="282" rx="310" ry="238" fill="url(#laya-sky)" />
    <path d="M174 421V254c0-103 83-186 186-186s186 83 186 186v167" stroke="url(#laya-arch)" strokeWidth="34" strokeLinecap="round" />
    <path d="M143 421h434" stroke="#CFDFE9" strokeWidth="3" strokeLinecap="round" />
    <path d="M184 446h353" stroke="#E3ECF0" strokeWidth="15" strokeLinecap="round" />

    {/* Community member */}
    <g filter="url(#laya-shadow)">
      <path d="M104 405c9-68 47-106 105-106s96 38 105 106v31H104v-31Z" fill="#2563EB" />
      <path d="M169 303c7 22 22 35 40 35s33-13 40-35l-5-27h-70l-5 27Z" fill="#E8AD82" />
      <ellipse cx="209" cy="235" rx="57" ry="67" fill="#F0BE94" />
      <path d="M153 228c-7-57 20-91 62-91 42 0 61 29 57 76-16-5-28-17-36-33-14 21-41 36-83 48Z" fill="#263B59" />
      <path d="M166 253c5 4 10 4 15 0m55 0c5 4 10 4 15 0" stroke="#59423A" strokeWidth="4" strokeLinecap="round" />
      <path d="M197 283c8 6 17 6 25 0" stroke="#9A594A" strokeWidth="4" strokeLinecap="round" />
      <path d="M174 376c13-10 24-15 35-15s22 5 35 15" stroke="#DCEBFF" strokeWidth="4" strokeLinecap="round" />
    </g>

    {/* Volunteer lawyer */}
    <g filter="url(#laya-shadow)">
      <path d="M408 405c9-68 47-106 105-106s96 38 105 106v31H408v-31Z" fill="#123452" />
      <path d="M474 303c7 22 22 35 40 35s33-13 40-35l-5-27h-70l-5 27Z" fill="#A86646" />
      <ellipse cx="514" cy="235" rx="57" ry="67" fill="#B87653" />
      <path d="M458 220c3-52 27-79 62-79 34 0 55 22 54 65-17-1-31-8-42-21-15 16-39 28-74 35Z" fill="#202C3B" />
      <path d="M471 253c5 4 10 4 15 0m55 0c5 4 10 4 15 0" stroke="#49352E" strokeWidth="4" strokeLinecap="round" />
      <path d="M501 281c8 5 17 5 25 0" stroke="#764632" strokeWidth="4" strokeLinecap="round" />
      <path d="m514 344 19 35-19 30-19-30 19-35Z" fill="#E9B64B" />
    </g>

    {/* Shared document, the bridge between the two people */}
    <g filter="url(#laya-shadow)">
      <rect x="275" y="320" width="170" height="126" rx="18" fill="white" />
      <rect x="298" y="342" width="65" height="7" rx="3.5" fill="#2563EB" />
      <rect x="298" y="361" width="122" height="5" rx="2.5" fill="#C7D5E4" />
      <rect x="298" y="376" width="112" height="5" rx="2.5" fill="#D9E3ED" />
      <rect x="298" y="391" width="82" height="5" rx="2.5" fill="#D9E3ED" />
      <circle cx="403" cy="417" r="16" fill="#E8F8EF" />
      <path d="m396 417 5 5 10-11" stroke="#16865A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* Original LAYA scales and bird mark, drawn as a small emblem */}
    <g transform="translate(322 112)">
      <circle cx="38" cy="38" r="38" fill="white" fillOpacity=".95" />
      <path d="M38 18v39m-17-27h34m-30 0-8 16h16l-8-16Zm30 0-8 16h16l-8-16Z" stroke="#123452" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 19c-9 4-11 12-6 17 5-5 7-10 6-17Zm0 10c8-1 13 3 13 9-7 1-12-2-13-9Z" fill="#E9B64B" />
      <path d="M30 48c3 4 9 5 14 2" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
    </g>

    {/* Small floating service cues */}
    <g filter="url(#laya-shadow)">
      <rect x="74" y="116" width="112" height="58" rx="17" fill="white" />
      <circle cx="101" cy="145" r="15" fill="#E9F8F0" />
      <path d="M95 145h12m-6-6v12" stroke="#16865A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M124 140h43m-43 10h31" stroke="#A7B7C9" strokeWidth="4" strokeLinecap="round" />
    </g>
    <g filter="url(#laya-shadow)">
      <rect x="535" y="104" width="112" height="58" rx="17" fill="white" />
      <circle cx="562" cy="133" r="15" fill="#FFF5DB" />
      <path d="m556 133 4 4 8-9" stroke="#B27813" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M585 128h43m-43 10h31" stroke="#A7B7C9" strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>
);

export default JusticeIllustration;
