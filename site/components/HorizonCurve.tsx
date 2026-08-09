/** Organic "ground line" divider between sections — the design's signature. */
export function HorizonCurve({
  fill,
  flip = false,
  className = "",
}: {
  fill: string;
  flip?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1200 72"
      preserveAspectRatio="none"
      aria-hidden
      className={`block h-14 w-full md:h-[72px] ${className}`}
    >
      <path
        fill={fill}
        d={
          flip
            ? "M0,0 L1200,0 L1200,16 C880,74 320,2 0,54 Z"
            : "M0,72 L0,44 C320,-16 880,86 1200,20 L1200,72 Z"
        }
      />
    </svg>
  );
}
