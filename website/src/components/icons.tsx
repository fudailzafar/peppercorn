type IconProps = React.HTMLAttributes<SVGElement>;

export const Icons = {
  /** Peppercorn's symbol: a "p" whose bowl holds a single grain. */
  logo: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="24"
      viewBox="27 15 52 74"
      fill="none"
      {...props}
    >
      <path
        d="M33 41V83"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle cx="53" cy="41" r="20" stroke="currentColor" strokeWidth="12" />
      <circle cx="53" cy="41" r="7.5" fill="#F29900" />
    </svg>
  ),
};
